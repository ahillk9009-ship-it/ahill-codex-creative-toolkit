# Adobe integrations

[한국어](../ADOBE.md) | [English](ADOBE.md) | [README](../../README.en.md)

Application installation, panel installation, MCP registration, host connectivity and successful editing require separate checks. Adobe subscriptions and application installers are not included.

## Premiere shared UXP adapter

Upstream: [premiere-pro-mcp](https://github.com/leancoderkavy/premiere-pro-mcp).
The adapter uses internal APIs from **MCP package 1.14.5** and pins that version. This is not the Adobe application's version number.

```powershell
$codexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' }
$toolkitRoot = Join-Path $codexRoot 'tooling/ahill-toolkit' # Replace with your custom path if needed
python toolkit.py install --profile adobe --target "$toolkitRoot"
npm ci --prefix "$toolkitRoot/adobe/premiere" --ignore-scripts --no-audit --no-fund
```

Follow the upstream instructions to install compatible Premiere and CEP/UXP panels. Apply the patch to the installed package's UXP development directory:

```powershell
$pluginRoot = Join-Path $toolkitRoot 'adobe/premiere/node_modules/premiere-pro-mcp/uxp-plugin'
python "$toolkitRoot/toolkit.py" patch premiere --plugin-dir "$pluginRoot" --dry-run
python "$toolkitRoot/toolkit.py" patch premiere --plugin-dir "$pluginRoot"
python "$toolkitRoot/toolkit.py" mcp premiere --target "$toolkitRoot"
```

In Adobe UXP Developer Tools, register and load the **patched `$pluginRoot/manifest.json`**. If you use a panel installed elsewhere, patch the directory you actually load. Unsupported versions or locally changed files are not overwritten.

Registration adds `ahill_premiere`. If a `premiere-pro` server already exists, choose which integration to enable to avoid duplicate tools. The helper does not disable or replace existing servers.

First connection:

1. Restart Codex and open the patched UXP panel in Premiere.
2. Use the default panel URL `ws://127.0.0.1:7788/uxp`.
3. Open `$toolkitRoot/private/premiere.json` in your local text editor and enter its generated token directly in the panel. Do not share the file or paste the token into reports.
4. Select Connect and use Codex's connection/project tools to verify an actual host response.

For another port, pass `--port 17788` during initial registration and update the panel URL. Existing pairing settings are not silently changed. The shared service starts as a hidden local process when needed and remains available when an individual Codex task ends. When removing it, identify the process running `service.mjs` from your toolkit installation before stopping it.

### Shared-connection behavior

One authenticated loopback service owns the panel connection. It serializes edits while explicitly allowlisted state/capability queries and event/readiness waits run independently. Unknown commands remain serialized. The service reconnects after connection loss and never automatically replays interrupted mutations.

Multi-command edits are not atomic transactions. Coordinate tasks editing the same sequence. After a timeout, inspect current state before retrying: the command may already have executed.

### Timeouts and cancellation (v0.1.2)

When an edit is dispatched but completion is unknown after a timeout or disconnect, later edits fail with `UXP_STATE_UNCERTAIN`. Observations and waits remain available. Failed/rejected edits are never automatically replayed; unknown commands receive the same protection as edits.

A late terminal result for the exact request on the same panel connection releases the fence. Reconnecting, receiving an unrelated result, or accepting a cancellation request does not. If the result is lost, inspect the actual project and saved state, fully close Premiere, then stop/restart the `service.mjs` process belonging to this installation. If identifying that process is difficult, save all work and restart Windows. Do not restart only the service to bypass the fence while a host operation could still be running.

`operation.cancel` bypasses the edit queue, but only the same originating MCP connection can cancel its request. Other connections receive `UXP_CANCEL_FORBIDDEN`. Cancellation acceptance still requires a terminal result from the original operation. If Premiere has crossed a non-cancellable host boundary, the original response such as `host_call_not_cancellable` is preserved; forced interruption is not promised. This adapter does not add a separate Codex cancel button.

To check the connection and recovery state without editing:

```powershell
$env:AHILL_PREMIERE_SETTINGS = Join-Path $toolkitRoot 'private/premiere.json'
node "$toolkitRoot/adobe/premiere/launcher.mjs" --check
```

`recoveryRequired: true` means edits remain fenced even if state queries succeed; the command exits with code 1. If no service is listening, this check can start the shared service for this installation. Restart an existing service after an update so it loads the new code.

## After Effects

Install the panel using [after-effects-mcp](https://github.com/JUNKDOGE-JOE/after-effects-mcp), then register the actual path to its installed `host/stdio-shim.js`:

```powershell
python toolkit.py mcp aftereffects --script "<installed-ae-panel>/host/stdio-shim.js"
```

Replace the placeholder with your installation path. The usual ae-mcp endpoint on port 11488 is independent of the separate ae-cli panel on port 8080. Check `ae_status` and read the server's execution guide before running JSX. Native-only features need separate capability checks.

## Photoshop Full MCP 2.0.1

Use the upstream [Photoshop Full MCP](https://github.com/muhwagwa0112/photoshop-full-mcp) release and installation instructions. Install the server and UXP panel, and pair them locally.

If the upstream installer already registered the server, do not register it again. For manual registration, obtain the Node entry point from the installed runtime metadata:

```powershell
python toolkit.py mcp photoshop --script "<installed-runtime>/<server-entry>.js"
python toolkit.py patch photoshop --plugin-dir "<loaded-uxp-plugin-folder>" --dry-run
python toolkit.py patch photoshop --plugin-dir "<loaded-uxp-plugin-folder>"
```

Replace the placeholders with actual paths. The patch applies only when original 2.0.1 file checksums match. It implements HMAC verification in UXP environments without `SubtleCrypto` or `TextEncoder` while preserving authentication, server identity and pairing checks. It also handles cancellation of the export-folder picker.

Restart Photoshop and verify host state, document/layer creation, previews and a synthetic test export. Compatibility with other versions is not established.

## Configuration preservation

The registration helper parses the existing TOML and validates the proposed result. It retains original bytes and comments, creates a `.ahill-backup-*` copy, and stops if an existing server name has different settings. The format follows the [official MCP configuration documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).
