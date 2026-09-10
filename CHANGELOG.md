# Changelog / 변경 이력

## 0.1.2 — 2026-09-10

### 한국어

- 제공된 0.1.1 수정 자료의 설치 중단 재시도, Premiere 조회·대기 분리, 기존 토큰 형식 검사를 반영했습니다.
- 응답을 받지 못한 편집이 있으면 후속 편집을 차단하고, 동일 패널·요청의 확정 결과가 도착했을 때 해제합니다. 단순 재접속이나 취소 접수는 해제 조건이 아닙니다.
- 취소 요청을 편집 큐에서 분리하고 해당 작업을 시작한 MCP 연결만 취소할 수 있도록 했습니다. 실제 호스트의 취소 지원 범위를 유지합니다.
- 사용자 지정 폴더에 설치한 실행기가 자기 설치 위치를 인식합니다. 명시적인 `--target`이 우선하며, 소스에서 실행할 때에는 대상 폴더를 지정합니다.
- 한국어·영어 설치, 업데이트, 오류 복구, 검증 안내를 갱신했습니다.
- 자동 검사: Python 28개, Node 22개. 실제 Adobe 앱 내부의 편집·저장·출력은 별도 검증이 필요합니다.

### English

- Integrates resumable installation, independent Premiere observations/waits and strict existing-token validation from the supplied 0.1.1 fix material.
- Fences later edits after an unconfirmed dispatch. Only a terminal result for the exact request on the same panel connection releases that fence; reconnecting or accepting cancellation does not.
- Routes cancellation outside the edit queue and checks that the requesting MCP connection owns the operation. Preserves the host's cancellation limitations.
- Installed launchers recognize their custom installation directory. Explicit `--target` overrides it; source checkouts still require the intended target.
- Updates Korean and English installation, upgrade, recovery and validation guides.
- Automated coverage: 28 Python and 22 Node tests. Actual Adobe editing, saving and rendering still require host testing.

## 0.1.0 — 2026-09-09

Initial public toolkit with four reusable skills, local memory, Adobe adapters/patches, Korean/English guides and 39 automated tests.

로컬 기억, Adobe 어댑터·패치, 스킬 4개, 한국어·영어 안내와 자동 검사 39개를 포함한 최초 공개본입니다. 0.1.1은 별도로 제공된 수정 자료이며 이 저장소의 공개 릴리스로 배포하지 않았습니다.
