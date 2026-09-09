# Local project memory

[한국어](../MEMORY.md) | [English](MEMORY.md) | [README](../../README.en.md)

## Core mode

The default mode uses only Python's standard library. It provides keyword search, project scoping, correction history, JSON export and SQLite backups without API keys or model downloads.

```powershell
$toolkitRoot = Join-Path $HOME '.codex/tooling/ahill-toolkit'
python "$toolkitRoot/memory/memory.py" save --project demo --key subtitle --text "Use yellow captions" --source "Verified decision and date"
python "$toolkitRoot/memory/memory.py" search "captions" --project demo
python "$toolkitRoot/memory/memory.py" list --project demo
python "$toolkitRoot/memory/memory.py" status
python "$toolkitRoot/memory/memory.py" backup
python "$toolkitRoot/memory/memory.py" export
```

- Default store: `~/.codex/ahill-work-memory`. Override with `CODEX_WORK_MEMORY_DIR`.
- Canonical database: `records.sqlite3`. Readable export: `memories.json`.
- Reuse the same project and key to correct a fact; the previous version remains in history.
- Each change creates a database backup first. Identical saves are skipped.
- Search includes only the selected project and `global` preferences.
- `lexical-fallback` with “Semantic index disabled” is expected in core mode.
- The `pending` count is the number of records not yet reflected in the optional semantic index; it is not a failed-save count.
- Store concise facts with sources, at most 4,000 characters per record.
- Storage is local but not separately encrypted; access follows OS account permissions.

## Optional local Mem0 semantic search

This mode uses Mem0, FastEmbed and embedded Qdrant. Facts are curated by the user/agent and saved with inference disabled. A hosted Mem0 account or running Ollama server is not required.

Prepare a Python 3.12 environment with internet access:

```powershell
$toolkitRoot = Join-Path $HOME '.codex/tooling/ahill-toolkit'
py -3.12 -m venv "$toolkitRoot/memory/.venv"
$memoryPython = Join-Path $toolkitRoot 'memory/.venv/Scripts/python.exe'
& $memoryPython -m pip install -r "$toolkitRoot/memory/requirements-semantic.txt"
& $memoryPython "$toolkitRoot/memory/prepare_model.py"
```

On Linux/macOS, use `python3.12 -m venv` and `memory/.venv/bin/python`.

Enable semantic mode in the environment used to run memory commands:

```powershell
$env:AHILL_MEMORY_SEMANTIC = '1'
& $memoryPython "$toolkitRoot/memory/memory.py" sync
& $memoryPython "$toolkitRoot/memory/memory.py" search "subtitle text color" --project demo
```

This variable applies only to the current PowerShell session. It does not change an already-running Codex process. Ask Codex to use the virtual environment and explicit variable, or launch it from that configured environment.

The model is `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`. Its default cache is `~/.cache/ahill-memory-models`, configurable with `AHILL_MEMORY_MODEL_CACHE`. Preparation downloads the model explicitly. Runtime permits only cached model files and disables telemetry. If the model or dependencies are unavailable, search falls back to keywords while preserving stored records.

Run `sync` after saving in semantic mode. To rebuild the derived index:

```powershell
& $memoryPython "$toolkitRoot/memory/memory.py" reindex
```

Reindexing archives the previous vector directory and rebuilds from SQLite. A failed `sync` does not undo a successful `save`. The separately available hosted `mem0` CLI is not this store's interface.

## What to retain

Store verified facts, preferences and decisions with sources and dates. Current instructions override stale memory. Do not retain credentials, complete conversations or customer source files. Backups on the same disk do not protect against disk loss; manage a separate backup location if needed.
