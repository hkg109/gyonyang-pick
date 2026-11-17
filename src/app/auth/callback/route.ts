import { NextResponse } from "next/server";
import { configured, supabase } from "@/lib/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code && configured()) {
    const { error } = await (
      await supabase()
    ).auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(
          url.searchParams.get("next") === "/reset-password"
            ? "/reset-password"
            : "/home",
          url.origin,
        ),
      );
  }
  return NextResponse.redirect(
    new URL("/login?error=verification", url.origin),
  );
}
