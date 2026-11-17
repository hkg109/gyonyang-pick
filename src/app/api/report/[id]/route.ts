import { failure, getReport } from "@/lib/server";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return Response.json(await getReport(request, (await params).id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
