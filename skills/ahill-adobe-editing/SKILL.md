---
name: ahill-adobe-editing
description: Edit or diagnose local Premiere Pro, After Effects and Photoshop workflows through installed MCP bridges. Use when editable Adobe projects or local app connectivity are required.
---

# Adobe editing

Setup and supported versions: {{TOOLKIT_ROOT}}/docs/ADOBE.md

Choose the application according to the requested deliverable. Discover the
installed tool names and schemas rather than assuming every listed tool is
available. Installation, panel pairing and a successful edit are different checks.

- Premiere: start with project information or verify_premiere_connection. A
  timeout can mean the app or panel is closed. Discover sequence and clip IDs
  before editing; refresh after structural changes. Shared UXP serializes
  individual commands across tasks, but editors must still coordinate sequences
  and multi-step edits. After a connection loss, inspect state before retrying
  a mutation; it may already have run.
- After Effects: open the installed ae-mcp panel, query ae_status, then load
  the server's ae-execution-guide before execution. The common ae-mcp port 11488
  and separate ae-cli port 8080 are independent bridges. One does not prove the
  other is ready.
- Photoshop: discover host, capabilities and state. Search/describe the exact
  command, execute its schema, and verify layers/state plus a preview. Pairing
  codes belong in the trusted local panel/dialog, never a report or repository.
  Experimental catalog entries are not established capabilities.

Keep editable originals and produce review exports. Do not open an unrelated
customer project just to test connectivity; use a disposable synthetic project.
Discover FFmpeg/ffprobe on PATH before deciding to install them.
For handoffs record resolution, rational frame rate, duration, alpha, color
space and audio sample rate. Preserve PSD layers and AEP/PRPROJ deliverables.
Do not claim playback, audibility or visual quality from accepted tool calls alone.
