# Ahill Codex Creative Toolkit

**[한국어](README.md) | [English](README.en.md)**

**작업 기억·Adobe 연동·스킬 재사용을 위한 Codex 영상·디자인 제작 환경.**

개인 Windows 제작 환경에서 사용한 구성을 다른 사람이 자기 PC에 적용할 수 있도록 정리했습니다. 코드와 작업 지침을 설치하고, 필요한 외부 도구를 선택해 연결할 수 있습니다.

> 한국어·영어 안내 · Windows 우선 · Python 3.11+ · 핵심 기능은 API 키 없이 실행

**v0.1.2:** 설치 중단 후 재시도, 사용자 지정 설치 경로 인식, Premiere 조회·대기 분리와 취소 소유권 검사를 개선했습니다. 편집 응답이 타임아웃되면 실제 완료가 확인될 때까지 후속 편집을 막습니다. [변경 이력](CHANGELOG.md) · [기존 설치 업데이트](docs/QUICKSTART.md#기존-설치-업데이트)

## 무엇이 들어 있나요?

| 구성 | 제공하는 것 |
|---|---|
| 설치 도구 | 경로 자동 설정, 5가지 설치 프로필, 재설치 충돌 확인 |
| 작업 기억 | SQLite·JSON 저장, 한국어 키워드 검색, 수정 이력·백업, 선택형 Mem0 의미 검색 |
| Premiere Pro | UXP 연결 공유, 편집 직렬화, 조회·대기 분리, 불확실한 편집 완료 상태 보호 |
| Photoshop | UXP 암호 API 호환 문제 및 폴더 선택 취소 오류 수정 |
| Adobe 연결 등록 | Premiere·After Effects·Photoshop용 Codex 설정 추가와 원본 설정 백업 |
| 재사용 스킬 4개 | 작업 기억, 조사·브라우저, Adobe 편집, 디자인·오디오 전달 |
| 제작 템플릿 | 프로젝트 폴더 9개, 제작 브리프, 앱 간 전달 규격, AGENTS.md |
| 외부 구성 지도 | Agent Reach·agent-browser·Exa·디자인 스킬·GSD 등 출처와 적용 방법 |
| 배포 도구 | 공개 파일 목록으로 ZIP 생성, 기본 유출 패턴 검사, GitHub Actions 테스트 |

Codex나 Adobe 자체, 구독, 계정 연결, 고객 미디어는 포함하지 않습니다.
이 저장소는 독립 프로젝트이며 OpenAI·Adobe의 공식 제품이 아닙니다.

## 빠른 시작

1. [Python 3.11 이상](https://www.python.org/downloads/)을 설치합니다.
2. 이 저장소에서 **Code → Download ZIP**을 눌러 압축을 풉니다.
3. 압축을 푼 폴더에서 PowerShell을 열어 실행합니다.

```powershell
python toolkit.py install --profile full
python toolkit.py doctor
```

또는 PowerShell 설치 도구를 사용할 수 있습니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1 -Profile full
```

설치 위치는 기본적으로 `~/.codex/tooling/ahill-toolkit`, 스킬 위치는 `~/.agents/skills`입니다. `CODEX_HOME`을 지정했다면 코드 설치 위치도 그 아래로 바뀝니다. 기존 작업 지침, 모델 설정, MCP 설정은 기본 설치 단계에서 변경하지 않습니다.

**`full`은 제공하는 스킬 4개를 설치합니다. 외부 프로그램을 전부 다운로드하거나 로그인하는 명령은 아닙니다.** Adobe와 브라우저 도구는 아래 안내로 연결합니다.

## 필요한 구성만 선택

| 프로필 | 활성화할 스킬 |
|---|---|
| `core` | 로컬 작업 기억 |
| `research` | 기억 + 조사·브라우저 |
| `adobe` | 기억 + Adobe 편집 |
| `design` | 기억 + 디자인·오디오 전달 |
| `full` | 위 스킬 4개 전부 |

설치 예정 내용만 확인하려면 `--dry-run`을 붙입니다. 설치 경로는 `--target`, 스킬 경로는 `--skills-home`으로 지정합니다. 모든 프로필은 재사용 코드와 문서를 함께 복사하며, 프로필은 활성화할 스킬을 고릅니다.

```powershell
python toolkit.py install --profile core --dry-run
python toolkit.py new-project .\my-video
python toolkit.py catalog --group adobe
```

## 설치 후 Codex에 이렇게 요청하세요

> “ahill-work-memory를 사용해서 이 프로젝트의 이전 결정부터 확인하고 작업을 이어 줘.”

> “ahill-adobe-editing을 사용해서 Premiere 연결을 확인하고, 원본을 보존하면서 편집본과 검토 영상을 만들어 줘.”

> “ahill-creative-handoff를 사용해서 Photoshop → After Effects → Premiere 전달 규격과 편집 가능한 원본을 정리해 줘.”

## 자세한 안내

- [빠른 설치와 사용](docs/QUICKSTART.md)
- [기존 구축 환경 전체 지도](docs/SETUP-MAP.md)
- [로컬 기억 / 선택형 Mem0](docs/MEMORY.md)
- [Premiere·After Effects·Photoshop 연결](docs/ADOBE.md)
- [Agent Reach·agent-browser·Exa](docs/RESEARCH.md)
- [GitHub 공유 방법](docs/PUBLISH.md)
- [테스트 범위와 남은 수동 검증](docs/VALIDATION.md)

## 개발 및 검증

```powershell
python -m unittest discover -s tests -v
npm ci --prefix adobe/premiere --ignore-scripts --no-audit --no-fund
npm test --prefix adobe/premiere
python toolkit.py check-release
python toolkit.py release --output dist/codex-creative-toolkit.zip
```

Node.js 20.19+가 필요합니다. CI는 Windows와 Ubuntu 테스트를 실행하도록 구성했습니다. Adobe 앱 내부의 실제 편집 검증은 각자의 설치 환경에서 수행해야 합니다.

## 라이선스와 출처

자체 코드와 지침은 [MIT](LICENSE)입니다. 수정한 외부 코드의 저작권과 라이선스는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 보존했습니다. 외부 스킬·서비스는 각 프로젝트의 라이선스와 이용 조건을 따릅니다.
