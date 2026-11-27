# 관리자 모드·AI 기능 API 약속

작성일: 2026-11-22 · 화면: 한지석 · API·DB: 윤정재

관리자 모드 화면(`/admin`)과 AI 기능 화면은 프론트에 먼저 만들어 두었다. 아래 API가 생기면 바로 동작한다. API가 없으면 화면은 "API 준비 중" 안내를 보여준다.

## 1. 공통 규칙

- 모든 `/api/admin/*`는 **서버에서 운영자(`operators`)인지 확인**한다. 화면에서 버튼을 숨기는 것은 보안이 아니다. 운영자가 아니면 `403 { error }`.
- POST는 기존 API처럼 `assertOrigin`으로 같은 출처만 받는다.
- 실패하면 `{ error: string }`과 상태 코드를 돌려준다. 화면은 `error`를 그대로 보여준다.
- DB 쓰기는 기존처럼 Postgres 함수(`security definer`, `set search_path = ''`)로 하고, 함수 안에서 운영자 여부를 다시 확인한다. `authenticated`에는 운영자 확인이 들어간 함수만 실행 권한을 준다.

## 2. 강좌 관리

강좌는 지금 구조 그대로 `offerings` 테이블에 **강좌 하나당 JSON 문서(`data`)**로 저장한다. JSON 파일은 가져오기·내보내기 형식으로만 쓴다. (Vercel 서버는 실행 중 파일을 쓸 수 없다.)

| API | 요청 | 응답 |
| --- | --- | --- |
| `POST /api/admin/courses` | `{ course: Course }` | `{ course: Course }` 같은 `id`가 있으면 수정, 없으면 추가 |
| `POST /api/admin/courses/import` | `{ courses: Course[] }` | `{ added: number, updated: number }` 한 트랜잭션. 하나라도 틀리면 전부 취소하고 몇 번째가 왜 틀렸는지 `error`에 |

- `Course` 형식은 `src/lib/types.ts`가 기준이다. 서버에서 모든 필드를 검사한다: `semester` 형식(`2026-2`), `credits` 1~6, `capacity` 0 이상, `kind`는 6가지 중 하나, `meetings`의 `day` 0~4·`start < end`·9~22시, `years` 1~4, 국가 코드 2글자 대문자, `excludedDepartments`는 `DEPARTMENTS` 안의 값.
- 관리자가 넣은 강좌는 `example: false`, 예시 평가가 없으므로 `rating: null`, `grades: []`로 저장한다(서버에서 강제).
- 삭제 API는 만들지 않는다. 즐겨찾기·지망·강의평이 강좌를 가리키고 있기 때문이다. 필요하면 나중에 "숨김" 필드로 처리한다.
- 강좌 목록 조회는 기존 `GET /api/session`의 `courses`를 쓴다. 저장 후 화면이 세션을 다시 불러온다.

## 3. 젤리 조정

젤리는 지우지 않고 **조정 내역**으로만 바꾼다. 잔액 = 내역 합계 규칙을 지킨다.

| API | 요청 | 응답 |
| --- | --- | --- |
| `GET /api/admin/users?email=...` | 이메일 앞부분 검색, 최대 20명 | `{ users: [{ id, email, balance, entries: Entry[] }] }` `entries`는 최근 10개 |
| `POST /api/admin/jelly` | `{ userId, delta, reason, requestId }` | `{ user: { id, email, balance, entries } }` |

- `delta`는 0이 아닌 정수, −100~100. `reason`은 2~100자, 내역에는 `운영자 조정 · {reason}`으로 남긴다.
- 차감 후 잔액이 음수가 되면 거부한다(기존 `CHECK (balance >= 0)`).
- `requestId`는 젤리 내역의 `UNIQUE` 값으로 써서 중복 클릭을 막는다.
- 어느 운영자가 조정했는지 내역에 운영자 ID를 함께 남긴다.

## 4. Gemini API

예산이 생기기 전까지 비용은 API 키 주인이 부담한다(Google AI Studio 무료 티어 사용 가능). 키는 Vercel에 `GEMINI_API_KEY`(Type: **Secret**, `NEXT_PUBLIC_` 금지)로 넣고 서버에서만 호출한다. 기본 모델은 `gemini-4-hydrogen`(실패 시 `gemini-3.5-flash-lite` → `gemini-3.8-flash` 자동 폴백, 환경 변수 `GEMINI_MODEL`로 변경 가능)를 쓴다.

### 4.1 리포트 강의평 요약

`GET /api/report/[id]` 응답에 필드 하나를 추가한다.

```ts
summary: { text: string; reviewCount: number; updatedAt: string } | null
```

- 숨기지 않은 강의평이 **3개 이상**일 때만 만든다. 그보다 적으면 `null`.
- 강좌별로 요약을 DB(`review_summaries`)에 저장해 재사용하고, 숨기지 않은 강의평 목록이 바뀌었을 때만 다시 만든다. 리포트를 열 때마다 호출하지 않는다.
- 강의평 본문만 보내고 작성자 정보는 보내지 않는다. 강의평에 없는 내용(성공 확률 등)은 쓰지 않게 지시한다.
- Gemini 호출이 실패하면 `summary: null`로 응답하고 리포트는 그대로 보여준다.
- `Report` 타입에 `summary`를 추가하는 것은 `types.ts` 변경이라 정재가 함께 바꾼다. 화면은 이미 이 형식을 읽도록 만들어 두었다.

### 4.2 AI 지망 도우미

| API | 요청 | 응답 |
| --- | --- | --- |
| `POST /api/advice` | `{ ranks: (string \| null)[] }` 아직 저장하지 않은 1·2·3지망 후보 | `{ text: string }` 3문장 이내 |

- 로그인한 사용자만, **하루 5회**까지. 넘으면 `429 { error: "오늘은 AI 도우미를 모두 사용했어요." }`.
- 보내는 정보는 강좌 공개 정보와 이미 공개된 집계(1지망 인원 구간, 표본 수)뿐이다. 사용자 개인정보와 다른 사용자의 지망은 보내지 않는다. 표본 부족 기준(1지망 5명 미만)이면 경쟁 정도를 말하지 않게 한다.
- 젤리는 차감하지 않는다. 사용자가 버튼을 눌렀을 때만 호출한다.
- 실패하면 `503 { error }`. 화면은 "지금은 AI 도우미를 쓸 수 없어요"를 보여준다.

## 5. 화면 쪽에서 이미 된 것

- 내 정보 창: 운영자 계정(`account.admin`)에만 "관리자 모드" 버튼
- `/admin`: 강좌 관리(추가·수정 폼, JSON 가져오기·내보내기), 젤리 조정(이메일 검색, 지급·차감), 신고 검토(기존)
- 리포트: `summary`가 있으면 "AI 강의평 요약" 카드 표시
- 내 리포트: 지망을 바꾸면 "AI 지망 도우미" 상자와 "AI에게 물어보기" 버튼 표시
