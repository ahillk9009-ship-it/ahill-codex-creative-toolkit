# GitHub 공유

[한국어](PUBLISH.md) | [English](en/PUBLISH.md) | [README](../README.md)

## 기존 저장소에 웹으로 올리기

1. 생성한 공유용 ZIP을 별도 폴더에 풉니다.
2. GitHub에서 본인 저장소의 **Add file → Upload files**를 엽니다.
3. 압축 안의 `codex-creative-toolkit` 폴더 **내용물**을 저장소 루트에 올립니다.
4. README 변경 내용을 확인하고 커밋합니다.

ZIP 파일 하나만 올리면 첫 화면에 설치 안내가 펼쳐지지 않습니다. 코드와 문서가 루트에 보이도록 올리고, ZIP은 추가 다운로드 파일로 제공하면 됩니다.

웹 업로드에서 점으로 시작하는 `.github`, `.gitignore`, `.gitattributes`가 누락되지 않았는지 확인하세요. 정확한 파일 구성을 유지하려면 아래 Git 방식을 사용합니다.

## 기존 저장소에 Git으로 올리기

기존 README와 이력이 있는 저장소는 먼저 clone합니다. 실제 저장소 URL과 공유용 ZIP을 푼 경로로 바꿉니다.

```powershell
git clone <YOUR_REPOSITORY_URL> ahill-repo
```

공유본의 내용물을 `ahill-repo` 안으로 복사한 뒤:

```powershell
cd ahill-repo
python toolkit.py check-release
git status --short
git add CHANGELOG.md README.md README.en.md LICENSE THIRD_PARTY_NOTICES.md toolkit.py setup.ps1 release-files.json .gitignore .gitattributes .github adobe memory skills templates catalog docs tests licenses
git diff --cached --stat
git commit -m "Add portable Codex creative toolkit"
git push
```

강제 push나 기존 이력 삭제는 필요하지 않습니다. 스크립트는 원격 저장소를 만들거나 push하지 않습니다.

## 새 ZIP 생성

```powershell
python -m unittest discover -s tests -v
python toolkit.py check-release
python toolkit.py release --output dist/codex-creative-toolkit.zip
```

`release-files.json`에 나열된 파일만 ZIP에 넣습니다. 새 소스 파일을 추가했다면 목록에도 명시적으로 추가합니다. ZIP이 이미 있으면 다른 출력 이름을 사용합니다.

`check-release`는 개인 홈 절대경로, 일부 인증 토큰, 개인 키, 데이터베이스·영상 등 지정 패턴을 검사합니다. 모든 비밀이나 개인정보를 탐지하는 완전한 DLP 도구는 아닙니다. 신규 파일의 실제 내용도 검토하세요.

`.codex` 전체, 브라우저 프로필, `config.toml` 원본/백업, `private`, 기억 DB·JSON, 고객 파일, 설치된 `node_modules`를 업로드하지 않습니다.
