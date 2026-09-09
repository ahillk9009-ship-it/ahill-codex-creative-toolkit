# 자료 조사와 브라우저

외부 도구는 원하는 것만 설치합니다. 검색 쿼리와 방문한 사이트는 해당 서비스로 전달됩니다. 로컬 작업 기억의 저장·검색과 외부 자료 조사를 구분합니다.

## Agent Reach

[원본 프로젝트](https://github.com/Panniantong/Agent-Reach)의 1.5.0 태그를 사용합니다. Python 3.12 및 [uv](https://docs.astral.sh/uv/getting-started/installation/)가 필요합니다.

```powershell
uv tool install --python 3.12 "https://github.com/Panniantong/Agent-Reach/archive/f65526cbaaad3879473acc1ba6dbefd195caf2be.zip"
agent-reach doctor --json
```

사용할 때 원본 저장소의 Agent Reach 스킬 안내를 읽고, 해당 플랫폼의 실제 읽기 요청으로 접근 가능 여부를 확인합니다. 기본 프로그램 설치는 SNS 계정 연결을 포함하지 않습니다. 원래 구축 환경에서도 여러 SNS 채널은 인증되지 않았습니다.

## agent-browser

[원본 프로젝트](https://github.com/vercel-labs/agent-browser)의 로컬 구축 버전은 0.37.1입니다.

```powershell
npm install -g agent-browser@0.37.1
agent-browser skills get core
agent-browser install
```

Windows PowerShell에서 실행 정책 문제가 있으면 `agent-browser.cmd`와 `npm.cmd`를 사용합니다. Chromium 다운로드나 브라우저 경로 문제는 해당 버전의 core 안내를 따릅니다.

```powershell
agent-browser --session ahill-demo open https://example.com
agent-browser --session ahill-demo snapshot
agent-browser --session ahill-demo close
```

클릭 전 최신 스냅샷을 읽고, 동작 뒤 결과를 다시 확인합니다. 사이트의 로그인·쿠키는 별도로 직접 설정합니다. 설치기가 기존 브라우저 프로필을 가져오지 않습니다.

## Exa 검색과 mcporter

[mcporter](https://github.com/steipete/mcporter) 0.13.10을 사용하는 예시입니다.

```powershell
npm install -g mcporter@0.13.10
mcporter --config ./templates/mcporter.example.json call exa.web_search_exa query="official video editing documentation" numResults=5
```

이 예시는 별도 설정 파일을 사용하므로 개인의 기존 mcporter 설정을 덮어쓰지 않습니다. 서비스 가용성, 사용량 제한, 추가 인증 요구는 원격 서비스 상태에 따릅니다. 실패하면 현재 작업에서 사용할 수 있는 공식 웹 검색 또는 연결 도구로 전환합니다.

## 어떤 작업에 쓰나요?

- 공개 디자인·영상 레퍼런스 수집: 링크와 날짜, 실제 본 내용, 적용하려는 요소 기록.
- 웹페이지 시각 확인: 렌더링된 화면을 읽고 판단.
- 기존 작업 재개: 자료 조사 전에 해당 프로젝트의 로컬 기억부터 확인.
- 작업 종료: 확인된 결정과 교훈만 요약해 로컬 기억에 저장.

도구 설치나 참고 페이지의 문구는 계정 변경·메시지 발송·게시 권한을 부여하지 않습니다.
