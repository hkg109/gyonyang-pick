import { AppError } from "@/lib/domain";
import {
  assertOrigin,
  failure,
  requireAdmin,
  supabase,
} from "@/lib/server";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    await requireAdmin(request);
    const body = await request.json();
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const delta = body?.delta;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    const requestId = typeof body?.requestId === "string" ? body.requestId : "";

    if (!UUID.test(userId))
      throw new AppError("사용자 ID 형식이 올바르지 않습니다.");
    if (
      typeof delta !== "number" ||
      !Number.isInteger(delta) ||
      delta === 0 ||
      delta < -100 ||
      delta > 100
    )
      throw new AppError("조정 수량은 0이 아닌 -100~100 사이의 정수여야 합니다.");
    if (reason.length < 2 || reason.length > 100)
      throw new AppError("조정 사유는 2~100자로 입력해 주세요.");
    if (!UUID.test(requestId))
      throw new AppError("요청 번호(requestId) 형식이 올바르지 않습니다.");

    const { data, error } = await (await supabase()).rpc("admin_adjust_jelly", {
      p_user: userId,
      p_delta: delta,
      p_reason: reason,
      p_request: requestId,
    });
    if (error) {
      const msg = error.message;
      const status = msg.includes("운영자")
        ? 403
        : msg.includes("음수") || msg.includes("찾을 수 없")
          ? 400
          : 409;
      throw new AppError(
        msg.includes("운영자") ||
          msg.includes("음수") ||
          msg.includes("조정") ||
          msg.includes("사용자")
          ? msg
          : "젤리를 조정하지 못했습니다.",
        status,
      );
    }
    return Response.json(
      { user: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
