"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/types";
import { Paw, ProfileFields } from "./shared";

const TERMS = [
  ["use", "이용약관 동의", true],
  ["privacy", "개인정보 수집·이용 동의", true],
  ["unofficial", "비공식 서비스임을 확인했습니다", true],
  ["marketing", "이벤트·무료 젤리 소식 받기", false],
] as const;
type TermKey = (typeof TERMS)[number][0];

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
  const [agreed, setAgreed] = useState<Record<TermKey, boolean>>({
    use: false,
    privacy: false,
    unofficial: false,
    marketing: false,
  });
  const [profile, setProfile] = useState<Profile>({
    year: 1,
    department: "경영학부",
    nationality: "KR",
    international: false,
  });
  const signup = path === "/signup";
  const reset = path === "/forgot-password";
  const newPassword = path === "/reset-password";
  const allOn = TERMS.every(([k]) => agreed[k]);
  const required = TERMS.every(([k, , req]) => !req || agreed[k]);

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
          terms: required,
          marketing: agreed.marketing,
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

  const emailField = (
    <label className="field">
      한양 이메일
      <input
        type="email"
        autoComplete="email"
        placeholder="아이디@hanyang.ac.kr"
        required
        value={email}
        disabled={sent}
        onChange={(e) => setEmail(e.target.value)}
      />
    </label>
  );
  const passwordField = (
    <label className="field">
      비밀번호
      <input
        type="password"
        minLength={8}
        required
        autoComplete={signup || newPassword ? "new-password" : "current-password"}
        placeholder={signup || newPassword ? "8자 이상" : "비밀번호"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
    </label>
  );

  if (signup)
    return (
      <form className="signup" onSubmit={(e) => void submit(e)}>
        <div className="card signupHead">
          <div>
            <Link href="/login" className="backLink">
              ← 로그인으로
            </Link>
            <h1>회원가입</h1>
          </div>
          <ol className="stepPills" aria-label="가입 단계">
            <li className={sent ? "" : "on"}>① 본인인증</li>
            <li className={sent ? "" : "on"}>② 기본 정보</li>
            <li className={sent ? "" : "on"}>③ 약관 동의</li>
            <li className={sent ? "on" : ""}>④ 메일 인증</li>
          </ol>
        </div>
        {sent ? (
          <section className="card stack verifyCard">
            <h2>④ 메일 인증</h2>
            <p className="muted">
              {email}로 보낸 인증 링크를 열어 주세요. 메일에 인증 코드가 있다면
              아래에 입력해도 돼요.
            </p>
            <label className="field">
              인증 코드
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                inputMode="numeric"
                placeholder="메일로 받은 코드"
                required
              />
            </label>
            <button className="btn primary full lg" disabled={busy}>
              {busy ? "처리 중…" : "인증하고 시작하기"}
            </button>
          </section>
        ) : (
          <div className="signupGrid">
            <section className="card stack" aria-labelledby="s1">
              <h2 id="s1">① 본인인증</h2>
              <p className="muted">1인 1계정 확인을 위해 한양 이메일로 인증합니다.</p>
              {emailField}
              {passwordField}
              <p className="note">
                가입하면 학교 메일로 인증 메일이 와요. 링크를 열거나 코드를
                입력하면 가입이 끝나요.
              </p>
            </section>
            <section className="card stack" aria-labelledby="s2">
              <h2 id="s2">② 기본 정보</h2>
              <p className="muted">수강 제한이 있는 교양을 거르는 데만 씁니다.</p>
              <ProfileFields value={profile} onChange={setProfile} />
              <p className="note">
                학번은 받지 않습니다. 국적은 유학생 e-러닝 제한과 국적 제한 과목
                판별에 씁니다.
              </p>
            </section>
            <section className="card stack" aria-labelledby="s3">
              <h2 id="s3">③ 약관 동의</h2>
              <label className="checkBox strong">
                <input
                  type="checkbox"
                  checked={allOn}
                  onChange={() =>
                    setAgreed({
                      use: !allOn,
                      privacy: !allOn,
                      unofficial: !allOn,
                      marketing: !allOn,
                    })
                  }
                />
                전체 동의
              </label>
              {TERMS.map(([key, label, req]) => (
                <div className="termRow" key={key}>
                  <label>
                    <input
                      type="checkbox"
                      checked={agreed[key]}
                      onChange={() =>
                        setAgreed({ ...agreed, [key]: !agreed[key] })
                      }
                    />
                    <span>
                      <b>{req ? "(필수)" : "(선택)"}</b> {label}
                    </span>
                  </label>
                  <button
                    type="button"
                    className="linkButton"
                    aria-label={`${label} 내용 보기`}
                    onClick={() => onTerms(label)}
                  >
                    [보기]
                  </button>
                </div>
              ))}
              <button
                className="btn primary full lg pushDown"
                disabled={busy || !required}
              >
                {busy
                  ? "처리 중…"
                  : required
                    ? "가입하고 인증 메일 받기"
                    : "필수 약관에 동의해 주세요"}
              </button>
            </section>
          </div>
        )}
      </form>
    );

  return (
    <div className="authCenter">
      <form className="card authCard" onSubmit={(e) => void submit(e)}>
        <div className="authLogo">
          <span>
            <Paw size={30} />
          </span>
          <h1>교냥픽</h1>
          <p>
            {reset
              ? "학교 이메일로 비밀번호 재설정 링크를 보내드려요."
              : newPassword
                ? "사용할 새 비밀번호를 입력해 주세요."
                : "성향 맞춤 교양 추천과 모의 경쟁률 리포트"}
          </p>
        </div>
        {!newPassword && emailField}
        {!reset && passwordField}
        <button className="btn primary full lg" disabled={busy}>
          {busy
            ? "처리 중…"
            : reset
              ? "재설정 메일 보내기"
              : newPassword
                ? "비밀번호 변경"
                : "로그인"}
        </button>
        {mode === "demo" && !newPassword && (
          <>
            <div className="orDivider">
              <span>또는</span>
            </div>
            <button
              type="button"
              className="btn outline full lg"
              disabled={busy}
              onClick={() => void onAuth({ type: "demo" })}
            >
              <Paw size={18} />
              가입 없이 시연 시작하기
            </button>
            <p className="note center">
              실제 이메일 인증은 Supabase 연결 후 사용할 수 있어요. 시연 데이터는
              이 기기의 서버에만 저장됩니다.
            </p>
          </>
        )}
        <div className="authLinks">
          {reset || newPassword ? (
            <Link href={newPassword ? "/home" : "/login"}>
              {newPassword ? "홈으로 →" : "← 로그인으로"}
            </Link>
          ) : (
            <>
              <Link href="/signup" className="strongLink">
                회원가입
              </Link>
              <span aria-hidden="true">|</span>
              <Link href="/forgot-password">비밀번호 찾기</Link>
            </>
          )}
        </div>
      </form>
      <p className="card disclaimer">
        교냥픽은 한양대학교 공식 서비스가 아니며, 학교 수강신청 시스템과
        연결되어 있지 않습니다.
      </p>
    </div>
  );
}
