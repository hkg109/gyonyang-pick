import { AppError, validateProfile, validateReview } from "@/lib/domain";
import { assertOrigin, change, failure, getSnapshot } from "@/lib/server";
import type { Mutation } from "@/lib/types";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    if (Number(request.headers.get("content-length")) > 12000)
      throw new AppError("요청이 너무 큽니다.", 413);
    const { action, requestId } = (await request.json()) as {
      action: Mutation;
      requestId: string;
    };
    if (
      !action ||
      ![
        "favorite",
        "save",
        "sample",
        "open",
        "review",
        "report",
        "profile",
      ].includes(action.type) ||
      !/^[-\da-f]{36}$/.test(requestId)
    )
      throw new AppError("요청 형식이 올바르지 않습니다.");
    if (action.type === "profile") validateProfile(action.profile);
    if (action.type === "review")
      validateReview(action, (await getSnapshot(request)).courses);
    return Response.json(await change(request, action, requestId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
