import {
  consumeDemoAdviceQuota,
  geminiConfigured,
  generateWishlistAdvice,
} from "@/lib/ai";
import { AppError } from "@/lib/domain";
import {
  assertOrigin,
  failure,
  getSnapshot,
  getStats,
  supabase,
} from "@/lib/server";
import type { Course } from "@/lib/types";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const state = await getSnapshot(request);
    const body = await request.json();
    const ranks = body?.ranks;
    if (
      !Array.isArray(ranks) ||
      ranks.length === 0 ||
      ranks.length > 3 ||
      ranks.some((id) => id !== null && typeof id !== "string")
    )
      throw new AppError("지망 후보 형식이 올바르지 않습니다.");

    const candidates: { rank: number; course: Course }[] = [];
    for (let i = 0; i < ranks.length; i++) {
      const id = ranks[i];
      if (!id) continue;
      const course = state.courses.find((c) => c.id === id);
      if (!course) throw new AppError("강좌를 찾을 수 없습니다.", 404);
      candidates.push({ rank: i + 1, course });
    }
    if (candidates.length === 0)
      throw new AppError("1개 이상의 지망 후보를 선택해 주세요.");

    if (!geminiConfigured()) {
      console.error("[api/advice] GEMINI_API_KEY is missing");
      throw new AppError("지금은 AI 도우미를 쓸 수 없어요.", 503);
    }

    if (state.mode === "supabase") {
      const { error } = await (await supabase()).rpc("consume_ai_advice_quota");
      if (error) {
        if (error.message.includes("모두 사용"))
          throw new AppError("오늘은 AI 도우미를 모두 사용했어요.", 429);
        console.error("[api/advice] quota rpc error:", error.message);
        throw new AppError("지금은 AI 도우미를 쓸 수 없어요.", 503);
      }
    } else {
      consumeDemoAdviceQuota(state.account.id);
    }

    const statsList = await getStats(request);
    const items = candidates.map(({ rank, course }) => ({
      rank,
      course,
      stats: statsList.find((s) => s.courseId === course.id),
    }));
    const text = await generateWishlistAdvice(items);
    return Response.json(
      { text },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
