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

Version 0.1.2 records installation intent before copying files. Rerun the same command after an interrupted write to resume; edits made by the user after interruption remain protected. It cannot automatically adopt a failed 0.1.0 directory that has no installation record.

```powershell
python toolkit.py install --profile adobe --target "$HOME/Tools/ahill-toolkit" --skills-home "$HOME/.agents/skills"
```

Choose a dedicated installation directory outside the source checkout. Do not use a directory containing another application. When using a custom path, update `$toolkitRoot` in the examples accordingly. An installed `toolkit.py` uses its verified installation record for `doctor` and `mcp`; an explicit `--target` takes precedence. Specify the target when running from a source checkout.

```powershell
$codexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' }
$toolkitRoot = Join-Path $codexRoot 'tooling/ahill-toolkit' # Replace with your custom installation if needed
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

## Update an existing installation

Extract the latest ZIP outside your installed directory and run these commands **from the new source directory**. Keep the existing `installation.json`.

```powershell
$codexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' }
$toolkitRoot = Join-Path $codexRoot 'tooling/ahill-toolkit' # Replace with your existing custom installation
$skillsHome = Join-Path $HOME '.agents/skills' # Replace if installation.json records a different skills_home
python toolkit.py install --profile full --target "$toolkitRoot" --skills-home "$skillsHome" --dry-run
python toolkit.py install --profile full --target "$toolkitRoot" --skills-home "$skillsHome"
python "$toolkitRoot/toolkit.py" doctor --target "$toolkitRoot"
```

The default `$skillsHome` is `$HOME/.agents/skills`; use your previous custom path if different. `full` enables all four skills; select your original profile to preserve your selection. Existing memories, pairing tokens and MCP configuration do not need to be recreated. If user-edit conflicts are reported, merge the differences instead of deleting the files.

This update changes neither Adobe panel payloads nor dependency versions. Rerunning `npm ci` unnecessarily can remove patches inside node_modules; reapply the panel patch if you reinstall dependencies. Close Premiere and restart the shared service belonging to this installation to load the updated code. See [timeout recovery](ADOBE.md#timeouts-and-cancellation-v012).

The separately supplied 0.1.1 `APPLY.cmd` only installs its fixed payload. Do not use it as an updater over 0.1.2.

## Remove or restore

The installation directory's `installation.json` records installed files and skills. Close the relevant applications, inspect that list, then remove the toolkit's `ahill-*` skill directories and dedicated code directory. The separate memory store remains.

If you registered MCP servers, remove only your `ahill_*` tables from `config.toml`. Before restoring a full config backup, compare settings added since that backup.

Adobe patch backups are saved under `.ahill-backup-*` in the patched panel directory. `restore.json` identifies original files and newly added files. Restore originals from the backup; remove added files only after checking that list.
