# 교냥픽

가능 시간과 성향으로 교양을 추천하고, 1·2·3지망과 모의 경쟁률 리포트를 확인하는 웹서비스의 1차 구현입니다.

Next.js 16 · React 19 · TypeScript · Supabase PostgreSQL을 사용합니다. 개발 정책의 기준은 [개발 계획](docs/development-plan.md)입니다. 실제 학교 강좌·교수 정보 대신 **시연용 예시 강좌 24개**를 포함합니다.

## 로컬 실행

Node.js 24 이상을 권장합니다.

```sh
npm ci
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 **가입 없이 시연 시작하기**를 누르세요. Supabase 환경 변수가 없으면 localhost에서만 시연 모드가 켜집니다. 이메일이나 비밀번호를 입력할 필요가 없으며, 실제 메일·결제는 발생하지 않습니다.

시연 데이터는 서버의 `.local/demo.json`에 저장됩니다. 사용자별 세션은 HttpOnly 쿠키로 구분하고, 지망·젤리·보상은 서버에서 처리합니다. 브라우저를 새로고침해도 유지됩니다. 시연 서버는 하나만 실행하세요. 로컬 파일 저장 방식은 Vercel에서 사용할 수 없으며, Vercel에서는 Supabase 연결 없이는 시연 API가 열리지 않습니다.

## 구현된 흐름

1. 로그인·가입·이메일 인증·비밀번호 찾기 화면과 Supabase 인증 API
2. 홈, 가능 시간 65칸 선택, 학점·강좌 유형·과제·팀플·시간대 필터
3. 시간 충돌·학점·학년·학과·국적·e-러닝 제한을 검사하는 추천 조합
4. 과목·교수 검색과 즐겨찾기, 충전 이력에 따른 추천안 1개/최대 3개
5. 첫 지망 저장 무료, 이후 변경 시 젤리 1개 차감
6. 리포트 최초 열람 1개 차감, 재열람 무료, 지망 해제 후에도 열람 목록 유지
7. 젤리 잔액·전체 내역, 모의지원 표본 최초 제출 보상, 강의평 2개당 보상
8. 강의평 신고·임시 숨김, Supabase 운영자용 `/admin` 검토·복구 화면
9. 원본 지망·표본 중복 제거 집계, 60/30/10/5분 갱신 주기
10. 모바일 레이아웃, 팝업 포커스·ESC 닫기, 오류·빈 상태 안내

과목·교수·기본 수업 정보는 예시라고 표시합니다. 입력한 후기와 지망 집계는 예시 기본 평가와 구분합니다. 표본이 부족하면 안정·도전이라고 단정하지 않고 추천 1·2·3으로 표시합니다. 교양탐색 응답에는 경쟁률 수치를 반환하지 않습니다.

## 기본 시연 순서

```text
시연 시작 (젤리 0개)
→ 교양탐색에서 추천받기
→ 과목 2~3개 즐겨찾기
→ 내 리포트에서 1·2·3지망 선택 후 무료 저장
→ 젤리에서 모의지원 표본 제출 (+1)
→ 리포트 최초 열람 (−1)
→ 무료로 다시 보기
→ 2026-1학기 강의평 2개 작성 (+1)
→ 지망 변경 (−1)
→ 이전 리포트를 열람 목록에서 무료 재열람
```

추천안 3개를 확인할 테스트 충전은 운영자 CLI로 지급합니다. **파일 쓰기 충돌을 막기 위해 먼저 개발 서버를 종료**하세요.

```sh
# 시연 계정 ID 목록 확인
npm run demo:credit

# 해당 계정에 12개 지급 및 테스트 충전 이력 생성
npm run demo:credit -- <계정-ID> 12

