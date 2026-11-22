import { AppError } from "@/lib/domain";
import { failure, requireAdmin, supabase } from "@/lib/server";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const email = new URL(request.url).searchParams.get("email")?.trim() ?? "";
    const { data, error } = await (await supabase()).rpc("admin_search_users", {
      p_email: email,
    });
    if (error)
      throw new AppError(
        error.message.includes("운영자")
          ? error.message
          : "사용자 목록을 조회하지 못했습니다.",
        error.message.includes("운영자") ? 403 : 503,
      );
    return Response.json(
      { users: data ?? [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
