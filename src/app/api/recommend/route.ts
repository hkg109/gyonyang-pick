import { AppError } from "@/lib/domain";
import { assertOrigin, failure, getSnapshot, getStats } from "@/lib/server";
import { recommend } from "@/lib/recommend";
import type { Filters } from "@/lib/types";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const filters = (await request.json()) as Filters;
    if (
      !Array.isArray(filters.available) ||
      filters.available.length > 65 ||
      filters.available.some(
        (k) => typeof k !== "string" || !/^([0-4])-(9|1\d|2[01])$/.test(k),
      ) ||
      !Number.isInteger(filters.min) ||
      !Number.isInteger(filters.max) ||
      filters.min < 1 ||
      filters.max > 12 ||
      filters.min > filters.max ||
      !Array.isArray(filters.kinds) ||
      !filters.kinds.length ||
      filters.kinds.some((k) => !["대면", "SMART", "e-러닝"].includes(k)) ||
      ![0, 1, 2, 3].includes(filters.assignment) ||
      ![0, 1, 2, 3].includes(filters.team) ||
      !["am", "pm", "any"].includes(filters.time)
    )
      throw new AppError("추천 조건을 확인해 주세요.");
    const state = await getSnapshot(request);
    return Response.json(
      {
        plans: recommend(
          state.courses,
          filters,
          state.account.profile,
          state.account.paid,
          await getStats(request),
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
