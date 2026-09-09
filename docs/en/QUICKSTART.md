# Installation and first use

[한국어](../QUICKSTART.md) | [English](QUICKSTART.md) | [README](../../README.en.md)

## Requirements

- Core features: Python 3.11+. On Linux/macOS, use `python3` if necessary.
- Premiere adapter: Node.js 20.19+, a compatible Premiere installation and separate CEP/UXP panels.
- Optional semantic memory: a Python 3.12 virtual environment is recommended; preparation downloads dependencies and a model.
- Sign into Codex and Adobe using your own accounts.

## Install

From the extracted repository:

```powershell
python toolkit.py install --profile full
python toolkit.py doctor
```

The installer resolves your home directory. Reinstalling preserves identical files, stops before overwriting conflicting user edits, and retains skills enabled by previous profiles.

```powershell
python toolkit.py install --profile adobe --target "$HOME/Tools/ahill-toolkit" --skills-home "$HOME/.agents/skills"
```

Choose a dedicated installation directory outside the source checkout. Do not use a directory containing another application. When using a custom path, update `$toolkitRoot` in the examples accordingly.

```powershell
$toolkitRoot = Join-Path $HOME '.codex/tooling/ahill-toolkit'
python "$toolkitRoot/memory/memory.py" save --project my-video --key subtitle-style --text "Use white captions with a black outline" --source "User request and date"
python "$toolkitRoot/memory/memory.py" search "captions" --project my-video
python "$toolkitRoot/toolkit.py" new-project .\my-video
```

Memory is stored separately in `~/.codex/ahill-work-memory`. Override it with `CODEX_WORK_MEMORY_DIR`. Existing private memories are not automatically imported.

If the skill does not appear in Codex, restart the application and request `ahill-work-memory`. Skills are installed in the user location described by the [official local-skill documentation](https://learn.chatgpt.com/docs/build-skills).

## Connect optional tools

`doctor` discovers executables and installation files. A `found` result does not prove an Adobe host connection, an authenticated account or a successful edit.

- Follow [ADOBE.md](ADOBE.md) for panel installation, MCP registration and host checks.
- Follow [RESEARCH.md](RESEARCH.md) for the research/browser tools you need.
- Follow [MEMORY.md](MEMORY.md) to enable semantic search.

## Remove or restore

The installation directory's `installation.json` records installed files and skills. Close the relevant applications, inspect that list, then remove the toolkit's `ahill-*` skill directories and dedicated code directory. The separate memory store remains.

If you registered MCP servers, remove only your `ahill_*` tables from `config.toml`. Before restoring a full config backup, compare settings added since that backup.

Adobe patch backups are saved under `.ahill-backup-*` in the patched panel directory. `restore.json` identifies original files and newly added files. Restore originals from the backup; remove added files only after checking that list.
