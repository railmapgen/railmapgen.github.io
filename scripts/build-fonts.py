#!/usr/bin/env python3
"""Build and verify the shared RMP fonts without touching the legacy MTR fonts."""

from __future__ import annotations

import argparse
from collections import defaultdict
from hashlib import sha256
from importlib.metadata import version
from io import BytesIO
import json
import logging
from pathlib import Path
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.unicodedata import script


ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / "public" / "fonts"
SOURCES_PATH = ROOT / "scripts" / "font-sources.json"
OUTPUTS_PATH = ROOT / "scripts" / "font-outputs.json"
CONFIG_PATH = FONT_DIR / "config.json"
VERSIONS = {"fonttools": "4.61.1", "Brotli": "1.2.0"}


def json_text(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, indent=4) + "\n"


def require_dependencies() -> None:
    for dependency, required in VERSIONS.items():
        actual = version(dependency)
        if actual != required:
            raise ValueError(
                f"{dependency} {required} is required, found {actual}. "
                "Install scripts/requirements-fonts.txt in a virtual environment."
            )


def unicode_cmap(font: TTFont) -> dict[int, str]:
    result = {}
    for table in font["cmap"].tables:
        if table.isUnicode() and table.format != 14:
            for codepoint, glyph in table.cmap.items():
                if codepoint in result and result[codepoint] != glyph:
                    raise ValueError(f"Conflicting Unicode cmap mapping for U+{codepoint:04X}")
                result[codepoint] = glyph
    return result


def variation_sequences(font: TTFont) -> dict[tuple[int, int], str | None]:
    return {
        (base, selector): glyph
        for table in font["cmap"].tables
        if table.format == 14
        for selector, pairs in table.uvsDict.items()
        for base, glyph in pairs
    }


def partition(codepoints: set[int], split: bool) -> list[tuple[str, set[int]]]:
    if not split:
        return [("", codepoints)]

    groups: dict[str, set[int]] = defaultdict(set)
    for codepoint in sorted(codepoints):
        unicode_script = script(codepoint)
        if unicode_script == "Hang":
            key = "hangul"
        elif unicode_script != "Hani":
            # Keep letters, combining marks, kana and punctuation together.
            key = "core"
        elif 0x4E00 <= codepoint <= 0x4FFF:
            key = "4E"
        elif 0x5000 <= codepoint <= 0x9FFF:
            key = f"{(codepoint // 0x800) * 8:02X}"
        else:
            # Also retain radicals, compatibility and supplementary ideographs.
            key = f"{(codepoint // 0x800) * 0x800:04X}"
        groups[key].add(codepoint)

    order = lambda item: (item[0] != "core", item[0] == "hangul", min(item[1]))
    return sorted(groups.items(), key=order)


def unicode_range(codepoints: set[int]) -> str:
    ranges = []
    start = previous = None
    for codepoint in sorted(codepoints):
        if previous is not None and codepoint == previous + 1:
            previous = codepoint
            continue
        if start is not None:
            ranges.append((start, previous))
        start = previous = codepoint
    if start is not None:
        ranges.append((start, previous))
    return ",".join(
        f"U+{first:04X}" if first == last else f"U+{first:04X}-{last:04X}"
        for first, last in ranges
    )


def encode_font(path: Path, codepoints: set[int], split: bool) -> bytes:
    font = TTFont(path, recalcTimestamp=False)
    if split:
        selectors = {
            selector
            for base, selector in variation_sequences(font)
            if base in codepoints
        }
        options = subset.Options(
            layout_features=["*"],
            layout_scripts=["*"],
            name_IDs=["*"],
            name_languages=["*"],
            name_legacy=True,
            glyph_names=True,
            # Mirrored glyphs stay in the core. Do not expand a shard's cmap.
            bidi_closure=False,
        )
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=codepoints | selectors)
        subsetter.subset(font)
    font.flavor = "woff2"
    output = BytesIO()
    font.save(output, reorderTables=True)
    font.close()
    return output.getvalue()


def verify_font(
    content: bytes,
    expected: set[int],
    original: TTFont,
    expected_uvs: dict[tuple[int, int], str | None],
) -> None:
    if content[:4] != b"wOF2":
        raise ValueError("Generated resource is not a WOFF2 font")
    generated = TTFont(BytesIO(content), recalcTimestamp=False)
    actual_cmap = unicode_cmap(generated)
    if set(actual_cmap) != expected:
        raise ValueError("Generated cmap differs from its assigned Unicode range")
    if variation_sequences(generated) != expected_uvs:
        raise ValueError("Generated variation sequences differ from the original")

    original_cmap = unicode_cmap(original)
    for codepoint, glyph in actual_cmap.items():
        original_glyph = original_cmap[codepoint]
        if generated["hmtx"][glyph] != original["hmtx"][original_glyph]:
            raise ValueError(f"Changed horizontal metrics for U+{codepoint:04X}")
        if "vmtx" in original:
            if generated["vmtx"][glyph] != original["vmtx"][original_glyph]:
                raise ValueError(f"Changed vertical metrics for U+{codepoint:04X}")
    for table in ("head", "hhea", "vhea", "OS/2"):
        if table in original and table not in generated:
            raise ValueError(f"Missing required metric table {table}")
    generated.close()


