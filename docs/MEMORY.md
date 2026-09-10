# 로컬 작업 기억

[한국어](MEMORY.md) | [English](en/MEMORY.md) | [README](../README.md)

## 기본 모드

기본 모드는 Python 표준 라이브러리만 사용합니다. 키워드 검색, 프로젝트 구분, JSON 내보내기, 수정 이력, SQLite 백업이 작동합니다. API 키나 모델 다운로드가 필요하지 않습니다.

```powershell
$codexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' }
$toolkitRoot = Join-Path $codexRoot 'tooling/ahill-toolkit'
python "$toolkitRoot/memory/memory.py" save --project demo --key subtitle --text "자막은 노란색" --source "본인 결정과 날짜"
python "$toolkitRoot/memory/memory.py" search "자막" --project demo
python "$toolkitRoot/memory/memory.py" list --project demo
python "$toolkitRoot/memory/memory.py" status
python "$toolkitRoot/memory/memory.py" backup
python "$toolkitRoot/memory/memory.py" export
```

- 기본 저장소: `~/.codex/ahill-work-memory`. 변경: `CODEX_WORK_MEMORY_DIR`.
- 정본: `records.sqlite3`. 읽기 쉬운 사본: `memories.json`.
- 동일 `project`와 `key`로 수정하면 이전 내용이 history에 남습니다.
- 변경 직전에 SQLite 백업을 만듭니다. 동일한 내용의 중복 저장은 생략합니다.
- 프로젝트 검색에는 해당 프로젝트와 `global`만 포함됩니다.
- 기본 모드의 `lexical-fallback`과 “Semantic index disabled”는 정상입니다. 의미 검색이 꺼졌다는 뜻입니다.
- `status`의 pending은 선택형 의미 검색 인덱스에 아직 반영하지 않은 수입니다. 저장 실패 수가 아닙니다.
- 긴 원문 대신 최대 4,000자의 검증된 요약과 출처를 저장합니다.
- 로컬 저장소는 별도의 암호화 저장소가 아닙니다. OS 계정 권한을 따릅니다.

## 선택: Mem0 의미 검색

로컬 구축 환경에서 사용한 Mem0 + FastEmbed + embedded Qdrant 구성을 제공합니다. 추론은 끄고 사람이 확인한 내용을 저장합니다. 클라우드 Mem0나 Ollama 서버가 필요하지 않습니다.

Python 3.12와 인터넷을 사용할 수 있는 환경에서 **본인이 실행하는 준비 단계**:

```powershell
$codexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' }
$toolkitRoot = Join-Path $codexRoot 'tooling/ahill-toolkit'
py -3.12 -m venv "$toolkitRoot/memory/.venv"
$memoryPython = Join-Path $toolkitRoot 'memory/.venv/Scripts/python.exe'
& $memoryPython -m pip install -r "$toolkitRoot/memory/requirements-semantic.txt"
& $memoryPython "$toolkitRoot/memory/prepare_model.py"
```

Linux/macOS의 가상환경 Python은 `memory/.venv/bin/python`입니다.

준비가 끝난 뒤, 사용하는 셸 또는 Codex 실행 환경에서 활성화합니다.

```powershell
$env:AHILL_MEMORY_SEMANTIC = '1'
& $memoryPython "$toolkitRoot/memory/memory.py" sync
& $memoryPython "$toolkitRoot/memory/memory.py" search "캡션 글씨 색상" --project demo
```

해당 환경변수는 위 PowerShell 세션에만 적용됩니다. 이미 실행 중인 Codex에 자동 반영되지 않습니다. Codex에서 의미 검색을 쓰려면 가상환경 Python과 환경변수를 명시해 실행하도록 요청하거나 그 환경으로 Codex를 시작합니다.

모델은 `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, 캐시는 `~/.cache/ahill-memory-models`입니다. `AHILL_MEMORY_MODEL_CACHE`로 위치를 바꿀 수 있습니다. 실행 중에는 로컬 모델만 허용하고 telemetry를 끕니다. 다운로드는 `prepare_model.py`에서만 수행합니다. 모델 캐시가 없거나 의존성이 호환되지 않으면 키워드 검색으로 내려가며 원본 저장은 유지됩니다.

의미 검색 상태에서는 저장 후 `sync`를 실행합니다. `reindex`는 기존 벡터 폴더를 보관하고 SQLite 정본에서 다시 만듭니다.

```powershell
& $memoryPython "$toolkitRoot/memory/memory.py" reindex
```

`sync` 실패는 인덱스 실패이며 앞서 완료된 `save`를 취소하지 않습니다.
`mem0`라는 별도 hosted CLI는 이 저장소의 인터페이스가 아닙니다.

## 기록 원칙

과거 기록은 현재 지시보다 우선하지 않습니다. 기억에는 사실·선호·결정과 확인한 출처를 구분해 남깁니다. API 키, 비밀번호, 전체 채팅, 고객 원본 파일을 저장하지 않습니다. 백업은 같은 디스크에 있으므로 디스크 고장까지 대비하려면 본인이 별도 백업 위치를 관리해야 합니다.
