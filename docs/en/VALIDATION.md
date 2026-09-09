# Validation scope

[한국어](../VALIDATION.md) | [English](VALIDATION.md) | [README](../../README.en.md)

This guide distinguishes reproducible package checks from checks that require actual Adobe applications.

## Recorded package checks

The following were verified in temporary Windows work directories on 2026-09-09:

| Check | Result |
|---|---|
| Python behavior tests | 23 passed |
| Node shared-bridge/panel tests | 16 passed |
| MCP initialization and tool listing | Passed with the portable launcher connected to a simulated UXP hub |
| Korean semantic memory | Recall, project isolation, corrections and reindexing passed with network socket connections blocked |
| Premiere patch | Applied three files to a fresh npm 1.14.5 panel copy; repeated application was idempotent |
| Photoshop patch | Applied four files to an original 2.0.1 distribution copy; repeated application was idempotent |
| Windows PowerShell installer | Installed four skills into a temporary path containing spaces |
| Skill format | All four passed the OpenAI skill-creator validator |
| Distribution | Local documentation links, release allowlist and basic secret-pattern checks passed |

The semantic test reused prepared dependencies and model files. Downloading every optional dependency/model on a clean computer was not revalidated. These tests did not open Adobe or modify the original production panels or Codex configuration.

## Reproduce automated checks

```powershell
python -m unittest discover -s tests -v
npm ci --prefix adobe/premiere --ignore-scripts --no-audit --no-fund
npm test --prefix adobe/premiere
python toolkit.py check-release
```

Python tests cover installation and reinstallation, Unicode/space-containing paths, preservation of user edits, TOML comments/settings, backups, guarded patches, project scaffolding, memory history and isolation, concurrent saves, and release contents.

Node tests use simulated panels and temporary local ports. They exercise multiple clients, authentication rejection, command serialization, reconnects, interrupted-mutation behavior, UXP cryptography compatibility, folder cancellation and connection-setting restoration. They do not verify every Adobe API.

Run the optional semantic check using your prepared virtual environment:

```powershell
<semantic-python> tests/semantic_smoke.py
```

Replace `<semantic-python>` with the actual environment's Python executable. The test uses a temporary database, not your existing memories, and requires a prepared model cache.

## Manual checks on another computer

- Confirm that a fresh Codex session discovers the skills and registered tools.
- Verify the path and version of each panel actually loaded by Premiere, Photoshop or After Effects.
- Query real host, project, sequence and layer state after pairing.
- Use a synthetic project to test editing, saving, previews and exports.
- Restart applications to check pairing persistence and reconnection.
- Inspect rendered output and listen to audio when required.

Historical success on the source workstation does not establish compatibility on another user's computer. CI targets Windows and Ubuntu; check the [current workflow result](https://github.com/ahillk9009-ship-it/ahill-codex-creative-toolkit/actions/workflows/test.yml) for the commit you are using.
