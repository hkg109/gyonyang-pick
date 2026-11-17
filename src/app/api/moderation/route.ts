import { AppError } from "@/lib/domain";
import {
  assertOrigin,
  configured,
  failure,
  getSnapshot,
  supabase,
} from "@/lib/server";
export async function GET(request: Request) {
  try {
    if (!configured() || !(await getSnapshot(request)).account.admin)
      throw new AppError("운영자 권한이 필요합니다.", 403);
    const { data, error } = await (await supabase()).rpc("moderation_queue");
    if (error) throw new AppError("신고 목록을 조회하지 못했습니다.", 503);
    return Response.json(
      { reviews: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    if (!configured() || !(await getSnapshot(request)).account.admin)
      throw new AppError("운영자 권한이 필요합니다.", 403);
    const { id, hidden } = await request.json();
    if (typeof hidden !== "boolean" || typeof id !== "string")
      throw new AppError("요청 형식을 확인해 주세요.");
    const { error } = await (
      await supabase()
    ).rpc("moderate_review", { p_review: id, p_hidden: hidden });
    if (error) throw new AppError("검토 결과를 저장하지 못했습니다.", 409);
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
