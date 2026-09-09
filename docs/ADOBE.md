# Adobe 연결

[한국어](ADOBE.md) | [English](en/ADOBE.md) | [README](../README.md)

앱 설치, 패널 설치, MCP 등록, 호스트 연결, 실제 편집 성공은 각각 확인해야 합니다. 이 도구는 Adobe 구독이나 설치 파일을 제공하지 않습니다.

## Premiere Pro 1.14.5 공유 어댑터

원본: [premiere-pro-mcp](https://github.com/leancoderkavy/premiere-pro-mcp).
이 저장소의 어댑터는 **MCP 패키지 1.14.5**의 내부 API를 사용하므로 버전을 고정했습니다. Adobe 앱 버전 번호와 다릅니다.

```powershell
$toolkitRoot = Join-Path $HOME '.codex/tooling/ahill-toolkit'
python toolkit.py install --profile adobe
npm ci --prefix "$toolkitRoot/adobe/premiere" --ignore-scripts --no-audit --no-fund
```

원본 프로젝트 안내에 따라 호환되는 Premiere와 CEP/UXP 패널을 설치합니다.
다운로드한 패키지의 UXP 개발 로드 폴더는 아래와 같습니다.

```powershell
$pluginRoot = Join-Path $toolkitRoot 'adobe/premiere/node_modules/premiere-pro-mcp/uxp-plugin'
python "$toolkitRoot/toolkit.py" patch premiere --plugin-dir "$pluginRoot" --dry-run
python "$toolkitRoot/toolkit.py" patch premiere --plugin-dir "$pluginRoot"
python "$toolkitRoot/toolkit.py" mcp premiere
```

Adobe UXP Developer Tools에서 **수정한 `$pluginRoot/manifest.json`**을 등록·로드합니다. 다른 경로에 설치된 패널을 사용하는 경우에는 실제 로드하는 경로에 패치를 적용해야 합니다. 이미 수정했거나 다른 버전인 파일은 자동으로 덮어쓰지 않습니다.

MCP 등록은 `ahill_premiere` 항목을 추가합니다. 기존 `premiere-pro` 서버가 있다면 같은 도구를 이중으로 활성화하지 않도록 본인이 사용할 경로를 선택하세요. 이 명령은 기존 서버를 끄거나 바꾸지 않습니다.

첫 연결:

1. Codex를 다시 시작합니다. Premiere에서 수정한 UXP 패널을 엽니다.
2. 패널 URL은 기본 `ws://127.0.0.1:7788/uxp`입니다.
3. 본인 PC의 `$toolkitRoot/private/premiere.json`을 텍스트 편집기로 열어 생성된 token을 패널에 직접 입력합니다. 이 파일은 공유하거나 로그에 복사하지 않습니다.
4. Connect를 누르고 Codex의 연결·프로젝트 조회 도구로 실제 응답을 확인합니다.

다른 포트가 필요하면 최초 등록 시 `--port 17788`과 같이 지정하고 패널 URL도 맞춥니다. 이미 생성된 페어링 설정의 포트가 다르면 자동 변경하지 않습니다. 공유 서버는 필요할 때 숨겨진 로컬 프로세스로 시작하며, Codex 작업 하나가 끝나도 다른 작업의 연결을 유지하도록 남아 있습니다. 제거할 때는 이 설치 경로의 `service.mjs`를 실행한 프로세스인지 확인한 뒤 종료하세요.

### 공유 연결이 해결하는 것

MCP 프로세스마다 패널 포트를 따로 차지하던 문제를 하나의 인증된 loopback 서비스로 해결합니다. 여러 작업의 명령을 순서대로 전달하고, 끊어진 연결은 다시 연결합니다. 중간에 끊긴 편집 명령을 자동 재실행하지 않습니다.

다만 여러 명령으로 구성된 편집 작업 전체가 하나의 트랜잭션이 되지는 않습니다. 여러 작업이 같은 시퀀스를 동시에 편집한다면 담당 범위를 나누어야 합니다. 타임아웃이 났더라도 명령이 이미 반영됐을 수 있으므로 현재 상태를 먼저 조회하세요.

## After Effects

[after-effects-mcp](https://github.com/JUNKDOGE-JOE/after-effects-mcp)의 설치 안내로 패널을 설치합니다. 설치된 `host/stdio-shim.js`의 실제 경로를 등록합니다.

```powershell
python toolkit.py mcp aftereffects --script "<installed-ae-panel>/host/stdio-shim.js"
```

실제 경로로 `<installed-ae-panel>`을 바꿉니다. 일반적인 ae-mcp 패널은 11488 포트를 사용하며, 별도 ae-cli 패널의 8080 연결과 독립적입니다. `ae_status`에서 호스트 상태를 확인하고, JSX 실행 전에 서버가 제공하는 실행 안내를 읽습니다. 네이티브 고유 기능은 별도 지원 여부를 확인합니다.

## Photoshop Full MCP 2.0.1

[photoshop-full-mcp](https://github.com/muhwagwa0112/photoshop-full-mcp)의 릴리스 및 설치 도구를 사용합니다. 서버와 UXP 패널을 설치하고 원본 안내대로 직접 페어링합니다.

등록이 이미 끝났으면 추가 등록은 필요 없습니다. 수동 등록이 필요한 경우 원본 설치 메타데이터에서 Node 서버의 실제 진입 파일을 확인합니다.

```powershell
python toolkit.py mcp photoshop --script "<installed-runtime>/<server-entry>.js"
python toolkit.py patch photoshop --plugin-dir "<loaded-uxp-plugin-folder>" --dry-run
python toolkit.py patch photoshop --plugin-dir "<loaded-uxp-plugin-folder>"
```

꺾쇠 안 값은 본인 설치 경로로 바꿉니다. 패치는 원본 2.0.1 파일 해시가 맞을 때만 적용됩니다. `SubtleCrypto`/`TextEncoder`가 없는 UXP에서 HMAC 검증을 수행하도록 수정하며, 인증·서버 ID·페어링 검증을 유지합니다. 폴더 선택 취소 처리도 포함합니다.

Photoshop을 다시 열고 실제 호스트, 문서 상태, 레이어 생성, 미리보기 및 테스트 파일 내보내기를 확인하세요. 다른 버전에서 이 패치가 필요한지는 확인되지 않았습니다.

## 설정 보존

등록기는 `config.toml`을 TOML로 파싱하고 추가 결과를 다시 검증합니다. 기존 바이트와 주석은 유지하고 `.ahill-backup-*` 사본을 만듭니다. 같은 이름의 다른 설정이 있으면 중단합니다. MCP 설정 형식은 [OpenAI 공식 문서](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)를 따릅니다.
