import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { AppError } from "./domain";
import type { Course, PublicStats, ReportSummary, Review } from "./types";

const DEFAULT_MODEL = "gemini-3.8-flash";

export const geminiConfigured = () => !!process.env.GEMINI_API_KEY?.trim();

function serviceClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function callGemini(
  systemInstruction: string,
  userPrompt: string,
  maxOutputTokens = 512,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new AppError("지금은 AI 도우미를 쓸 수 없어요.", 503);
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const makePayload = (disableThinking: boolean) =>
    JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens,
        ...(disableThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    });

  let res: Response | null = null;
  let disableThinking = true;
  // All attempts share one budget so /api/advice (maxDuration 30 s) answers with a clean 503
  // instead of being killed by Vercel when Gemini is slow.
  const deadline = Date.now() + 20_000;
  for (let attempt = 0; attempt < 2; attempt++) {
    const left = deadline - Date.now();
    if (left < 3_000) break;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: makePayload(disableThinking),
        signal: AbortSignal.timeout(Math.min(12_000, left)),
      });
    } catch (error) {
      console.error(
        "[ai] Gemini fetch failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      if (attempt === 1)
        throw new AppError("지금은 AI 도우미를 쓸 수 없어요.", 503);
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }
    if (res.status === 400 && disableThinking && attempt === 0) {
      disableThinking = false;
      continue;
    }
    if (res.status !== 503 || attempt === 1) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!res || !res.ok) {
    const detail = res ? await res.text().catch(() => "") : "";
    console.error(
      "[ai] Gemini HTTP error:",
      res?.status ?? 0,
      detail.slice(0, 400),
    );
    throw new AppError("지금은 AI 도우미를 쓸 수 없어요.", 503);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) {
    console.error("[ai] Gemini empty response:", JSON.stringify(data).slice(0, 400));
    throw new AppError("지금은 AI 도우미를 쓸 수 없어요.", 503);
  }
  return text;
}

const aiGlobals = globalThis as typeof globalThis & {
  demoSummaryCache?: Map<string, { hash: string; summary: ReportSummary }>;
  demoAdviceUsage?: Map<string, { date: string; count: number }>;
};

export function consumeDemoAdviceQuota(userId: string) {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });
  aiGlobals.demoAdviceUsage ??= new Map();
  const prev = aiGlobals.demoAdviceUsage.get(userId);
  const next = prev && prev.date === today ? prev.count + 1 : 1;
  if (next > 5) throw new AppError("오늘은 AI 도우미를 모두 사용했어요.", 429);
  aiGlobals.demoAdviceUsage.set(userId, { date: today, count: next });
}

export async function getOrCreateReviewSummary(
  courseId: string,
  reviews: Review[],
  mode: "demo" | "supabase",
): Promise<ReportSummary | null> {
  const visible = reviews.filter((r) => !r.hidden);
  if (visible.length < 3 || !geminiConfigured()) return null;

  const hash = createHash("sha256")
    .update(
      [...visible]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((r) => `${r.id}:${r.text}`)
        .join("\n"),
    )
    .digest("hex");

  const admin = mode === "supabase" ? serviceClient() : null;

  if (admin) {
    const { data } = await admin
      .from("review_summaries")
      .select("review_hash, review_count, summary_text, updated_at")
      .eq("course_id", courseId)
      .maybeSingle();
    if (data && data.review_hash === hash) {
      return {
        text: data.summary_text,
        reviewCount: data.review_count,
        updatedAt: data.updated_at,
      };
    }
  } else {
    aiGlobals.demoSummaryCache ??= new Map();
    const cached = aiGlobals.demoSummaryCache.get(courseId);
    if (cached && cached.hash === hash) return cached.summary;
  }

  try {
    const lines = visible.map((r, i) => `${i + 1}. ${r.text}`).join("\n");
    const text = await callGemini(
      "너는 대학 교양 강좌 강의평 요약 도우미다. 제공된 강의평 본문만 바탕으로 핵심 특징(수업 분위기, 과제, 시험, 학점 등)을 한국어 2~3문장으로 간결하게 요약한다. 강의평에 없는 내용(수강신청 성공 확률, 경쟁률, 추정 등)은 절대 쓰지 않는다.",
      `다음 강의평 ${visible.length}건을 요약해 주세요:\n${lines}`,
      280,
    );
    const updatedAt = new Date().toISOString();
    const summary: ReportSummary = {
      text,
      reviewCount: visible.length,
      updatedAt,
    };
    if (admin) {
      await admin.from("review_summaries").upsert(
        {
          course_id: courseId,
          review_hash: hash,
          review_count: visible.length,
          summary_text: text,
          updated_at: updatedAt,
        },
        { onConflict: "course_id" },
      );
    } else {
      aiGlobals.demoSummaryCache?.set(courseId, { hash, summary });
    }
    return summary;
  } catch (error) {
    console.error(
      "[ai] review summary failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return null;
  }
}

const AMOUNT = ["없음", "적음", "보통", "많음"];

export async function generateWishlistAdvice(
  items: { rank: number; course: Course; stats?: PublicStats }[],
): Promise<string> {
  const lines = items.map(({ rank, course, stats }) => {
    const firstRank = stats?.ranks?.[0] ?? 0;
    const sampleSize = stats?.sampleSize ?? 0;
    const sufficient = firstRank >= 5 && course.capacity > 0;
    let competition = "표본 부족(1지망 5명 미만 — 경쟁 정도 언급 금지)";
    if (sufficient) {
      const ratio = Math.round((firstRank / course.capacity) * 100);
      const level = ratio < 100 ? "낮음" : ratio <= 300 ? "보통" : "높음";
      competition = `1지망 경쟁 구간 ${level} (표본 ${sampleSize}명)`;
    }
    return `${rank}지망: ${course.name} (${course.kind}, ${course.credits}학점, 정원 ${course.capacity}명, 과제 ${AMOUNT[course.assignment] ?? "보통"}, 팀플 ${AMOUNT[course.team] ?? "보통"}, ${competition})`;
  });

  return callGemini(
    "너는 대학 교양 수강신청 1·2·3지망 순서를 조언하는 도우미다. 제공된 강좌 정보와 공개 경쟁 구간만 바탕으로 한국어 3문장 이내로 간결하게 조언한다. 표본 부족(1지망 5명 미만)으로 표시된 강좌에 대해서는 경쟁 정도나 유불리를 절대 추측하거나 말하지 않는다. 확정적인 합격·실패 표현은 피한다.",
    `현재 고민 중인 지망 후보입니다:\n${lines.join("\n")}\n\n이 지망 구성에 대해 3문장 이내로 조언해 주세요.`,
    260,
  );
}