def process(check: bool, rebuild_check: bool) -> None:
    sources = json.loads(SOURCES_PATH.read_text(encoding="utf-8"))
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    previous_outputs = json.loads(OUTPUTS_PATH.read_text(encoding="utf-8")) if OUTPUTS_PATH.exists() else {}
    outputs = {"dependencies": VERSIONS, "families": {}}
    expected_config = {}
    total_source = total_generated = 0

    for family, metadata in sources.items():
        source_path = FONT_DIR / metadata["file"]
        source_bytes = source_path.read_bytes()
        source_hash = sha256(source_bytes).hexdigest()
        if source_hash != metadata["sha256"]:
            raise ValueError(f"Source hash mismatch: {source_path.name}")
        if not (FONT_DIR / metadata["license"]).is_file():
            raise ValueError(f"Missing font license: {metadata['license']}")
        original = TTFont(BytesIO(source_bytes), recalcTimestamp=False)
        original_cmap = unicode_cmap(original)
        original_uvs = variation_sequences(original)
        groups = partition(set(original_cmap), metadata["split"])
        family_outputs = []
        faces = []
        all_codepoints: set[int] = set()
        all_uvs = {}
        family_size = 0
        print(f"{'Checking' if check else 'Building'} {family}: {len(groups)} face(s)", flush=True)

        for suffix, codepoints in groups:
            stem = Path(metadata["file"]).stem
            name = f"{stem}{'.' + suffix if suffix else ''}.woff2"
            path = FONT_DIR / name
            if all_codepoints & codepoints:
                raise ValueError(f"Overlapping Unicode ranges in {family}")
            all_codepoints.update(codepoints)
            expected_uvs = {
                pair: glyph for pair, glyph in original_uvs.items() if pair[0] in codepoints
            }
            if check:
                content = path.read_bytes()
                if rebuild_check and encode_font(source_path, codepoints, metadata["split"]) != content:
                    raise ValueError(f"Non-reproducible or outdated generated font: {name}")
            else:
                content = encode_font(source_path, codepoints, metadata["split"])
            verify_font(content, codepoints, original, expected_uvs)
            if not check:
                path.write_bytes(content)
            all_uvs.update(expected_uvs)
            family_size += len(content)
            family_outputs.append({"file": name, "sha256": sha256(content).hexdigest()})
            # Selectors are kept inside cmap format 14, not repeated in every
            # unicodeRange, where they would trigger unrelated shard downloads.
            faces.append(
                {
                    "source": f"url('/fonts/{name}')",
                    "descriptors": {"display": "swap", "unicodeRange": unicode_range(codepoints)},
                }
            )

        if all_codepoints != set(original_cmap) or all_uvs != original_uvs:
            raise ValueError(f"Incomplete Unicode coverage for {family}")
        expected_config[family] = {
            "displayName": metadata["displayName"],
            "url": metadata["url"],
            "configs": [faces],
        }
        outputs["families"][family] = {
            "sourceSha256": source_hash,
            "codepoints": len(original_cmap),
            "variationSequences": len(original_uvs),
            "files": family_outputs,
        }
        expected_names = {entry["file"] for entry in family_outputs}
        stale_names = {p.name for p in FONT_DIR.glob(f"{Path(metadata['file']).stem}*.woff2")} - expected_names
        if stale_names:
            raise ValueError(f"Stale generated resources: {', '.join(sorted(stale_names))}")
        print(f"  {len(source_bytes):,} source bytes -> {family_size:,} WOFF2 bytes; complete cmap/UVS", flush=True)
        total_source += len(source_bytes)
        total_generated += family_size
        original.close()

    if check:
        if any(config.get(family) != definition for family, definition in expected_config.items()):
            raise ValueError("Font config does not match the sources; run npm run fonts:build")
        if previous_outputs != outputs:
            raise ValueError("Generated font hashes do not match scripts/font-outputs.json")
    else:
        # Only these new families are managed here. Preserve all legacy entries.
        config.update(expected_config)
        CONFIG_PATH.write_text(json_text(config), encoding="utf-8")
        OUTPUTS_PATH.write_text(json_text(outputs), encoding="utf-8")
    print(f"Total: {total_source:,} source bytes -> {total_generated:,} WOFF2 bytes", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify generated assets without changing files")
    parser.add_argument("--rebuild-check", action="store_true", help="Also regenerate and compare every WOFF2 byte")
    args = parser.parse_args()
    if args.rebuild_check and not args.check:
        parser.error("--rebuild-check requires --check")
    logging.getLogger("fontTools.subset").setLevel(logging.ERROR)
    try:
        require_dependencies()
        process(args.check, args.rebuild_check)
    except Exception as error:
        sys.exit(f"Font generation failed: {error}")


if __name__ == "__main__":
    main()
