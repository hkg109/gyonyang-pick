import { AppError, normalizeAdminCourse } from "@/lib/domain";
import {
  assertOrigin,
  failure,
  requireAdmin,
  supabase,
} from "@/lib/server";

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    await requireAdmin(request);
    const body = await request.json();
    const course = normalizeAdminCourse(body?.course);
    const { data, error } = await (await supabase()).rpc(
      "admin_upsert_course",
      { p_course: course },
    );
    if (error)
      throw new AppError(
        error.message.includes("운영자")
          ? error.message
          : "강좌를 저장하지 못했습니다.",
        error.message.includes("운영자") ? 403 : 400,
      );
    return Response.json(
      { course: data ?? course },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
