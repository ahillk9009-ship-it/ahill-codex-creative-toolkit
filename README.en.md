# Ahill Codex Creative Toolkit

**[한국어](README.md) | [English](README.en.md)**

**A reusable Codex setup for creative work: local project memory, Adobe integrations, and task skills.**

This toolkit packages a personal Windows video and design workflow so others can install the reusable parts on their own computers. Start with local memory, then add the external tools and application bridges you need.

> Korean and English guides · Windows first · Python 3.11+ · No API key needed for core features

**v0.1.2:** Adds interrupted-install recovery, installed-path detection, independent Premiere observation/wait requests and owner-checked cancellation. Timed-out edits block later edits until their completion is confirmed. [Changelog](CHANGELOG.md) · [Update an existing installation](docs/en/QUICKSTART.md#update-an-existing-installation)

## What's included

| Component | What you get |
|---|---|
| Installer | Automatic path resolution, five skill profiles, repeatable installation and conflict detection |
| Project memory | SQLite/JSON storage, keyword search, correction history, backups and optional local Mem0 semantic search |
| Premiere Pro | Shared UXP connections, serialized edits, independent observations/waits and protection after uncertain edit completion |
| Photoshop | Compatibility fixes for UXP cryptography APIs and folder-picker cancellation |
| Adobe registration | Codex MCP configuration helpers for Premiere, After Effects and Photoshop, with config backups |
| Four reusable skills | Project memory, research/browser verification, Adobe editing and creative handoffs |
| Project templates | Nine production folders, an edit brief, handoff metadata and AGENTS.md |
| Component catalog | Sources and setup guidance for Agent Reach, agent-browser, Exa, design skills and development tools |
| Distribution tools | An explicit release file list, basic secret-pattern checks and GitHub Actions tests |

Codex, Adobe applications, subscriptions, account connections and customer media are not bundled. This is an independent project, not an official OpenAI or Adobe product.

## Quick start

1. Install [Python 3.11 or newer](https://www.python.org/downloads/).
2. Use **Code → Download ZIP** on this repository and extract it.
3. Open PowerShell in the extracted directory:

```powershell
python toolkit.py install --profile full
python toolkit.py doctor
```

Alternatively, use the PowerShell wrapper:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1 -Profile full
```

The default code directory is `~/.codex/tooling/ahill-toolkit` and the skill directory is `~/.agents/skills`. If you set `CODEX_HOME`, the code directory follows it. Basic installation does not modify existing model settings, project instructions or MCP registrations.

**The `full` profile installs all four toolkit skills. It does not download every external application or sign into accounts.** Connect Adobe and browser tools using the guides below.

## Choose a profile

| Profile | Enabled skills |
|---|---|
| `core` | Local project memory |
| `research` | Memory + research/browser verification |
| `adobe` | Memory + Adobe editing |
| `design` | Memory + creative handoffs |
| `full` | All four skills |

All profiles copy the reusable code and documentation; the profile selects which skills to activate. Use `--dry-run` to preview installation, `--target` for the code directory and `--skills-home` for the skill directory.

```powershell
python toolkit.py install --profile core --dry-run
python toolkit.py new-project .\my-video
python toolkit.py catalog --group adobe
```

## Example requests for Codex

> “Use ahill-work-memory to review this project's previous decisions before continuing.”

> “Use ahill-adobe-editing to verify the Premiere connection, preserve my sources, and produce an editable project and a review export.”

> “Use ahill-creative-handoff to prepare a Photoshop → After Effects → Premiere workflow with editable masters and matching delivery settings.”

## English guides

- [Installation and first use](docs/en/QUICKSTART.md)
- [Original setup map](docs/en/SETUP-MAP.md)
- [Local memory and optional Mem0](docs/en/MEMORY.md)
- [Premiere, After Effects and Photoshop](docs/en/ADOBE.md)
- [Agent Reach, agent-browser and Exa](docs/en/RESEARCH.md)
- [Publishing to GitHub](docs/en/PUBLISH.md)
- [Validation and remaining manual checks](docs/en/VALIDATION.md)

## Development and verification

```powershell
python -m unittest discover -s tests -v
npm ci --prefix adobe/premiere --ignore-scripts --no-audit --no-fund
npm test --prefix adobe/premiere
python toolkit.py check-release
python toolkit.py release --output dist/codex-creative-toolkit.zip
```

Node.js 20.19+ is required for the JavaScript adapter tests. CI runs on Windows and Ubuntu. Test actual Adobe application operations on your own installation.

## License and attribution

Toolkit code and its original instructions use the [MIT license](LICENSE). Copyright and license notices for modified upstream code are retained in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). External tools, services and skills retain their own licenses and terms.
