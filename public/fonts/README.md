# Shared web fonts

`config.json` is consumed by `@railmapgen/rmg-runtime` at `/fonts/config.json`.
The existing MTR families and resources remain unchanged. Noto Sans CJK SC,
Arimo and Taipei Sans TC Beta are copied from RMP 6.1.8; their exact source
hashes, upstream links and license filenames are recorded in
`scripts/font-sources.json`.

The original OTF/TTF files remain here as reproducible inputs and as fonts for
the desktop renderer. Native `fontdb` reads those files, not WOFF2. Web clients
register the WOFF2 faces in the config and download only matching Unicode
ranges. Registering a family must not call `load()` on every face.

## Regenerating

Use Python 3.10 or newer and the pinned encoder dependencies:

```sh
python3 -m venv .venv-fonts
.venv-fonts/bin/python -m pip install -r scripts/requirements-fonts.txt
PATH="$PWD/.venv-fonts/bin:$PATH" npm run fonts:build
PATH="$PWD/.venv-fonts/bin:$PATH" npm run fonts:check
```

For a full deterministic rebuild comparison without changing any files:

```sh
.venv-fonts/bin/python scripts/build-fonts.py --check --rebuild-check
```

Generation is separate from the normal website build; committed assets are
copied from `public/fonts` to `dist/fonts` by Vite. `fonts:check` validates the
input and output hashes, actual WOFF2 signatures, exact Unicode coverage,
variation sequences, horizontal/vertical metrics and manifest ranges.

## Partitioning

Arimo is a complete single WOFF2 face. Noto and Taipei use the same basic-Han
boundaries as the existing MTR fonts: U+4E00–4FFF, then 2,048-codepoint windows
through U+9FFF. Other Han characters, including supplementary-plane and
compatibility characters, use aligned 2,048-codepoint windows. Empty windows
are omitted. The remaining characters form a core face, with Hangul in a
separate face. Keeping letters, combining marks and kana together preserves
their shaping behavior.

Manifest ranges include only each face's assigned direct Unicode mappings.
Variation selectors are retained in the relevant font's format-14 cmap but
are not repeated across manifest ranges. OpenType shaping features, glyph
closure, hinting, names and license metadata are retained. No source glyph is
discarded simply because it lies outside the basic Han block.

The old MTR splitting shell script is kept for historical compatibility. Its
`.woff2` outputs contain WOFF1; the newly generated resources are actual
WOFF2. The new generator intentionally does not regenerate those old files.
