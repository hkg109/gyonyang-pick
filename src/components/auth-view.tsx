"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/types";
import { Paw, ProfileFields } from "./shared";

export default function AuthView({
  path,
  mode,
  busy,
  onAuth,
  onRequest,
  onTerms,
  notify,
}: {
  path: string;
  mode: string;
  busy: boolean;
  onAuth: (body: unknown, destination?: string) => Promise<unknown>;
  onRequest: (body: unknown) => Promise<unknown>;
  onTerms: (t: string) => void;
  notify: (t: string, error?: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    year: 1,
    department: "경영학부",
    nationality: "KR",
    international: false,
  });
  const signup = path === "/signup";
  const reset = path === "/forgot-password";
  const newPassword = path === "/reset-password";
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (signup) {
      if (sent) await onAuth({ type: "verify", email, token });
      else if (
        await onRequest({
          type: "signup",
          email,
          password,
          profile,
          terms: agreed,
          marketing,
        })
      ) {
        setSent(true);
        notify("학교 메일의 인증 링크를 열거나 코드를 입력해 주세요.");
      }
    } else if (reset) {
      if (await onRequest({ type: "reset", email }))
        notify("가입된 이메일이라면 비밀번호 재설정 메일을 보냈어요.");
    } else if (newPassword) {
      if (await onRequest({ type: "password", password }))
        notify("비밀번호를 변경했어요. 홈으로 이동할 수 있어요.");
    } else await onAuth({ type: "signin", email, password });
  }
  return (
    <div className={`authLayout ${signup ? "authSignup" : ""}`}>
      <aside className="authIntro">
        <span className="eyebrow">A BETTER PICK FOR YOU</span>
        <h1>
          좋은 교양을
          <br />
          고르는 감각.
        </h1>
        <p>
          가능 시간도, 수업 취향도.
          <br />
          나에게 꼭 맞는 한 학기를 준비하세요.
        </p>
        <div className="authPaw">
          <Paw size={150} />
        </div>
        <span className="authMini">
          성향 맞춤 교양 추천
          <br />
          모의 경쟁률 리포트
        </span>
      </aside>
      <section className="authCard">
        <Link href="/login" className="brand authBrand">
          <Paw size={27} />
          교냥픽
        </Link>
        <h2>
          {signup
            ? "회원가입"
            : reset
              ? "비밀번호 찾기"
              : newPassword
                ? "새 비밀번호 설정"
                : "반가워요!"}
        </h2>
        <p className="muted">
          {signup
            ? "한양 이메일로 인증하고 시작하세요."
            : reset
              ? "학교 이메일로 재설정 링크를 보내드려요."
              : newPassword
                ? "사용할 새 비밀번호를 입력해 주세요."
                : "나에게 맞는 교양, 함께 찾아볼까요?"}
        </p>
        {signup && (
          <div className="signupSteps">
            <span className={sent ? "" : "current"}>01 기본 정보</span>
            <i />
            <span className={sent ? "current" : ""}>02 이메일 인증</span>
          </div>
        )}
        <form onSubmit={(e) => void submit(e)}>
          {!newPassword && (
            <label>
              한양 이메일
              <input
                type="email"
                autoComplete="email"
                placeholder="example@hanyang.ac.kr"
                required
                value={email}
                disabled={sent}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          {!reset && !sent && (
            <label>
              비밀번호
              <input
                type="password"
                minLength={8}
                required
                autoComplete={
                  signup || newPassword ? "new-password" : "current-password"
                }
                placeholder="8자 이상 입력해 주세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          {signup && !sent && (
            <>
              <div className="formDivider" />
              <h3>기본 정보</h3>
              <ProfileFields value={profile} onChange={setProfile} />
              <div className="agreement">
                <label>
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    required
                  />
                  <span>
                    <b>(필수)</b> 이용약관·개인정보 수집 및 비공식 서비스 확인
                  </span>
                </label>
                <button
                  type="button"
                  className="textLink"
                  onClick={() => onTerms("이용약관 및 개인정보 안내")}
                >
                  보기
                </button>
              </div>
              <label className="checkboxLabel muted small">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                />
                (선택) 이벤트·무료 젤리 소식 받기
              </label>
            </>
          )}
          {sent && (
            <>
              <p className="infoBox small">
                메일의 인증 링크를 열어 주세요. 인증 코드 템플릿을 사용 중이라면
                아래에 코드를 입력할 수도 있어요.
              </p>
              <label>
                인증 코드
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  inputMode="numeric"
                  placeholder="인증 코드 입력"
                  required
                />
              </label>
            </>
          )}
          <button className="button primary full" disabled={busy}>
            {busy
              ? "처리 중…"
              : signup
                ? sent
                  ? "인증하고 시작하기"
                  : "인증 메일 받기"
                : reset
                  ? "재설정 메일 보내기"
                  : newPassword
                    ? "비밀번호 변경"
                    : "로그인"}
          </button>
        </form>
        {mode === "demo" && !newPassword && (
          <>
            <div className="orDivider">
              <span>또는</span>
            </div>
            <button
              className="button outline full demoButton"
              disabled={busy}
              onClick={() => void onAuth({ type: "demo" })}
            >
              <Paw size={18} />
              가입 없이 시연 시작하기
            </button>
            <p className="muted small center">
              실제 이메일 인증은 Supabase 연결 후 사용할 수 있어요.
              <br />
              시연 데이터는 이 기기의 서버에만 저장됩니다.
            </p>
          </>
        )}
        <div className="authLinks">
          <Link href={signup ? "/login" : "/signup"}>
            {signup ? "이미 계정이 있나요? 로그인" : "회원가입"}
          </Link>
          <span>·</span>
          <Link href="/forgot-password">비밀번호 찾기</Link>
          {newPassword && <Link href="/home">홈으로 →</Link>}
        </div>
      </section>
    </div>
  );
}
