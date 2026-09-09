import json
import os
from pathlib import Path
import socket
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "memory"))
import memory


class MemoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="ahill-memory-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.settings = patch.object(memory, "ROOT", self.root)
        self.settings.start()
        self.addCleanup(self.settings.stop)
        self.env = patch.dict(os.environ, {"WORK_MEMORY_LEXICAL_ONLY": "1"})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.network = patch.object(socket.socket, "connect", side_effect=AssertionError("Network forbidden"))
        self.network.start()
        self.addCleanup(self.network.stop)
        self.db = memory.connect()
        self.addCleanup(self.db.close)

    def save(self, project="alpha", text="자막은 흰색 글자"):
        return memory.save(self.db, project, "captions", text, "test:verified")

    def test_duplicate_suppression_and_correction_history(self):
        first, second = self.save(), self.save()
        self.assertEqual(first["id"], second["id"])
        self.assertFalse(second["changed"])
        self.save(text="자막은 노란색 글자")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM history").fetchone()[0], 1)
        results = memory.search(self.db, "자막", "alpha", 5)["results"]
        self.assertEqual(results[0]["text"], "자막은 노란색 글자")

    def test_project_scoping_and_global_preferences(self):
        self.save()
        self.save(project="beta", text="자막은 비공개 다른 프로젝트")
        self.save(project="global", text="자막 작업은 한국어")
        results = memory.search(self.db, "자막", "alpha", 10)["results"]
        self.assertEqual({r["project"] for r in results}, {"alpha", "global"})

    def test_source_and_backup_survive_semantic_unavailability(self):
        self.save()
        report = memory.search(self.db, "자막", "alpha", 5)
        self.assertEqual(report["mode"], "lexical-fallback")
        self.assertTrue(report["results"])
        backup = memory.backup(self.db)
        restored = sqlite3.connect(backup)
        try:
            self.assertEqual(restored.execute("SELECT COUNT(*) FROM memories").fetchone()[0], 1)
        finally:
            restored.close()
        self.assertEqual(len(json.loads((self.root / "memories.json").read_text(encoding="utf-8"))), 1)

    def test_invalid_or_oversized_records_rejected(self):
        for project, text in [("한글 slug", "value"), ("alpha", ""), ("alpha", "a" * 4001)]:
            with self.assertRaises(ValueError):
                memory.save(self.db, project, "key", text, "source")

    def test_process_restart_and_concurrent_saves_use_isolated_store(self):
        env = dict(os.environ, CODEX_WORK_MEMORY_DIR=str(self.root), WORK_MEMORY_LEXICAL_ONLY="1",
                   PYTHONIOENCODING="utf-8")
        commands = [[sys.executable, str(ROOT / "memory/memory.py"), "save",
                     "--project", "alpha", "--key", f"key-{i}", "--text", "자막 작업 규칙",
                     "--source", "test:process"] for i in range(4)]
        processes = [subprocess.Popen(command, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE) for command in commands]
        for process in processes:
            out, err = process.communicate(timeout=30)
            self.assertEqual(process.returncode, 0, err.decode("utf-8"))
            self.assertIn("id", json.loads(out))
        completed = subprocess.run([sys.executable, str(ROOT / "memory/memory.py"), "search", "자막",
                                    "--project", "alpha"], env=env, capture_output=True, check=True)
        self.assertEqual(len(json.loads(completed.stdout)["results"]), 4)
        self.assertEqual(self.db.execute("PRAGMA integrity_check").fetchone()[0], "ok")


if __name__ == "__main__":
    unittest.main()