npm run dev
```

5개 또는 12개만 지급할 수 있습니다. 잔액·내역이 함께 기록되고 추천안이 최대 3개로 해금됩니다. 웹 화면에서는 임의 충전 API를 제공하지 않습니다.

## Supabase 연결

1. `.env.example`을 `.env.local`로 복사하고 아래 3개 값을 설정합니다.
2. Supabase SQL Editor 또는 마이그레이션 도구에서 `supabase/migrations/202611170001_initial.sql`을 적용합니다.
3. `npm run db:seed`로 시연 강좌를 입력합니다. 실제 학교 데이터로 오인하지 마세요.
4. Auth에서 이메일 확인을 켜고 Gmail SMTP 등 커스텀 SMTP를 설정합니다.
5. Auth의 **Before User Created** 훅에 `public.before_user_created`를 연결합니다. 훅 외에도 DB 트리거가 한양 외 이메일 가입을 거부합니다.
6. Auth의 Site URL과 Redirect URLs에 `http://localhost:3000/auth/callback` 및 배포 주소의 콜백을 등록합니다. 비밀번호 재설정 콜백의 `?next=/reset-password`도 허용해야 합니다.
7. pg_cron을 활성화한 뒤 `supabase/cron.sql`을 실행합니다. 학사 일정 테이블의 시연용 수강신청 시각을 실제 일정으로 바꾸세요.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
```

service role 키는 서버의 추천용 통계 조회와 시드 스크립트에 사용합니다. `NEXT_PUBLIC_` 접두사를 붙이거나 커밋하면 안 됩니다. `.env*`, `.local/`, 백업 파일은 git에 올리지 않습니다.

가입 시 학교 이메일과 비밀번호, 학년·학과·국적·유학생 여부, 필수 동의를 받습니다. 메일의 인증 링크를 클릭하면 콜백에서 로그인됩니다. 이메일 템플릿에서 인증 코드를 제공하는 경우 가입 화면에 코드도 입력할 수 있습니다. 실제 SMTP 발송·학교 메일 도착은 해당 프로젝트를 설정한 후 검증해야 합니다.

## PostgreSQL 권한과 운영

사용자는 자기 지갑·젤리 내역·지망·열람 권한을 읽을 수 있지만 직접 쓰지 못합니다. 업무 변경은 `mutate_account` 함수에서 사용자 지갑 행을 잠그고 처리합니다. 사용자 ID는 `auth.uid()`로 결정하고, 요청 식별값·DB 제약으로 중복 차감과 중복 보상을 막습니다. 최초 저장 여부는 지망 묶음의 존재로 판단하며, 지망을 모두 비워도 행을 삭제하지 않습니다.

원시 공개 통계와 추천용 통계 함수는 일반 사용자에게 공개하지 않습니다. 리포트 본문은 `get_report`에서 열람 권한을 확인합니다. 신고된 후기 본문은 즉시 숨깁니다.

운영자 지정은 SQL Editor에서 실행합니다. 일반 사용자는 스스로 운영자가 될 수 없습니다.

```sql
insert into public.operators(user_id) values ('<운영자 auth.users ID>');
```

지정된 계정으로 로그인한 뒤 `/admin`에서 신고를 검토하고 숨김·복구합니다. 테스트 충전은 SQL Editor에서만 실행합니다.

```sql
select public.grant_test_credit('<사용자 UUID>', 12, gen_random_uuid());
```

수강신청 일정은 시연값이므로 반드시 갱신해야 합니다.

```sql
update public.registration_calendar
set starts_at = '<실제 수강신청 시작 시각 +09:00>'::timestamptz
where semester = '2026-2';

select public.refresh_public_stats(true);
select * from public.aggregation_status;
```

공개 통계는 원본에서 다시 계산하며, 저장된 지망이 있으면 같은 사용자의 표본 응답은 제외합니다. 서울 날짜로 당일·하루 전을 판단하고, 집계 실패 시 이전 결과와 오류 상태를 남깁니다. 로컬 시연은 서버가 실행 중이어도 요청이 들어올 때 주기를 검사하는 방식이며, Supabase 모드는 Cron으로 실행합니다.

## 검증

```sh
npm test
npm run typecheck
npm run build

# 개발 서버가 실행 중인 별도 터미널에서
npm run test:api
```

- Vitest: 추천·수강 제한·시간 충돌, 젤리·보상·재열람, 집계·서울 날짜 경계
- PGlite: 마이그레이션을 실제 PostgreSQL 엔진에서 실행하고 RLS·함수 실행 권한·차감·보상·열람을 검증
- API smoke: 로컬 시연 세션을 생성하고 같은 최초 열람 요청 5개를 동시에 보내 단일 차감, 보상, 지망 해제 후 재열람 등을 검증
- GitHub Actions: push/PR에서 테스트와 프로덕션 빌드 실행

PGlite 테스트는 Supabase Auth 사용자 테이블과 역할을 테스트용으로 구성합니다. 실제 Supabase의 Auth 훅·SMTP·Cron과 다중 연결 PostgreSQL 동시성까지 대신 검증하지는 않습니다. 브라우저 검증은 별도로 수행합니다.

## Vercel 배포 준비

이 저장소를 Vercel의 Next.js 프로젝트로 가져오고 위 Supabase 환경 변수를 설정하면 됩니다. 실제 외부 프로젝트 생성이나 배포는 이 1차 구현에 포함하지 않았습니다. 공개 운영 전 정식 약관·개인정보 보관·파기 절차, 데이터 사용 권한, 현재 무료 플랜 조건을 확인하세요.

## 남은 범위

실제 결제, AI 요약, 추천인 자동 보상, 교수 과거 데이터 보완, 외부 자료 자동 수집, LMS 연결은 구현하지 않았습니다. 전체 학교 카탈로그를 넣기 전에는 현재 조합 탐색 제한(최대 30강좌)을 교체하고 응답 시간을 측정해야 합니다. 실제 과목 데이터·학사 일정·수강 규칙을 확정한 뒤 공개 운영하세요.
