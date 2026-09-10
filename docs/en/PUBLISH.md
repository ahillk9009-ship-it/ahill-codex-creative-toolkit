# Sharing on GitHub

[한국어](../PUBLISH.md) | [English](PUBLISH.md) | [README](../../README.en.md)

## Upload through GitHub

1. Extract the generated release ZIP into a separate directory.
2. Open your repository and choose **Add file → Upload files**.
3. Upload the **contents** of the extracted `codex-creative-toolkit` directory into the repository root.
4. Review the README change and commit.

Uploading only the ZIP will not display the setup guide on the repository homepage. Keep code and documentation at the root; you may offer the ZIP as an additional download.

Ensure dotfiles such as `.github`, `.gitignore` and `.gitattributes` are included. Use Git when you need to preserve the exact file layout reliably.

## Update an existing repository with Git

Clone the repository first to preserve its history. Replace the placeholder URL with your repository:

```powershell
git clone <YOUR_REPOSITORY_URL> ahill-repo
```

Copy the release contents into `ahill-repo`, then:

```powershell
cd ahill-repo
python toolkit.py check-release
git status --short
git add CHANGELOG.md README.md README.en.md LICENSE THIRD_PARTY_NOTICES.md toolkit.py setup.ps1 release-files.json .gitignore .gitattributes .github adobe memory skills templates catalog docs tests licenses
git diff --cached --stat
git commit -m "Add portable Codex creative toolkit"
git push
```

No force push or history deletion is needed. The toolkit itself does not create remote repositories or push changes.

## Build a release ZIP

```powershell
python -m unittest discover -s tests -v
python toolkit.py check-release
python toolkit.py release --output dist/codex-creative-toolkit.zip
```

Only paths listed in `release-files.json` enter the ZIP. Add new public source files explicitly to that list. If the output file exists, choose another output name.

`check-release` checks selected patterns for personal absolute paths, credentials, private keys, databases and media. It is not a complete data-loss-prevention system; review new file contents yourself.

Do not upload your full `.codex` directory, browser profiles, original `config.toml` or its backups, `private` directory, memory database/export, customer files or installed `node_modules`.
