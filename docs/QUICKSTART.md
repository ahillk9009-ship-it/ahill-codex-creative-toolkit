# 설치와 첫 사용

[한국어](QUICKSTART.md) | [English](en/QUICKSTART.md) | [README](../README.md)

## 준비

- 핵심 기능: Python 3.11 이상. Windows 예시는 `python`, Linux/macOS는 필요하면 `python3`를 사용합니다.
- Premiere 어댑터: Node.js 20.19 이상, 별도로 설치한 호환 Premiere와 CEP/UXP 패널.
- 의미 검색: Python 3.12 가상환경 권장. 최초 의존성·모델 다운로드가 필요합니다.
- Codex와 Adobe의 설치·로그인은 각자의 계정을 사용합니다.

## 설치

저장소 압축을 푼 폴더에서 실행합니다.

```powershell
python toolkit.py install --profile full
python toolkit.py doctor
```

설치기는 계정별 홈 경로를 계산합니다. 기존 설치를 다시 실행하면 동일한 파일은 유지합니다. 사용자가 수정한 파일과 충돌하면 덮어쓰기 전에 중단합니다. 새 프로필을 추가하면 이전에 설치한 스킬도 유지합니다.

0.1.2는 파일 복사 전에 설치 진행 기록을 저장합니다. 파일 쓰기 오류나 중단이 발생하면 같은 설치 명령을 다시 실행해 이어갈 수 있습니다. 중단 뒤 사용자가 따로 수정한 파일은 덮어쓰지 않습니다. 0.1.0에서 이미 실패해 진행 기록이 없는 폴더는 자동으로 인수하지 않습니다.

```powershell
# 사용자 지정 위치 예시
python toolkit.py install --profile adobe --target "$HOME/Tools/ahill-toolkit" --skills-home "$HOME/.agents/skills"
```

원본 저장소 내부나 기존 다른 프로그램이 든 디렉터리를 설치 대상으로 지정하지 마세요. 이후 안내의 `$toolkitRoot`도 직접 지정한 위치에 맞추면 됩니다. 설치된 `toolkit.py`의 `doctor`·`mcp` 명령은 검증된 설치 기록으로 자기 폴더를 인식합니다. 명시적인 `--target`은 항상 우선합니다. 소스 폴더에서 실행할 때에는 대상 경로를 명시하세요.

```powershell
$codexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' }
$toolkitRoot = Join-Path $codexRoot 'tooling/ahill-toolkit' # 직접 설치한 경로가 있으면 변경
python "$toolkitRoot/memory/memory.py" save --project my-video --key subtitle-style --text "자막은 흰색 글자와 검은 외곽선" --source "사용자 요청, 작성일"
python "$toolkitRoot/memory/memory.py" search "자막" --project my-video
python "$toolkitRoot/toolkit.py" new-project .\my-video
```

기억 저장 위치는 기본 `~/.codex/ahill-work-memory`입니다. `CODEX_WORK_MEMORY_DIR`로 변경할 수 있습니다. 예전 개인 환경의 기억을 자동으로 가져오지 않습니다.

Codex에서 스킬이 보이지 않으면 앱을 다시 시작하고 `ahill-work-memory`를 호출합니다. 공식 문서의 [로컬 스킬 검색 위치](https://learn.chatgpt.com/docs/build-skills)를 따라 사용자 스킬 폴더에 설치합니다.

## 연결과 진단

`doctor`는 실행 파일과 설치 파일의 존재만 점검합니다. `found`는 Adobe 호스트 연결, SNS 로그인 또는 특정 편집 작업 성공을 의미하지 않습니다.

- Adobe는 [ADOBE.md](ADOBE.md)의 패널 설치 → 설정 등록 → 연결 점검을 진행합니다.
- 검색·브라우저는 [RESEARCH.md](RESEARCH.md)의 원하는 도구만 설치합니다.
- 의미가 비슷한 한국어 표현까지 찾으려면 [MEMORY.md](MEMORY.md)의 의미 검색을 활성화합니다.

## 기존 설치 업데이트

최신 ZIP을 기존 설치 폴더 밖에 풀고 **새 소스 폴더에서** 실행합니다. 기존의 `installation.json`은 유지합니다.

```powershell
$codexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' }
$toolkitRoot = Join-Path $codexRoot 'tooling/ahill-toolkit' # 기존 사용자 지정 설치 경로가 있으면 변경
$skillsHome = Join-Path $HOME '.agents/skills' # installation.json의 skills_home이 다르면 변경
python toolkit.py install --profile full --target "$toolkitRoot" --skills-home "$skillsHome" --dry-run
python toolkit.py install --profile full --target "$toolkitRoot" --skills-home "$skillsHome"
python "$toolkitRoot/toolkit.py" doctor --target "$toolkitRoot"
```

`$skillsHome`의 기본값은 `$HOME/.agents/skills`이며, 기존 사용자 지정 위치가 있으면 그 경로를 사용합니다. `full`은 스킬 4개를 활성화하므로 기존 구성만 유지하려면 원래 프로필을 지정하세요. 기존 기억·페어링 토큰·MCP 설정을 다시 만들 필요가 없습니다. 사용자 수정 충돌이 표시되면 파일을 삭제하지 말고 차이를 병합합니다.

이번 변경은 Adobe 패널 payload나 npm 의존성 버전을 바꾸지 않았습니다. 이미 설치·패치된 1.14.5 환경에 `npm ci`를 다시 실행하면 node_modules 안의 패널 패치가 사라질 수 있으므로 불필요하게 실행하지 마세요. 재설치했다면 패널 패치를 다시 적용합니다. 업데이트 후에는 Premiere를 종료하고 해당 설치의 공유 서비스도 재시작해야 새 코드를 사용합니다. [복구 절차](ADOBE.md#타임아웃과-취소-v012)를 확인하세요.

0.1.1 전용 `APPLY.cmd`는 해당 자료의 고정 payload만 적용합니다. 최신 0.1.2 위에 실행하는 업데이트 도구로 사용하지 마세요.

## 제거·복원

설치 경로의 `installation.json`에서 이 설치가 만든 스킬과 파일을 확인할 수 있습니다. 앱을 닫고 해당 `ahill-*` 스킬 폴더 및 전용 설치 폴더를 삭제하면 코드를 제거할 수 있습니다. 기억 저장소는 별도 경로이므로 계속 남습니다.

MCP 설정을 등록했다면 `config.toml`에서 본인이 추가한 `ahill_*` 테이블을 제거합니다. 전체 설정 백업을 복원할 때는 그 뒤에 추가한 다른 설정이 있는지 먼저 비교하세요. Adobe 패치는 적용 폴더의 `.ahill-backup-*/restore.json`에 원래 있던 파일과 새로 추가한 파일을 기록합니다. 원본 파일은 백업으로 복원하고, 새로 추가된 파일은 해당 목록을 확인해 제거합니다.
