# Third-party notices

Original toolkit code, portable integration changes and the four Ahill skills
are provided under the repository MIT license. This does not relicense the
products, services, models, skills or applications referenced by the toolkit.

## Included modified code

| Component | Included material | License |
|---|---|---|
| [premiere-pro-mcp](https://github.com/leancoderkavy/premiere-pro-mcp), 1.14.5 | Modified UXP index.cjs/index.html payloads; upstream package installed separately with npm | [Original MIT notice](licenses/premiere-pro-mcp-MIT.txt) |
| [photoshop-full-mcp](https://github.com/muhwagwa0112/photoshop-full-mcp), 2.0.1 | Modified main.js and lib/bridge.js payloads, small errors fixture | [Original MIT notice](licenses/photoshop-full-mcp-MIT.txt) |
| [noble-hashes](https://github.com/paulmillr/noble-hashes), 2.4.0 | HMAC/SHA-256 compatibility bundle generated with esbuild 0.28.2 | [Original MIT notice](licenses/noble-hashes-MIT.txt) |

Changes made in the source environment include Premiere shared UXP connection
and recovery, UXP connection setting persistence, Photoshop HMAC compatibility
without SubtleCrypto/TextEncoder, and folder picker cancellation handling.
The portable version replaces personal paths/config reads with explicit runtime
paths and locally generated connection settings.

The complete original notices above apply to the modified upstream files.
Patch payloads are version and checksum guarded. They are not official vendor
releases or a promise of compatibility with future versions.

## Separately installed dependencies and references

Mem0, FastEmbed, Qdrant, Ollama's Python client, ONNX Runtime, Node dependencies,
Agent Reach, agent-browser, mcporter, FFmpeg, GSD, Graphify, Ponytail, OpenAI
skills, design skills and Adobe applications retain their own licenses.
Their binaries, caches, user accounts and private data are not bundled.

The optional embedding model is downloaded from its upstream distribution during
explicit preparation and retains its own model license and notices.

The source inventory records names and public origins only. Installed skill
files and commercial/plugin caches are not wholesale redistributed.
OpenAI, Codex, Adobe, Premiere Pro, Photoshop and After Effects are trademarks
of their respective owners; this project is independent.
