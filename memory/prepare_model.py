"""Explicit one-time model download for optional local semantic memory."""
import os
from pathlib import Path

os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["DO_NOT_TRACK"] = "1"
os.environ["HF_HUB_OFFLINE"] = "0"
cache = Path(os.environ.get("AHILL_MEMORY_MODEL_CACHE", Path.home() / ".cache" / "ahill-memory-models"))
os.environ["FASTEMBED_CACHE_PATH"] = str(cache)

if __name__ == "__main__":
    from fastembed import TextEmbedding
    model = TextEmbedding(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2", cache_dir=str(cache))
    vector = next(model.embed(["한국어 작업 기억 준비"]))
    if len(vector) != 384:
        raise RuntimeError("Unexpected embedding dimensions")
    print("Model ready. Set AHILL_MEMORY_SEMANTIC=1 for local semantic search.")
