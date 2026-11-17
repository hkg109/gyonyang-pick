import { configured, failure, getSnapshot } from "@/lib/server";
import { AppError } from "@/lib/domain";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    return Response.json(await getSnapshot(request), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AppError && error.status === 401)
      return Response.json(
        { account: null, mode: configured() ? "supabase" : "demo" },
        { headers: { "Cache-Control": "no-store" } },
      );
    return failure(error);
  }
}
