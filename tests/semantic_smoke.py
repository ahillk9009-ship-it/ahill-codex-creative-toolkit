"""Optional offline Mem0 smoke test. Run using the prepared semantic Python."""
import os
from pathlib import Path
import socket
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "memory"))
os.environ["AHILL_MEMORY_SEMANTIC"] = "1"
os.environ.pop("WORK_MEMORY_LEXICAL_ONLY", None)
import memory


def no_network(*args, **kwargs):
    raise AssertionError("Memory runtime attempted a network connection")


if __name__ == "__main__":
    socket.socket.connect = no_network
    with tempfile.TemporaryDirectory(prefix="ahill-semantic-") as temporary:
        memory.ROOT = Path(temporary)
        db = memory.connect()
        try:
            first = memory.save(db, "demo", "subtitle", "영상 자막은 흰색 글자와 검은 외곽선을 사용한다.", "test:verified")
            memory.save(db, "other", "private", "자막의 비공개 다른 프로젝트 설정", "test:other")
            result = memory.search(db, "동영상 캡션의 글씨 색상과 테두리", "demo", 5)
            assert result["mode"] == "semantic+lexical", result
            assert any(row["id"] == first["id"] for row in result["results"]), result
            assert all(row["project"] != "other" for row in result["results"]), result
            memory.save(db, "demo", "subtitle", "영상 자막은 노란색 글자를 사용한다.", "test:correction")
            result = memory.search(db, "자막", "demo", 5)
            assert result["mode"] == "semantic+lexical", result
            assert any("노란색" in row["text"] for row in result["results"]), result
            assert memory.reindex(db)["indexed"] == 2
        finally:
            db.close()
    print("PASS: offline Korean semantic recall, project isolation, correction, reindex")
