# Research and browser tools

[한국어](../RESEARCH.md) | [English](RESEARCH.md) | [README](../../README.en.md)

Install only the tools you need. Search queries and website visits are sent to the relevant services; this is separate from local-only memory storage.

## Agent Reach

Use the 1.5.0 release commit from the [upstream project](https://github.com/Panniantong/Agent-Reach). Python 3.12 and [uv](https://docs.astral.sh/uv/getting-started/installation/) are required.

```powershell
uv tool install --python 3.12 "https://github.com/Panniantong/Agent-Reach/archive/f65526cbaaad3879473acc1ba6dbefd195caf2be.zip"
agent-reach doctor --json
```

Read the upstream Agent Reach skill when using a platform. Verify access with a real read request for the task. Installation does not connect social-media accounts; several optional platforms were unauthenticated in the original environment.

## agent-browser

The [agent-browser](https://github.com/vercel-labs/agent-browser) version used in the original setup was 0.37.1.

```powershell
npm install -g agent-browser@0.37.1
agent-browser skills get core
agent-browser install
```

On Windows, use `agent-browser.cmd` and `npm.cmd` if PowerShell execution policy blocks the script wrappers. Follow that version's core guide for Chromium downloads or browser-path issues.

```powershell
agent-browser --session ahill-demo open https://example.com
agent-browser --session ahill-demo snapshot
agent-browser --session ahill-demo close
```

Read a fresh snapshot before interacting and verify the result afterward. Configure your own logins separately. The toolkit does not import existing browser profiles.

## Exa with mcporter

Example using [mcporter](https://github.com/steipete/mcporter) 0.13.10, run from the repository root:

```powershell
npm install -g mcporter@0.13.10
mcporter --config ./templates/mcporter.example.json call exa.web_search_exa query="official video editing documentation" numResults=5
```

The explicit config file avoids overwriting your personal mcporter configuration. Service availability, usage limits and authentication requirements depend on the remote service. If unavailable, use another authorized search or connector available for the task.

## Practical workflow

- Collect public visual references with URLs, dates and the elements you intend to apply.
- Inspect rendered pages before making visual judgments.
- Recall relevant project decisions before starting research for resumed work.
- Save only verified decisions and useful lessons when finishing.

Installing a tool or reading a source page does not authorize account changes, messaging or publishing.
