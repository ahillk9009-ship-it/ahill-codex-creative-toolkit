"""Portable installer and diagnostics for Ahill Codex Creative Toolkit (Python 3.11+)."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile
import tomllib
import uuid
from datetime import datetime, timezone
import zipfile

ROOT = Path(__file__).resolve().parent
VERSION = "0.1.0"
PROFILES = {
    "core": ["ahill-work-memory"],
    "research": ["ahill-work-memory", "ahill-research-browser"],
    "adobe": ["ahill-work-memory", "ahill-adobe-editing"],
    "design": ["ahill-work-memory", "ahill-creative-handoff"],
    "full": ["ahill-work-memory", "ahill-research-browser", "ahill-adobe-editing", "ahill-creative-handoff"],
}


def encode(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def stamp():
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex[:8]


def atomic_write(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".ahill-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data if isinstance(data, bytes) else data.encode("utf-8"))
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def safe_child(root, relative):
    root = Path(root).resolve()
    if "\\" in relative or ":" in relative:
        raise ValueError("Use a relative POSIX path")
    result = root.joinpath(relative).resolve()
    if not result.is_relative_to(root) or result == root:
        raise ValueError("Path escapes the target directory")
    return result


def default_target():
    codex = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    return codex / "tooling" / "ahill-toolkit"


def public_paths(root=ROOT):
    # Exact allowlist: new local files never silently enter a release.
    manifest = json.loads((root / "release-files.json").read_text(encoding="utf-8"))
    return [safe_child(root, name) for name in manifest["files"]]


def install(target, skills_home, profile, dry_run=False):
    target, skills_home = Path(target).resolve(), Path(skills_home).resolve()
    if target == ROOT or target.is_relative_to(ROOT) or ROOT.is_relative_to(target):
        raise ValueError("Install outside the checkout; use a dedicated empty target directory")
    marker = target / "installation.json"
    if target.exists() and any(target.iterdir()) and not marker.exists():
        raise ValueError("Target is not an Ahill installation; choose an empty directory")
    old = json.loads(marker.read_text(encoding="utf-8")) if marker.exists() else {}
    if old and old.get("product") != "ahill-codex-creative-toolkit":
        raise ValueError("Unrecognized installation marker")
    # Update only files still matching our previous installation, or already
    # matching the new release. Plan every write before touching any destination.
    files = {}
    for path in public_paths():
        relative = path.relative_to(ROOT).as_posix()
        files[target / relative] = path.read_bytes()
    selected = sorted(set(old.get("skills", [])) | set(PROFILES[profile]))
    for name in selected:
        source = ROOT / "skills" / name / "SKILL.md"
        text = source.read_text(encoding="utf-8")
        text = text.replace("{{TOOLKIT_ROOT}}", target.as_posix())
        files[skills_home / name / "SKILL.md"] = text.encode("utf-8")
    conflicts = []
    for destination, data in files.items():
        if destination.exists():
            current_hash = sha(destination.read_bytes())
            if current_hash != sha(data) and old.get("hashes", {}).get(str(destination)) != current_hash:
                conflicts.append(str(destination))
    if conflicts:
        raise ValueError("User-edited files would be overwritten: " + ", ".join(conflicts))
    plan = {"product": "ahill-codex-creative-toolkit", "version": VERSION,
            "target": str(target), "skills_home": str(skills_home),
            "skills": selected, "file_count": len(files), "dry_run": dry_run}
    if dry_run:
        return plan
    changed = 0
    for destination, data in files.items():
        if not destination.exists() or destination.read_bytes() != data:
            atomic_write(destination, data)
            changed += 1
    plan["hashes"] = {str(p): sha(data) for p, data in files.items()}
    atomic_write(marker, encode(plan))
    return {k: v for k, v in plan.items() if k != "hashes"} | {"changed": changed}


def merge_mcp(config, name, entry, dry_run=False):
    """Append only a new named server. Existing TOML and comments stay byte-for-byte."""
    if not re.fullmatch(r"ahill_[a-z0-9_]+", name):
        raise ValueError("Toolkit server names must start with ahill_")
    config = Path(config).resolve()
    original = config.read_bytes() if config.exists() else b""
    parsed = tomllib.loads(original.decode("utf-8-sig"))
    current = parsed.get("mcp_servers", {}).get(name)
    if current is not None:
        if current == entry:
            return {"changed": False, "server": name}
        raise ValueError("Server already exists with different settings; edit it explicitly: " + name)
    lines = [f"[mcp_servers.{name}]"]
    for key, value in entry.items():
        if key == "env":
            continue
        lines.append(key + " = " + json.dumps(value, ensure_ascii=False))
    if entry.get("env"):
        lines.append(f"\n[mcp_servers.{name}.env]")
        lines.extend(k + " = " + json.dumps(v, ensure_ascii=False) for k, v in entry["env"].items())
    addition = ("\n\n" + "\n".join(lines) + "\n").encode("utf-8")
    candidate = original + addition
    checked = tomllib.loads(candidate.decode("utf-8-sig"))
    if checked["mcp_servers"][name] != entry:
        raise ValueError("Generated TOML failed validation")
    if dry_run:
        return {"changed": True, "server": name, "dry_run": True}
    # Check that a concurrent editor has not changed the original.
    if (config.read_bytes() if config.exists() else b"") != original:
        raise ValueError("Config changed while preparing; run again")
    backup = None
    if config.exists():
        backup = config.with_name(config.name + ".ahill-backup-" + stamp())
        atomic_write(backup, original)
    atomic_write(config, candidate)
    return {"changed": True, "server": name, "backup": str(backup) if backup else None}


def register_mcp(args):
    target = args.target.resolve()
    node = shutil.which("node")
    if not node:
        raise ValueError("Node.js is required")
    if args.kind == "premiere":
        runtime = target / "adobe" / "premiere"
        launcher = runtime / "launcher.mjs"
        if not launcher.exists():
            raise ValueError("Install the toolkit first")
        package = runtime / "node_modules" / "premiere-pro-mcp" / "package.json"
        if not package.exists():
            raise ValueError("Run npm ci --prefix <target>/adobe/premiere first")
        if json.loads(package.read_text(encoding="utf-8"))["version"] != "1.14.5":
            raise ValueError("This adapter requires premiere-pro-mcp 1.14.5")
        # The token is generated locally and stored only in the user's private
        # runtime directory. Config and distributable source contain no token.
        settings = target / "private" / "premiere.json"
        if settings.exists():
            values = json.loads(settings.read_text(encoding="utf-8"))
            if values.get("port") != args.port or len(values.get("token", "")) < 32:
                raise ValueError("Existing private settings differ; preserve the panel pairing or edit explicitly")
        entry = {"command": node, "args": [str(launcher)], "startup_timeout_sec": 30,
                 "env": {"AHILL_PREMIERE_SETTINGS": str(settings)}}
        preview = merge_mcp(args.config, "ahill_premiere", entry, dry_run=True)
        if args.dry_run:
            return preview
        if not settings.exists():
            import secrets
            atomic_write(settings, encode({"port": args.port, "token": secrets.token_hex(32)}))
        return merge_mcp(args.config, "ahill_premiere", entry)
    if not args.script or not args.script.is_file():
        raise ValueError("--script must point to the installed server entry point")
    entry = {"command": node, "args": [str(args.script.resolve())], "startup_timeout_sec": 30}
    return merge_mcp(args.config, "ahill_" + args.kind, entry, args.dry_run)


def apply_patch_bundle(bundle, destination, dry_run=False):
    bundle, destination = Path(bundle).resolve(), Path(destination).resolve()
    manifest = json.loads((bundle / "patch.json").read_text(encoding="utf-8"))
    pending = []
    for item in manifest["files"]:
        path = safe_child(destination, item["path"])
        payload = safe_child(bundle, "files/" + item["path"]).read_bytes()
        if sha(payload) != item["after_sha256"]:
            raise ValueError("Patch payload checksum mismatch: " + item["path"])
        existing = path.read_bytes() if path.exists() else None
        checksum = sha(existing) if existing is not None else None
        if checksum == item["after_sha256"]:
            continue
        if checksum != item["before_sha256"]:
            raise ValueError("Wrong version or locally edited file: " + item["path"])
        pending.append((path, payload, existing))
    if dry_run or not pending:
        return {"changed": len(pending), "dry_run": dry_run, "destination": str(destination)}
    backup = destination / (".ahill-backup-" + stamp())
    restore = []
    for path, _, old in pending:
        relative = path.relative_to(destination).as_posix()
        restore.append({"path": relative, "existed": old is not None})
        if old is not None:
            atomic_write(backup / relative, old)
    atomic_write(backup / "restore.json", encode(restore))
    applied = []
    try:
        for path, payload, old in pending:
            if (path.read_bytes() if path.exists() else None) != old:
                raise ValueError("Target changed during patch preparation")
            atomic_write(path, payload)
            applied.append((path, old))
    except Exception:
        for path, old in reversed(applied):
            if old is None:
                path.unlink(missing_ok=True)
            else:
                atomic_write(path, old)
        raise
    return {"changed": len(pending), "backup": str(backup)}


def doctor(target):
    target = Path(target)
    checks = []
    for label, names in (
        ("python", ["python", "python3"]), ("node", ["node"]),
        ("npm", ["npm.cmd", "npm"]), ("git", ["git"]), ("uv", ["uv"]),
        ("ffmpeg", ["ffmpeg"]), ("ffprobe", ["ffprobe"]),
        ("agent-browser", ["agent-browser.cmd", "agent-browser"]),
        ("agent-reach", ["agent-reach"]), ("mcporter", ["mcporter.cmd", "mcporter"]),
        ("gh", ["gh"]),
    ):
        found = next((p for n in names if (p := shutil.which(n))), None)
        checks.append({"component": label, "status": "found" if found else "missing",
                       "path": found, "host_connection": "not-tested"})
    for label, relative in (
        ("toolkit", "installation.json"),
        ("premiere-runtime", "adobe/premiere/node_modules/premiere-pro-mcp/package.json"),
        ("premiere-local-settings", "private/premiere.json"),
    ):
        checks.append({"component": label, "status": "found" if (target / relative).is_file() else "missing"})
    return {"version": VERSION, "platform": sys.platform, "checks": checks,
            "note": "Executable/file discovery only. Adobe panel pairing, accounts and live MCP calls are not tested."}


def new_project(destination):
    destination = Path(destination).resolve()
    if destination.exists() and any(destination.iterdir()):
        raise ValueError("Choose an empty project directory")
    for folder in ("01_references", "02_photoshop", "03_illustrator", "04_photos",
                   "05_aftereffects", "06_premiere", "07_audio", "08_exports", "99_checks"):
        (destination / folder).mkdir(parents=True, exist_ok=True)
    for source, name in (("AGENTS.md", "AGENTS.md"), ("handoff.json", "handoff.json"),
                         ("edit-brief.md", "EDIT-BRIEF.md")):
        atomic_write(destination / name, (ROOT / "templates" / source).read_bytes())
    return {"project": str(destination), "folders": 9}


def release_issues(root=ROOT):
    issues = []
    forbidden_parts = {"node_modules", "__pycache__", ".venv", "private", "work-memory", "backups"}
    secret_patterns = [
        re.compile(r"(?i)(?:sk-(?:proj-)?[A-Za-z0-9_-]{24,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})"),
        re.compile(r"(?i)[A-Z]:[/\\]+Users[/\\]+(?!<|\$|\{)[^/\\\s\"']+[/\\]"),
        re.compile(r"(?i)-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----"),
    ]
    for path in public_paths(root):
        rel = path.relative_to(root)
        if path.is_symlink() or any(part in forbidden_parts for part in rel.parts):
            issues.append(f"Disallowed release path: {rel}")
            continue
        if not path.is_file():
            issues.append(f"Missing release file: {rel}")
            continue
        if path.suffix.lower() in {".db", ".sqlite3", ".mp4", ".mov", ".psd", ".prproj", ".log", ".bak", ".ccx"}:
            issues.append(f"Private/binary artifact: {rel}")
        text = path.read_text(encoding="utf-8")
        if any(pattern.search(text) for pattern in secret_patterns):
            issues.append(f"Potential private path or credential: {rel}")
    return issues


def make_release(output):
    issues = release_issues()
    if issues:
        raise ValueError("\n".join(issues))
    output = Path(output).resolve()
    if output.exists():
        raise ValueError("Release output already exists; choose a new path")
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in public_paths():
            archive.write(path, "codex-creative-toolkit/" + path.relative_to(ROOT).as_posix())
    return {"archive": str(output), "files": len(public_paths()), "sha256": sha(output.read_bytes())}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    installing = sub.add_parser("install", help="Install portable code and selected user skills; no downloads")
    installing.add_argument("--profile", choices=PROFILES, default="core")
    installing.add_argument("--target", type=Path, default=default_target())
    installing.add_argument("--skills-home", type=Path, default=Path.home() / ".agents" / "skills")
    installing.add_argument("--dry-run", action="store_true")
    checking = sub.add_parser("doctor", help="Read-only local discovery; does not start Adobe or MCP")
    checking.add_argument("--target", type=Path, default=default_target())
    listing = sub.add_parser("catalog", help="Show original sources and optional install recipes")
    listing.add_argument("--group", choices=["all", "research", "adobe", "design", "development"], default="all")
    register = sub.add_parser("mcp", help="Register one installed Adobe bridge, backing up existing config")
    register.add_argument("kind", choices=["premiere", "aftereffects", "photoshop"])
    register.add_argument("--target", type=Path, default=default_target())
    register.add_argument("--config", type=Path, default=Path(os.environ.get("CODEX_HOME", Path.home() / ".codex")) / "config.toml")
    register.add_argument("--script", type=Path)
    register.add_argument("--port", type=int, choices=range(1024, 65536), default=7788, metavar="PORT")
    register.add_argument("--dry-run", action="store_true")
    patch = sub.add_parser("patch", help="Apply version/hash-checked Adobe panel fixes with backups")
    patch.add_argument("kind", choices=["premiere", "photoshop"])
    patch.add_argument("--plugin-dir", type=Path, required=True)
    patch.add_argument("--dry-run", action="store_true")
    project = sub.add_parser("new-project")
    project.add_argument("directory", type=Path)
    sub.add_parser("check-release")
    release = sub.add_parser("release")
    release.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.command == "install":
            result = install(args.target, args.skills_home, args.profile, args.dry_run)
        elif args.command == "doctor":
            result = doctor(args.target)
        elif args.command == "catalog":
            entries = json.loads((ROOT / "catalog" / "components.json").read_text(encoding="utf-8"))
            result = [x for x in entries if args.group == "all" or x["group"] == args.group]
        elif args.command == "mcp":
            result = register_mcp(args)
        elif args.command == "patch":
            result = apply_patch_bundle(ROOT / "adobe" / "patches" / args.kind, args.plugin_dir, args.dry_run)
        elif args.command == "new-project":
            result = new_project(args.directory)
        elif args.command == "release":
            result = make_release(args.output)
        else:
            issues = release_issues()
            result = {"passed": not issues, "issues": issues, "files": len(public_paths())}
            if issues:
                print(encode(result))
                return 1
        print(encode(result))
        return 0
    except (ValueError, OSError, KeyError, tomllib.TOMLDecodeError) as exc:
        print(encode({"error": str(exc)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    sys.exit(main())
