import { cookies } from "next/headers";
import { AppError, isSchoolEmail, validateProfile } from "@/lib/domain";
import {
  assertOrigin,
  configured,
  demoLogin,
  failure,
  supabase,
} from "@/lib/server";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const body = await request.json();
    if (body.type === "demo" && !configured()) {
      await demoLogin(request);
      return Response.json({ ok: true });
    }
    if (body.type === "logout") {
      if (configured()) await (await supabase()).auth.signOut();
      (await cookies()).delete("gyonyang_demo");
      return Response.json({ ok: true });
    }
    if (!configured())
      throw new AppError(
        "현재는 로컬 시연 모드입니다. 실제 메일 인증은 Supabase 연결 후 사용할 수 있어요.",
        503,
      );
    const client = await supabase();
    if (body.type === "password") {
      if (typeof body.password !== "string" || body.password.length < 8)
        throw new AppError("비밀번호는 8자 이상 입력해 주세요.");
      const { error } = await client.auth.updateUser({
        password: body.password,
      });
      if (error) throw new AppError("비밀번호를 변경하지 못했습니다.");
    } else {
      if (typeof body.email !== "string" || !isSchoolEmail(body.email))
        throw new AppError("한양 이메일(@hanyang.ac.kr)을 입력해 주세요.");
      let result;
      switch (body.type) {
        case "signup":
          validateProfile(body.profile);
          if (
            body.terms !== true ||
            typeof body.password !== "string" ||
            body.password.length < 8
          )
            throw new AppError(
              "필수 약관에 동의하고 비밀번호를 8자 이상 입력해 주세요.",
            );
          result = await client.auth.signUp({
            email: body.email,
            password: body.password,
            options: {
              data: {
                profile: body.profile,
                consent_at: new Date().toISOString(),
                terms_version: "2026-11-17",
                marketing: body.marketing === true,
              },
              emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
            },
          });
          break;
        case "signin":
          result = await client.auth.signInWithPassword({
            email: body.email,
            password: body.password,
          });
          break;
        case "verify":
          if (!/^\d{6,10}$/.test(body.token))
            throw new AppError("메일의 인증 코드를 확인해 주세요.");
          result = await client.auth.verifyOtp({
            email: body.email,
            token: body.token,
            type: "signup",
          });
          break;
        case "reset":
          result = await client.auth.resetPasswordForEmail(body.email, {
            redirectTo: `${new URL(request.url).origin}/auth/callback?next=/reset-password`,
          });
          break;
        default:
          throw new AppError("지원하지 않는 인증 요청입니다.");
      }
      if (result?.error)
        throw new AppError(
          body.type === "signin"
            ? "이메일·비밀번호 또는 메일 인증 여부를 확인해 주세요."
            : "인증 요청에 실패했습니다. 입력값과 메일 발송 설정을 확인해 주세요.",
        );
    }
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
