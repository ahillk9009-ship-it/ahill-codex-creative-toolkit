# Original setup map

[한국어](../SETUP-MAP.md) | [English](SETUP-MAP.md) | [README](../../README.en.md)

Snapshot date: **2026-09-09**. Local installation files, configured server names, setup reports and relevant project memories were compared. This summarizes the source environment; it does not guarantee immediate connectivity on another computer.

## Components and portable equivalents

| Area | Original configuration | What this repository provides |
|---|---|---|
| Persistent memory | Mem0 OSS, multilingual FastEmbed, embedded Qdrant, SQLite/JSON and backups | Standard-library core plus optional local semantic-search code |
| Research | Agent Reach, Exa and mcporter | Versioned install recipes, separate config example and workflow skill |
| Browser interaction | agent-browser and Playwright-related tools | CLI setup guidance and upstream references |
| Premiere | CEP MCP, UXP panel, shared connection and recovery changes | Shared service code, npm lockfile, guarded panel patches and registration |
| After Effects | ae-mcp JSX bridge and separate ae-cli/declarative skills | Upstream installation, registration and state-check guidance |
| Photoshop | Full MCP, UXP panel, HMAC and cancellation fixes | Upstream installation, guarded patches and registration |
| Design production | Illustrator, Lightroom Classic, Bridge and Photoshop | Project folders, production brief and editable-layer handoff guidance |
| Video/audio | Premiere, After Effects, Audition, Media Encoder, FFmpeg/ffprobe | Handoff metadata and output verification templates |
| Frontend/image design | 13 Taste-family skills, Figma, typography/layout/motion skills | Source catalog and task-specific selection guidance |
| Development workflows | GSD, Graphify, Ponytail, Superpowers and Claude Mem | Inventory and references; no private caches, history or autonomous-execution settings |
| Additional MCP servers | filesystem, headroom, GVF, Serena, OpenChatCut and others | Inventory context; upstream installation, account and model requirements remain separate |
| Codex-provided capabilities | Documents, PDFs, spreadsheets, presentations, images, browsers and integrations such as Figma/Canva | Each user checks availability and connections in their own Codex account |

## Inventory and sources

- [Installed user/project skills](../../catalog/installed-skills.json): files observed in 129 locations. Names may repeat; this is not a count of unique or verified capabilities.
- [Component catalog](../../catalog/components.json): upstream sources, observed versions and installation recipes.
- Bundled Codex skills and plugin caches are excluded from the 129-location inventory. Availability varies by account, platform and app version.

The toolkit's four original skills restate reusable workflow principles without personal account or path dependencies. External skill libraries are not copied wholesale or enabled automatically.

## Previously verified in the source environment

- Premiere: multiple MCP clients and project, track and sequence queries.
- Photoshop: host connection, document/text-layer creation, previews and PSD/PNG exports.
- Local memory: Korean semantic search, corrections, backups and index rebuilding.
- Agent Reach/Exa: public search; agent-browser: page navigation and snapshots.
- Audition, Lightroom Classic and Bridge: installation and launch, not every automation capability.

[VALIDATION.md](VALIDATION.md) distinguishes these historical results from tests of the portable package. Customer projects and private historical records are not included.

## Suggested adoption order

1. Start with `core` to establish memory and project-resumption habits.
2. Add `research` and browser tools when collecting references.
3. Add `adobe` and configure the panels for applications you use.
4. Add `design` for multi-application handoffs.
5. Install GSD, Graphify or design skills from their original sources only when the project benefits from them.
