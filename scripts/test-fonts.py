"""Small regression checks for the font partition's compatibility boundaries."""

import importlib.util
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location("build_fonts", Path(__file__).with_name("build-fonts.py"))
fonts = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fonts)


class FontPartitionTests(unittest.TestCase):
    def test_basic_han_boundaries_match_existing_mtr_faces(self):
        codepoints = {0x4E00, 0x4FFF, 0x5000, 0x57FF, 0x5800, 0x5FFF, 0x9800, 0x9FFF}
        self.assertEqual(
            dict(fonts.partition(codepoints, True)),
            {
                "4E": {0x4E00, 0x4FFF},
                "50": {0x5000, 0x57FF},
                "58": {0x5800, 0x5FFF},
                "98": {0x9800, 0x9FFF},
            },
        )

    def test_combining_text_stays_together_and_supplementary_han_survives(self):
        core = {ord("A"), 0x0301, 0x304B, 0x3099, 0x3001, 0xFF08}
        han = {0x20000, 0x207FF, 0x20800, 0x2F800}
        hangul = {0x1100, 0x1161, 0xAC00}
        groups = dict(fonts.partition(core | han | hangul, True))
        self.assertEqual(groups["core"], core)
        self.assertEqual(groups["hangul"], hangul)
        self.assertEqual(groups["20000"], {0x20000, 0x207FF})
        self.assertEqual(groups["20800"], {0x20800})
        self.assertEqual(set().union(*groups.values()), core | han | hangul)
        self.assertEqual(sum(map(len, groups.values())), len(core | han | hangul))

    def test_ranges_keep_holes_and_full_supplementary_codepoints(self):
        self.assertEqual(
            fonts.unicode_range({0x41, 0x42, 0x44, 0x20000, 0x20001}),
            "U+0041-0042,U+0044,U+20000-20001",
        )

    def test_western_face_is_not_partitioned(self):
        codepoints = {0x20, 0x41, 0x0301, 0xFB01}
        self.assertEqual(fonts.partition(codepoints, False), [("", codepoints)])


if __name__ == "__main__":
    unittest.main()
