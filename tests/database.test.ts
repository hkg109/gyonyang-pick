import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { CATALOG } from "../src/lib/catalog";

let db: PGlite;
const user = randomUUID();
const other = randomUUID();
async function action(value: unknown, id = randomUUID()) {
  return db.query<{ result: Record<string, unknown> }>(
    "select public.mutate_account($1::jsonb,$2::uuid) as result",
    [JSON.stringify(value), id],
  );
}
async function account() {
  return (
    await db.query<{
      a: { balance: number; unlocked: string[]; version: number };
    }>("select public.get_account() a")
  ).rows[0].a;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create role supabase_auth_admin;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202611170001_initial.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202611230001_admin_and_ai.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const c of CATALOG)
    await db.query("insert into public.offerings values($1,$2)", [
      c.id,
      JSON.stringify(c),
    ]);
  const meta = JSON.stringify({
    profile: {
      year: 1,
      department: "경영학부",
      nationality: "KR",
      international: false,
    },
    terms_version: "2026-11-17",
  });
  for (const id of [user, other])
    await db.query("insert into auth.users values($1,$2,now(),$3)", [
      id,
      `${id}@hanyang.ac.kr`,
      meta,
    ]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec("set role authenticated;");
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe.sequential("PostgreSQL 업무 함수와 권한", () => {
  it("브라우저 역할은 잔액 변경·관리자 지급·통계 우회 열람을 할 수 없다", async () => {
    await expect(
      db.exec("update public.wallets set balance=999"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query("select public.grant_test_credit($1,12,$2)", [
        user,
        randomUUID(),
      ]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.exec("select public.recommendation_stats()"),
    ).rejects.toThrow(/permission denied/);
    await expect(db.exec("select * from public.public_stats")).rejects.toThrow(
      /permission denied/,
    );
    await expect(db.exec("select public.moderation_queue()")).rejects.toThrow(
      "운영자",
    );
    await expect(
      db.query("select public.moderate_review($1,false)", [randomUUID()]),
    ).rejects.toThrow("운영자");
    expect((await db.query("select * from public.wallets")).rows).toHaveLength(
      1,
    );
  });
  it("첫 지망 저장 무료·표본 한 번 지급·최초 열람 한 번 차감", async () => {
    await action({ type: "favorite", courseId: "course-1" });
    await action({ type: "favorite", courseId: "course-2" });
    await action({ type: "save", ranks: ["course-1", null, null], version: 0 });
    expect((await account()).balance).toBe(0);
    await expect(
      action({ type: "save", ranks: ["course-2", null, null], version: 1 }),
    ).rejects.toThrow("부족");
    await action({ type: "sample", ranks: ["course-1", null, null] });
    expect((await account()).balance).toBe(1);
    await expect(
      action({ type: "sample", ranks: ["course-1", null, null] }),
    ).rejects.toThrow("이미");
    const id = randomUUID();
    await action({ type: "open", courseId: "course-1" }, id);
    await action({ type: "open", courseId: "course-1" }, id);
    await action({ type: "open", courseId: "course-1" });
    expect((await account()).balance).toBe(0);
    await expect(
      action({ type: "open", courseId: "course-2" }),
    ).rejects.toThrow("지망");
  });
  it("강의평 2개 보상·중복 거부·지망 해제 뒤 무료 재열람", async () => {
    const review = {
      rating: 4,
      grade: "B+",
      assignment: 1,
      team: 0,
      exams: 2,
      attendance: ["전자출결"],
      text: "이해하기 좋은 수업이었어요.",
    };
    await action({
      type: "review",
      review: { ...review, courseId: "course-21" },
    });
    await action({
      type: "review",
      review: { ...review, courseId: "course-22" },
    });
    expect((await account()).balance).toBe(1);
    await expect(
      action({ type: "review", review: { ...review, courseId: "course-22" } }),
    ).rejects.toThrow("이미");
    await expect(
      action({ type: "review", review: { ...review, courseId: "course-3" } }),
    ).rejects.toThrow("지난 학기");
    await action({ type: "save", ranks: ["course-2", null, null], version: 1 });
    expect((await account()).balance).toBe(0);
    await action({ type: "open", courseId: "course-1" });
    expect((await account()).balance).toBe(0);
    const result = await db.query("select public.get_report('course-1')");
    expect(result.rows).toHaveLength(1);
    await expect(
      db.exec("select public.get_report('course-2')"),
    ).rejects.toThrow("권한");
    const ledger = (
      await db.query<{ total: number }>(
        "select sum(delta)::integer total from public.jelly_entries",
      )
    ).rows[0].total;
    expect(ledger).toBe((await account()).balance);
  });
  it("원본 재집계는 표본과 지망을 중복으로 세지 않는다", async () => {
    await db.exec("reset role;select public.refresh_public_stats(true);");
    const rows = (
      await db.query<{
        course_id: string;
        ranks: number[];
        sample_size: number;
      }>(
        "select * from public.public_stats where course_id in ('course-1','course-2') order by course_id",
      )
    ).rows;
    expect(rows[0].ranks).toEqual([0, 0, 0]);
    expect(rows[1].ranks).toEqual([1, 0, 0]);
    expect(
      (
        await db.query<{ error: string | null }>(
          "select error from public.aggregation_status",
        )
      ).rows[0].error,
    ).toBeNull();
    await db.exec("set role authenticated;");
  });
  it("학교 외 이메일 가입을 DB에서도 거부한다", async () => {
    await db.exec("reset role;");
    await expect(
      db.query("insert into auth.users values($1,'test@gmail.com',now(),$2)", [
        randomUUID(),
        JSON.stringify({
          profile: {
            year: 1,
            department: "경영학부",
            nationality: "KR",
            international: false,
          },
          terms_version: "2026-11-17",
        }),
      ]),
    ).rejects.toThrow("한양");
  });
  it("운영자만 신고된 후기를 검토하고 복구할 수 있다", async () => {
    await db.exec("reset role;");
    await db.query("insert into public.operators values($1)", [user]);
    const reviewId = randomUUID();
    await db.query(
      "insert into public.reviews(id,user_id,course_id,rating,grade,assignment,team,exams,attendance,text) values($1,$2,'course-1',4,'A+',0,0,2,'[\"전자출결\"]','운영자 검증을 위한 예시 후기입니다.')",
      [reviewId, other],
    );
    await db.exec("set role authenticated;");
    await action({ type: "report", reviewId });
    const queue = await db.query<{
      reviews: { id: string; hidden: boolean }[];
    }>("select public.moderation_queue() reviews");
    expect(queue.rows[0].reviews.find((r) => r.id === reviewId)?.hidden).toBe(
      true,
    );
    await db.query("select public.moderate_review($1,false)", [reviewId]);
    const result = await db.query<{ report: { reviews: { id: string }[] } }>(
      "select public.get_report('course-1') report",
    );
    expect(result.rows[0].report.reviews.some((r) => r.id === reviewId)).toBe(
      true,
    );
  });
  it("운영자 강좌 추가·일괄 가져오기·유저 검색·젤리 조정 및 AI 일일 한도", async () => {
    const newCourse = {
      ...CATALOG[0],
      id: "course-admin-1",
      code: "ADM001",
      name: "관리자 추가 강좌",
      rating: null,
      grades: [],
      example: false,
    };
    const upsert = await db.query<{ c: { id: string } }>(
      "select public.admin_upsert_course($1::jsonb) c",
      [JSON.stringify(newCourse)],
    );
    expect(upsert.rows[0].c.id).toBe("course-admin-1");

    const imported = await db.query<{ r: { added: number; updated: number } }>(
      "select public.admin_import_courses($1::jsonb) r",
      [
        JSON.stringify([
          newCourse,
          { ...newCourse, id: "course-admin-2", code: "ADM002" },
        ]),
      ],
    );
    expect(imported.rows[0].r).toEqual({ added: 1, updated: 1 });

    const searched = await db.query<{ u: { id: string; email: string }[] }>(
      "select public.admin_search_users($1) u",
      [other.slice(0, 8)],
    );
    expect(searched.rows[0].u.some((u) => u.id === other)).toBe(true);

    const reqId = randomUUID();
    const adj1 = await db.query<{
      u: { balance: number; entries: { reason: string }[] };
    }>("select public.admin_adjust_jelly($1,$2,$3,$4) u", [
      other,
      5,
      "테스트 지급",
      reqId,
    ]);
    expect(adj1.rows[0].u.balance).toBe(5);
    expect(adj1.rows[0].u.entries[0].reason).toBe("운영자 조정 · 테스트 지급");

    // 같은 requestId 재전송 시 중복 지급 방지
    const adjDup = await db.query<{ u: { balance: number } }>(
      "select public.admin_adjust_jelly($1,$2,$3,$4) u",
      [other, 5, "테스트 지급", reqId],
    );
    expect(adjDup.rows[0].u.balance).toBe(5);

    // 잔액 음수 거부
    await expect(
      db.query("select public.admin_adjust_jelly($1,$2,$3,$4)", [
        other,
        -10,
        "초과 차감",
        randomUUID(),
      ]),
    ).rejects.toThrow("음수");

    // AI 일일 5회 한도
    for (let i = 1; i <= 5; i++) {
      const q = await db.query<{ n: number }>(
        "select public.consume_ai_advice_quota() n",
      );
      expect(q.rows[0].n).toBe(i);
    }
    await expect(
      db.query("select public.consume_ai_advice_quota()"),
    ).rejects.toThrow("모두 사용");
  });
});
