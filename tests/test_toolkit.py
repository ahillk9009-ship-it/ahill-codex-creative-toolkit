import json
from pathlib import Path
import subprocess
import sys
import tempfile
import tomllib
import unittest
import zipfile
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import toolkit


class ToolkitTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="ahill-toolkit-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)

    def test_install_is_portable_and_repeatable(self):
        target, skills = self.base / "도구 with spaces", self.base / "skills"
        first = toolkit.install(target, skills, "full")
        self.assertGreater(first["changed"], 10)
        second = toolkit.install(target, skills, "full")
        self.assertEqual(second["changed"], 0)
        text = (skills / "ahill-work-memory/SKILL.md").read_text(encoding="utf-8")
        self.assertIn(target.as_posix(), text)
        self.assertNotIn("{{TOOLKIT_ROOT}}", text)
        self.assertFalse((target / "private").exists())

    def test_dry_run_has_no_side_effects(self):
        target, skills = self.base / "target", self.base / "skills"
        self.assertTrue(toolkit.install(target, skills, "full", True)["dry_run"])
        self.assertFalse(target.exists())
        self.assertFalse(skills.exists())

    def test_user_skill_conflict_prevents_entire_install(self):
        skills = self.base / "skills"
        existing = skills / "ahill-work-memory/SKILL.md"
        toolkit.atomic_write(existing, "user's own skill")
        target = self.base / "target"
        with self.assertRaisesRegex(ValueError, "User-edited"):
            toolkit.install(target, skills, "core")
        self.assertFalse(target.exists())
        self.assertEqual(existing.read_text(), "user's own skill")

    def test_install_refuses_unmanaged_directory(self):
        target = self.base / "target"
        toolkit.atomic_write(target / "important.txt", "keep")
        with self.assertRaisesRegex(ValueError, "empty directory"):
            toolkit.install(target, self.base / "skills", "core")

    def test_reinstall_preserves_user_edits_and_previous_profiles(self):
        target, skills = self.base / "target", self.base / "skills"
        toolkit.install(target, skills, "adobe")
        result = toolkit.install(target, skills, "research")
        self.assertIn("ahill-adobe-editing", result["skills"])
        edited = skills / "ahill-work-memory/SKILL.md"
        toolkit.atomic_write(edited, "local edits")
        with self.assertRaisesRegex(ValueError, "User-edited"):
            toolkit.install(target, skills, "core")

    def test_toml_merge_preserves_bytes_and_backs_up(self):
        config = self.base / "config.toml"
        original = b'\xef\xbb\xbf# user comment\r\nmodel = "user-choice"\r\n[mcp_servers.existing]\r\ncommand = "keep"\r\n'
        config.write_bytes(original)
        entry = {"command": "node", "args": [str(self.base / 'space "quote"' / "entry.mjs")],
                 "env": {"SETTINGS_FILE": str(self.base / "private.json")}}
        result = toolkit.merge_mcp(config, "ahill_test", entry)
        self.assertEqual(Path(result["backup"]).read_bytes(), original)
        self.assertTrue(config.read_bytes().startswith(original))
        parsed = tomllib.loads(config.read_text(encoding="utf-8-sig"))
        self.assertEqual(parsed["model"], "user-choice")
        self.assertEqual(parsed["mcp_servers"]["ahill_test"], entry)
        self.assertFalse(toolkit.merge_mcp(config, "ahill_test", entry)["changed"])

    def test_toml_conflict_is_non_destructive(self):
        config = self.base / "config.toml"
        original = '[mcp_servers.ahill_test]\ncommand = "keep"\n'
        config.write_text(original)
        with self.assertRaisesRegex(ValueError, "different settings"):
            toolkit.merge_mcp(config, "ahill_test", {"command": "replace"})
        self.assertEqual(config.read_text(), original)
        self.assertEqual(len(list(self.base.iterdir())), 1)

    def test_invalid_toml_never_gets_modified(self):
        config = self.base / "config.toml"
        config.write_text("[broken")
        with self.assertRaises(tomllib.TOMLDecodeError):
            toolkit.merge_mcp(config, "ahill_test", {"command": "node"})
        self.assertEqual(config.read_text(), "[broken")

    def test_config_dry_run_creates_nothing(self):
        config = self.base / "missing/config.toml"
        toolkit.merge_mcp(config, "ahill_test", {"command": "node"}, True)
        self.assertFalse(config.parent.exists())

    def test_mcp_registration_generates_private_settings_and_keeps_token_out_of_config(self):
        target = self.base / "runtime"
        toolkit.atomic_write(target / "adobe/premiere/launcher.mjs", "// fixture")
        toolkit.atomic_write(target / "adobe/premiere/node_modules/premiere-pro-mcp/package.json",
                             '{"version":"1.14.5"}')
        args = SimpleNamespace(target=target, kind="premiere", port=17788,
                               config=self.base / "codex/config.toml", dry_run=True)
        with patch.object(toolkit.shutil, "which", return_value="node"):
            toolkit.register_mcp(args)
            self.assertFalse((target / "private").exists())
            self.assertFalse(args.config.exists())
            args.dry_run = False
            toolkit.register_mcp(args)
            settings = (target / "private/premiere.json").read_text()
            token = json.loads(settings)["token"]
            self.assertEqual(len(token), 64)
            self.assertNotIn(token, args.config.read_text())
            self.assertFalse(toolkit.register_mcp(args)["changed"])
            self.assertEqual((target / "private/premiere.json").read_text(), settings)

    def test_distributed_patch_payloads_match_their_checksums(self):
        for kind in ("premiere", "photoshop"):
            bundle = ROOT / "adobe/patches" / kind
            data = json.loads((bundle / "patch.json").read_text())
            for entry in data["files"]:
                payload = (bundle / "files" / entry["path"]).read_bytes()
                self.assertEqual(toolkit.sha(payload), entry["after_sha256"], entry["path"])

    def bundle(self):
        bundle = self.base / "bundle"
        toolkit.atomic_write(bundle / "files/main.js", b"new")
        toolkit.atomic_write(bundle / "files/lib/new.js", b"additional")
        data = {"files": [
            {"path": "main.js", "before_sha256": toolkit.sha(b"old"), "after_sha256": toolkit.sha(b"new")},
            {"path": "lib/new.js", "before_sha256": None, "after_sha256": toolkit.sha(b"additional")},
        ]}
        toolkit.atomic_write(bundle / "patch.json", toolkit.encode(data))
        return bundle

    def test_patch_is_hash_checked_repeatable_and_backed_up(self):
        bundle, dest = self.bundle(), self.base / "plugin"
        toolkit.atomic_write(dest / "main.js", b"old")
        result = toolkit.apply_patch_bundle(bundle, dest)
        self.assertEqual((dest / "main.js").read_bytes(), b"new")
        self.assertEqual((Path(result["backup"]) / "main.js").read_bytes(), b"old")
        self.assertEqual(toolkit.apply_patch_bundle(bundle, dest)["changed"], 0)

    def test_wrong_patch_version_does_not_partially_modify(self):
        bundle, dest = self.bundle(), self.base / "plugin"
        toolkit.atomic_write(dest / "main.js", b"old")
        toolkit.atomic_write(dest / "lib/new.js", b"user version")
        with self.assertRaisesRegex(ValueError, "Wrong version"):
            toolkit.apply_patch_bundle(bundle, dest)
        self.assertEqual((dest / "main.js").read_bytes(), b"old")
        self.assertFalse(list(dest.glob(".ahill-backup-*")))

    def test_patch_dry_run_does_not_write(self):
        bundle, dest = self.bundle(), self.base / "plugin"
        toolkit.atomic_write(dest / "main.js", b"old")
        toolkit.apply_patch_bundle(bundle, dest, True)
        self.assertEqual((dest / "main.js").read_bytes(), b"old")
        self.assertFalse((dest / "lib").exists())

    def test_path_traversal_is_rejected(self):
        for path in ("../escape", "/escape", "C:/escape", "sub/../../escape", "sub\\escape"):
            with self.assertRaises(ValueError):
                toolkit.safe_child(self.base, path)

    def test_project_scaffold_preserves_nonempty_folders(self):
        dest = self.base / "project"
        toolkit.new_project(dest)
        self.assertTrue((dest / "06_premiere").is_dir())
        self.assertIsNone(json.loads((dest / "handoff.json").read_text())["width"])
        with self.assertRaisesRegex(ValueError, "empty"):
            toolkit.new_project(dest)

    def test_release_allowlist_excludes_generated_and_private_data(self):
        self.assertEqual(toolkit.release_issues(), [])
        output = self.base / "release.zip"
        toolkit.make_release(output)
        with zipfile.ZipFile(output) as archive:
            names = archive.namelist()
            self.assertEqual(len(names), len(toolkit.public_paths()))
            self.assertTrue(any(name.endswith("/README.md") for name in names))
            self.assertFalse(any("/node_modules/" in n or "/private/" in n for n in names))

    def test_cli_errors_produce_nonzero_exit(self):
        completed = subprocess.run([sys.executable, str(ROOT / "toolkit.py"), "new-project", str(ROOT)],
                                   capture_output=True, text=True, encoding="utf-8")
        self.assertEqual(completed.returncode, 1)
        self.assertIn("error", json.loads(completed.stderr))


if __name__ == "__main__":
    unittest.main()
