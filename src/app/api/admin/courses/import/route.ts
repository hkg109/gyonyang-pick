import { AppError, normalizeAdminCourse } from "@/lib/domain";
import {
  assertOrigin,
  failure,
  requireAdmin,
  supabase,
} from "@/lib/server";
import type { Course } from "@/lib/types";

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    await requireAdmin(request);
    const body = await request.json();
    if (!Array.isArray(body?.courses) || body.courses.length === 0)
      throw new AppError("가져올 강좌 배열(courses)이 비어 있습니다.");
    if (body.courses.length > 500)
      throw new AppError("한 번에 최대 500개 강좌까지 가져올 수 있습니다.");

    const normalized: Course[] = [];
    for (let i = 0; i < body.courses.length; i++) {
      try {
        normalized.push(normalizeAdminCourse(body.courses[i]));
      } catch (e) {
        const msg =
          e instanceof AppError ? e.message : "강좌 형식이 올바르지 않습니다.";
        throw new AppError(`${i + 1}번째 강좌: ${msg}`, 400);
      }
    }

    const { data, error } = await (await supabase()).rpc(
      "admin_import_courses",
      { p_courses: normalized },
    );
    if (error)
      throw new AppError(
        error.message.includes("운영자")
          ? error.message
          : "강좌 일괄 가져오기에 실패했습니다.",
        error.message.includes("운영자") ? 403 : 400,
      );
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
