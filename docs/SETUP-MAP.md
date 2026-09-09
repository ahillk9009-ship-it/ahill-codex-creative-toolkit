# 기존 구축 환경 지도

[한국어](SETUP-MAP.md) | [English](en/SETUP-MAP.md) | [README](../README.md)

기준일: **2026-09-09**. 로컬 설치 파일, 설정의 서버 이름, 관련 설치 보고서와 작업 기억을 대조했습니다. 아래는 개인 제작 환경의 구성 요약이며, 모든 기능이 새 PC에서 즉시 연결된다는 뜻은 아닙니다.

## 구성별 정리

| 영역 | 구축한 구성 | 공유본에서 적용하는 방법 |
|---|---|---|
| 장기 작업 기억 | Mem0 OSS, FastEmbed 다국어 임베딩, embedded Qdrant, SQLite·JSON·백업 | 표준 라이브러리 기본 모드 + 선택형 의미 검색 코드 제공 |
| 자료 조사 | Agent Reach, Exa 검색, mcporter | 고정 버전 설치 레시피, 독립 설정 예시, 작업 스킬 |
| 웹 조작 | agent-browser, Playwright 계열 도구 | 브라우저 CLI 설치·사용 지침, 원본 도구 별도 설치 |
| Premiere | CEP MCP, UXP 패널, 공유 연결 및 재접속 수정 | 공유 서버 코드, npm lockfile, 패널 수정, 등록 도구 |
| After Effects | ae-mcp JSX 브리지, 별도 ae-cli·declarative 스킬 | 설치 출처·설정 등록·상태 확인 지침 |
| Photoshop | Full MCP, UXP 패널, HMAC 호환 및 폴더 취소 수정 | 원본 서버 설치 안내, 해시 확인 패치, 등록 도구 |
| 디자인 제작 | Illustrator, Lightroom Classic, Bridge, Photoshop | 제작 폴더·브리프·편집 가능한 레이어 전달 지침 |
| 영상·오디오 | Premiere, After Effects, Audition, Media Encoder, FFmpeg/ffprobe | 파일 전달 규격·오디오/영상 검증 템플릿 |
| 프런트엔드·이미지 디자인 | Taste 계열 13개 스킬, Figma, 타이포·레이아웃·모션 계열 | 원본 출처 카탈로그, 작업별 선택 지침 |
| 개발 작업 관리 | GSD 계열, Graphify, Ponytail, Superpowers, Claude Mem | 설치 목록과 출처 안내. 캐시·이전 대화·자율 실행 설정은 복제하지 않음 |
| 추가 MCP | filesystem, headroom, GVF, Serena, OpenChatCut 등 | 별도 원본 설치·계정·모델 요구사항 확인. 자동 활성화하지 않음 |
| Codex 제공 기능 | 문서·PDF·스프레드시트·발표자료·이미지·브라우저 및 Figma/Canva 등의 플러그인 | 각자의 Codex에서 제공되는 기능과 연결 상태를 확인 |

## 설치 목록과 출처

- [직접 설치된 사용자·프로젝트 스킬 목록](../catalog/installed-skills.json): 129개 경로에서 파일 존재를 확인한 스냅샷. 중복 이름이 있을 수 있으며 기능 수가 아닙니다.
- [외부 구성 카탈로그](../catalog/components.json): 원본 프로젝트, 확인된 버전, 설치 방법.
- Codex 번들 및 플러그인 캐시는 위 129개 목록에 포함하지 않았습니다. 제공 여부는 계정·플랫폼·앱 버전에 따라 달라집니다.

이 공유본의 자체 스킬은 기존 구성의 핵심 작업 원칙을 경로와 계정에 의존하지 않게 다시 정리한 것입니다. 외부 스킬 전체를 복사하거나 모두 자동 활성화하지 않습니다.

## 기존 환경에서 확인된 성과

- Premiere: 여러 MCP 클라이언트 연결, 프로젝트·트랙·시퀀스 조회.
- Photoshop: 호스트 연결, 문서·텍스트 레이어 생성, 미리보기, PSD·PNG 출력.
- 로컬 기억: 한국어 의미 검색, 수정 반영, 백업과 인덱스 재생성.
- Agent Reach/Exa: 실제 공개 검색. agent-browser: 페이지 열기와 스냅샷.
- Audition·Lightroom Classic·Bridge: 설치·실행 확인. 각 앱의 모든 자동화 기능을 검증한 것은 아님.

이전 환경의 성과와 공유 코드의 새 테스트 범위는 [VALIDATION.md](VALIDATION.md)에서 구분합니다. 고객 작업물과 과거의 개인 기록은 이 저장소에 들어 있지 않습니다.

## 권장 적용 순서

1. `core`로 작업 기억과 재개 방식을 익힙니다.
2. 자료 수집이 필요하면 `research`와 브라우저 CLI를 추가합니다.
3. Adobe를 사용하는 사람은 `adobe`와 앱별 패널 연결을 설정합니다.
4. 여러 제작 앱 사이에 파일을 전달한다면 `design`을 추가합니다.
5. GSD·Graphify·디자인 스킬 등은 실제 프로젝트에 필요한 것부터 원본 안내에 따라 추가합니다.
