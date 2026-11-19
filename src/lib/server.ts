import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { CATALOG } from "./catalog";
import {
  aggregate,
  AppError,
  gradeDistribution,
  mutate,
  newAccount,
  refreshMinutes,
} from "./domain";
import type {
  Account,
  Course,
  Mutation,
  PublicStats,
  Report,
  Review,
  Snapshot,
} from "./types";

export const configured = () =>
  !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
export async function supabase() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          for (const { name, value, options } of values)
            jar.set(name, value, options);
        },
      },
    },
  );
}
export function assertLocal(request: Request) {
  if (
    process.env.VERCEL ||
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)
  )
    throw new AppError("Supabase 환경 변수를 설정한 뒤 이용해 주세요.", 503);
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // Compare against the Host header: Next dev rewrites request.url to "localhost" even when the page is on 127.0.0.1.
  if (
    !origin ||
    !URL.canParse(origin) ||
    new URL(origin).host !== request.headers.get("host")
  )
    throw new AppError("허용되지 않은 요청입니다.", 403);
}
type DemoDB = {
  accounts: Record<string, Account>;
  stats: PublicStats[];
  updatedAt: string;
};
const demoPath = path.join(process.cwd(), ".local", "demo.json");
const globals = globalThis as typeof globalThis & {
  demoQueue?: Promise<unknown>;
};
export function demoTransaction<T>(
  fn: (db: DemoDB) => T | Promise<T>,
): Promise<T> {
  // shortcut: one local Node process only; hosted deployments must use the PostgreSQL backend.
  const task = (globals.demoQueue ?? Promise.resolve()).then(async () => {
    let db: DemoDB;
    try {
      db = JSON.parse(await readFile(demoPath, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      db = { accounts: {}, stats: [], updatedAt: new Date(0).toISOString() };
    }
    const result = await fn(db);
    await mkdir(path.dirname(demoPath), { recursive: true });
    const temp = `${demoPath}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(db), "utf8");
    await rename(temp, demoPath);
    return result;
  });
  globals.demoQueue = task.catch(() => {});
  return task;
}
function refreshDemo(db: DemoDB) {
  const now = new Date();
  const minutes = refreshMinutes(now, new Date("2026-12-01T10:00:00+09:00"));
  if (now.getTime() - new Date(db.updatedAt).getTime() >= minutes * 60000) {
    db.updatedAt = now.toISOString();
    db.stats = aggregate(Object.values(db.accounts), db.updatedAt);
  }
}
export async function demoLogin(request: Request) {
  assertLocal(request);
  const jar = await cookies();
  const id = randomUUID();
  await demoTransaction((db) => {
    db.accounts[id] = newAccount(id);
  });
  jar.set("gyonyang_demo", id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: false,
  });
}
async function demoId(request: Request) {
  assertLocal(request);
  const id = (await cookies()).get("gyonyang_demo")?.value;
  if (!id || !/^[\da-f-]{36}$/.test(id))
    throw new AppError("먼저 로그인해 주세요.", 401);
  return id;
}
function publicAccount(account: Account) {
  const { receipts: _receipts, ...visible } = account;
  return visible;
}
export async function getSnapshot(request: Request): Promise<Snapshot> {
  if (!configured()) {
    const id = await demoId(request);
    return demoTransaction((db) => {
      const a = db.accounts[id];
      if (!a) throw new AppError("시연 세션이 만료됐어요.", 401);
      refreshDemo(db);
      return {
        account: publicAccount(a),
        courses: CATALOG,
        mode: "demo",
        updatedAt: db.updatedAt,
      };
    });
  }
  const client = await supabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.email_confirmed_at)
    throw new AppError("학교 이메일 인증 후 로그인해 주세요.", 401);
  const [{ data, error }, { data: rows, error: catalogError }] =
    await Promise.all([
      client.rpc("get_account"),
      client.from("offerings").select("data"),
    ]);
  if (error || catalogError)
    throw new AppError(
      "DB 설정을 확인해 주세요. 마이그레이션과 예시 데이터를 먼저 적용해야 합니다.",
      503,
    );
  return {
    account: data as Snapshot["account"],
    courses: (rows ?? []).map((row) => row.data as Course),
    mode: "supabase",
    updatedAt: data.updatedAt ?? new Date(0).toISOString(),
  };
}
export async function change(
  request: Request,
  action: Mutation,
  requestId: string,
) {
  if (!configured()) {
    const id = await demoId(request);
    await demoTransaction((db) => {
      const a = db.accounts[id];
      if (!a) throw new AppError("로그인이 필요합니다.", 401);
      if (action.type === "report") {
        const owner = Object.values(db.accounts).find((owner) =>
          owner.reviews.some((r) => r.id === action.reviewId),
        );
        const review = owner?.reviews.find((r) => r.id === action.reviewId);
        if (!review || !a.unlocked.includes(review.courseId))
          throw new AppError("신고할 강의평을 찾을 수 없습니다.", 404);
        review.hidden = true;
        db.updatedAt = new Date(0).toISOString();
      } else mutate(a, action, requestId);
    });
  } else {
    const client = await supabase();
    const { error } = await client.rpc("mutate_account", {
      p_action: action,
      p_request: requestId,
    });
    if (error)
      throw new AppError(
        error.message.includes("젤리")
          ? error.message
          : error.message.includes("지망") ||
              error.message.includes("강의평") ||
              error.message.includes("표본") ||
              error.message.includes("기본 정보")
            ? error.message
            : "요청을 처리하지 못했습니다. 새로고침 후 다시 시도해 주세요.",
        409,
      );
  }
  return getSnapshot(request);
}
export async function getStats(request: Request): Promise<PublicStats[]> {
  if (!configured()) {
    await demoId(request);
    return demoTransaction((db) => {
      refreshDemo(db);
      return db.stats;
    });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new AppError("서버용 Supabase 키를 설정해 주세요.", 503);
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await client.rpc("recommendation_stats");
  if (error) throw new AppError("추천 통계를 조회하지 못했습니다.", 503);
  return data ?? [];
}
export async function getReport(request: Request, id: string): Promise<Report> {
  const state = await getSnapshot(request);
  if (!state.account.unlocked.includes(id))
    throw new AppError("리포트 열람 권한이 없습니다.", 403);
  const course = state.courses.find((c) => c.id === id);
  if (!course) throw new AppError("강좌를 찾을 수 없습니다.", 404);
  let stats: PublicStats;
  let reviews: Review[];
  if (state.mode === "demo") {
    ({ stats, reviews } = await demoTransaction((db) => ({
      stats: db.stats.find((s) => s.courseId === id)!,
      reviews: Object.values(db.accounts).flatMap((a) =>
        a.reviews.filter((r) => r.courseId === id && !r.hidden),
      ),
    })));
  } else {
    const client = await supabase();
    const { data, error } = await client.rpc("get_report", { p_course: id });
    if (error) throw new AppError("리포트를 조회하지 못했습니다.", 503);
    stats = data.stats;
    reviews = data.reviews;
  }
  const actualRating = reviews.length
    ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
    : null;
  if (stats && stats.ranks[0] < 5) stats = { ...stats, ranks: [0, 0, 0] };
  return {
    course,
    stats: stats ?? {
      courseId: id,
      ranks: [0, 0, 0],
      sampleSize: 0,
      updatedAt: state.updatedAt,
    },
    reviews,
    rating: actualRating,
    grades: gradeDistribution(reviews),
    example: course.example,
  };
}
export function failure(error: unknown) {
  if (error instanceof AppError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  console.error(
    "Request failed",
    error instanceof Error ? error.message : "Unknown error",
  );
  return Response.json(
    { error: "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요." },
    { status: 500 },
  );
}
