"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DEFAULT_FILTERS, SEMESTER } from "@/lib/catalog";
import type { Course, Filters, Mutation, Plan, Report, Snapshot } from "@/lib/types";
import AuthView from "./auth-view";
import { ExploreConditions, ExploreResults } from "./explore";
import HomePage from "./home";
import JellyPage, { SampleForm } from "./jelly";
import Moderation from "./moderation";
import MyReportPage from "./my-report";
import ReportView from "./report-view";
import ReviewForm from "./review-form";
import { Empty, Modal, Paw, ProfileEditor, api, date } from "./shared";

export default function App() {
  const path = usePathname();
  const router = useRouter();
  const [state, setState] = useState<Snapshot | null>(null);
  const [mode, setMode] = useState("demo");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<(string | null)[]>([null, null, null]);
  const [confirm, setConfirm] = useState<Course | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [terms, setTerms] = useState<string | null>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [path]);
  const pending = useRef(false);
  const notify = (text: string, error = false) => setNotice({ text, error });
  useEffect(() => {
    api<Snapshot & { account: Snapshot["account"] | null }>("/api/session")
      .then((data) => {
        setMode(data.mode);
        if (data.account) setState(data as Snapshot);
      })
      .catch((error) => {
        setMode("unconfigured");
        notify(error.message, true);
      })
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (state) setDraft(state.account.ranks);
  }, [state?.account.version, state?.account.id]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    if (pending.current) return null;
    pending.current = true;
    setBusy(true);
    try {
      return await fn();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
        true,
      );
      return null;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function act(action: Mutation, message?: string) {
    return run(async () => {
      const next = await api<Snapshot>("/api/action", {
        action,
        requestId: crypto.randomUUID(),
      });
      setState(next);
      if (message) notify(message);
      return next;
    });
  }
  const favorite = (id: string) => void act({ type: "favorite", courseId: id });
  async function authenticate(body: unknown, destination = "/home") {
    return run(async () => {
      await api("/api/auth", body);
      const next = await api<Snapshot>("/api/session");
      if (next.account) {
        setState(next);
        router.push(destination);
      }
      return true;
    });
  }
  async function openReport(course: Course) {
    if (!state) return;
    if (!state.account.unlocked.includes(course.id)) {
      setConfirm(course);
      return;
    }
    await run(async () => {
      setReport(await api<Report>(`/api/report/${course.id}`));
    });
  }
  async function unlock() {
    if (!confirm) return;
    const course = confirm;
    const next = await act({ type: "open", courseId: course.id });
    if (next) {
      setConfirm(null);
      await run(async () => {
        setReport(await api<Report>(`/api/report/${course.id}`));
      });
    }
  }
  const navs = [
    ["/home", "홈"],
    ["/explore", "교양탐색"],
    ["/my-report", "내 리포트"],
    ["/jelly", "젤리"],
  ];
  const account = state?.account;
  const courses = state?.courses ?? [];
  const byId = (id: string | null) => courses.find((c) => c.id === id);
  const isHome = path === "/home" && !!account;
  const isAuth =
    ["/", "/login", "/signup", "/forgot-password", "/reset-password"].includes(
      path,
    ) || !account;
  const setRank = (rank: number, id: string | null) =>
    setDraft((old) =>
      old.map((value, i) =>
        i === rank ? id : value === id && id ? null : value,
      ),
    );
  const dirty = JSON.stringify(draft) !== JSON.stringify(account?.ranks);
  const rankLabel = (id: string) => {
    const i = account?.ranks.indexOf(id) ?? -1;
    return i >= 0 && account?.saved ? `${i + 1}지망` : "열람한 과목";
  };
  return (
    <div className={isAuth ? "authRoot" : isHome ? "homeRoot" : "appRoot"}>
      <a className="skipLink" href="#content">
        본문으로 건너뛰기
      </a>
      {ready && !isAuth && (
        <header className={`header ${isHome ? "clear" : ""}`}>
          <div className="headerInner">
            <Link href="/home" className="brand">
              <Paw size={22} />
              교냥픽
            </Link>
            <nav aria-label="주 메뉴">
              {navs.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className={path.startsWith(href) ? "on" : ""}
                  aria-current={path.startsWith(href) ? "page" : undefined}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="headerActions">
              <Link href="/jelly" className="walletPill">
                <Paw size={16} />
                보유 젤리 {account!.balance}개
              </Link>
              <button
                type="button"
                className="avatar"
                aria-label="내 정보"
                onClick={() => setProfileOpen(true)}
              />
            </div>
          </div>
        </header>
      )}
      {ready && mode === "demo" && !isHome && (
        <div className="demoStrip">
          로컬 시연 · 과목과 교수 정보는 예시이며 실제 결제는 발생하지 않아요.
        </div>
      )}
      {!ready ? (
        <main id="content" className="loading">
          <Paw size={40} />
          <p>나에게 맞는 교양을 준비하고 있어요.</p>
        </main>
      ) : isAuth ? (
        <main id="content" className="authMain">
          <AuthView
            path={path}
            mode={mode}
            busy={busy}
            onAuth={authenticate}
            onRequest={(body) =>
              run(async () => {
                await api("/api/auth", body);
                return true;
              })
            }
            onTerms={setTerms}
            notify={notify}
          />
        </main>
      ) : (
        <>
          {isHome ? (
            <HomePage account={account!} byId={byId} />
          ) : (
            <main
              id="content"
              className={`page ${path === "/reviews" ? "narrow" : ""}`}
            >
              {path === "/explore" && (
                <ExploreConditions
                  filters={filters}
                  setFilters={setFilters}
                  busy={busy}
                  onRecommend={() =>
                    void run(async () => {
                      const data = await api<{ plans: Plan[] }>("/api/recommend", filters);
                      setPlans(data.plans);
                      setTab(0);
                      router.push("/explore/results");
                    })
                  }
                />
              )}
              {path === "/explore/results" && (
                <ExploreResults
                  filters={filters}
                  plans={plans}
                  tab={tab}
                  setTab={setTab}
                  search={search}
                  setSearch={setSearch}
                  courses={courses}
                  account={account!}
                  byId={byId}
                  favorite={favorite}
                />
              )}
              {path === "/my-report" && (
                <MyReportPage
                  state={state!}
                  draft={draft}
                  setRank={setRank}
                  dirty={dirty}
                  busy={busy}
                  byId={byId}
                  openReport={openReport}
                  act={act}
                />
              )}
              {path === "/jelly" && (
                <JellyPage
                  account={account!}
                  busy={busy}
                  mode={mode}
                  onHistory={() => setHistoryOpen(true)}
                  onSample={() => setSampleOpen(true)}
                />
              )}
              {path === "/reviews" && (
                <ReviewForm
                  state={state!}
                  busy={busy}
                  onSubmit={async (review, stay) => {
                    const before = account!.balance;
                    const next = await act({ type: "review", review });
                    if (!next) return false;
                    notify(
                      next.account.balance > before
                        ? "강의평 2과목 입력 완료! 젤리 1개를 받았어요."
                        : "강의평을 저장했어요. 한 과목 더 작성하면 젤리 1개!",
                    );
                    if (!stay) router.push("/jelly");
                    return true;
                  }}
                />
              )}
              {path === "/admin" && (
                <Moderation courses={courses} allowed={!!account?.admin} />
              )}
              {![
                "/explore",
                "/explore/results",
                "/my-report",
                "/jelly",
                "/reviews",
                "/admin",
              ].includes(path) && (
                <Empty title="페이지를 찾을 수 없어요">
                  <Link className="textLink" href="/home">
                    홈으로 돌아가기 →
                  </Link>
                </Empty>
              )}
            </main>
          )}
        </>
      )}
      <footer className="footer">
        <Link href={account ? "/home" : "/login"} className="footerBrand">
          <Paw size={19} />
          교냥픽
        </Link>
        <p>
          한양대학교 비공식 서비스 · 학교 수강신청 시스템과 연결되어 있지
          않습니다.
          <br />
          모의 경쟁률은 이용자 입력 기반 지표이며 실제 경쟁률이나 수강 성공을
          보장하지 않습니다.
        </p>
        <span>© 2026 GYONYANG PICK</span>
      </footer>
      {notice && (
        <div
          className={`toast ${notice.error ? "toastError" : ""}`}
          role={notice.error ? "alert" : "status"}
        >
          <span>{notice.error ? "!" : "✓"}</span>
          {notice.text}
          <button aria-label="알림 닫기" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}
      {confirm && (
        <Modal
          title="리포트를 열까요?"
          eyebrow={`${rankLabel(confirm.id)} · ${confirm.name}`}
          onClose={() => setConfirm(null)}
        >
          <div className="costTable">
            <div>
              <span>
                <Paw size={14} /> 현재 젤리
              </span>
              <b>{account!.balance}개</b>
            </div>
            <div>
              <span>이번에 쓰는 젤리</span>
              <b className="dangerText">1개</b>
            </div>
            <div className="total">
              <span>열고 난 뒤 남는 젤리</span>
              <b>{Math.max(0, account!.balance - 1)}개</b>
            </div>
          </div>
          <p className="muted">
            처음 열 때만 젤리 1개가 차감돼요. 이후에는 지망에서 빼도 무료로 다시
            볼 수 있어요. 젤리가 부족하면 <Link className="textLink" href="/jelly" onClick={() => setConfirm(null)}>젤리 페이지</Link>에서
            무료로 받을 수 있어요.
          </p>
          <div className="modalActions">
            <button type="button" className="btn outline lg" onClick={() => setConfirm(null)}>
              취소
            </button>
            {account!.balance < 1 ? (
              <Link
                className="btn primary lg"
                href="/jelly"
                onClick={() => setConfirm(null)}
              >
                무료 젤리 받으러 가기
              </Link>
            ) : (
              <button
                type="button"
                className="btn primary lg"
                disabled={busy}
                onClick={() => void unlock()}
              >
                젤리를 사용해서 리포트 열기
              </button>
            )}
          </div>
        </Modal>
      )}
      {report && (
        <Modal
          title={report.course.name}
          eyebrow={`${rankLabel(report.course.id)} 리포트${report.example ? " · 과목 정보는 시연용 예시" : ""}`}
          wide
          onClose={() => setReport(null)}
        >
          <ReportView
            report={report}
            busy={busy}
            onReport={async (id) => {
              const next = await act(
                { type: "report", reviewId: id },
                "신고를 접수하고 강의평을 임시 숨김 처리했어요.",
              );
              if (next)
                await run(async () => {
                  setReport(
                    await api<Report>(`/api/report/${report.course.id}`),
                  );
                });
            }}
          />
          <button
            className="btn outline full lg"
            onClick={() => setReport(null)}
          >
            내 리포트로 돌아가기
          </button>
        </Modal>
      )}
      {sampleOpen && (
        <Modal title="모의수강신청 표본" onClose={() => setSampleOpen(false)}>
          <SampleForm
            courses={courses.filter((c) => c.semester === SEMESTER)}
            initial={account!.ranks}
            busy={busy}
            onSubmit={async (ranks) => {
              if (
                await act(
                  { type: "sample", ranks },
                  "표본을 제출하고 무료 젤리 1개를 받았어요.",
                )
              )
                setSampleOpen(false);
            }}
          />
        </Modal>
      )}
      {profileOpen && (
        <Modal title="내 정보" onClose={() => setProfileOpen(false)}>
          <p className="muted small">{account!.email}</p>
          <ProfileEditor
            value={account!.profile}
            busy={busy}
            onSave={async (profile) => {
              if (
                await act(
                  { type: "profile", profile },
                  "기본 정보를 저장했어요.",
                )
              )
                setProfileOpen(false);
            }}
          />
          <button
            className="linkButton logout"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await api("/api/auth", { type: "logout" });
                setState(null);
                setProfileOpen(false);
                router.push("/login");
              })
            }
          >
            로그아웃
          </button>
        </Modal>
      )}
      {historyOpen && (
        <Modal title="젤리 전체 내역" onClose={() => setHistoryOpen(false)}>
          <p className="muted small">현재 잔액 {account!.balance}개</p>
          {account!.entries.length ? (
            account!.entries.map((e) => (
              <div className="historyRow" key={e.id}>
                <div>
                  {e.reason}
                  <small>{date(e.createdAt)}</small>
                </div>
                <strong className={e.delta > 0 ? "accentText" : ""}>
                  {e.delta > 0 ? "+" : "−"}
                  {Math.abs(e.delta)}
                </strong>
              </div>
            ))
          ) : (
            <Empty title="아직 내역이 없어요">
              표본 제출이나 강의평으로 첫 젤리를 받아 보세요.
            </Empty>
          )}
        </Modal>
      )}
      {terms && (
        <Modal title={terms} onClose={() => setTerms(null)}>
          <div className="termsText">
            <p>교냥픽은 학교와 연결되지 않은 시연용 비공식 서비스입니다.</p>
            <p>
              기본 정보와 지망은 추천·모의지원 집계에, 강의평은 익명 후기와
              통계에 사용됩니다. 학번은 수집하지 않으며 연락처나 다른 사람의
              개인정보를 강의평에 적지 말아 주세요.
            </p>
            <p>
              실제 결제는 진행하지 않습니다. 리포트 최초 열람과 지망 변경에는
              테스트 젤리가 사용되며 재열람은 무료입니다.
            </p>
            <p className="muted small">
              이 안내는 1차 구현 검토용입니다. 공개 운영 전 정식
              이용약관·개인정보 처리방침과 보관·삭제 절차를 확정해야 합니다.
            </p>
          </div>
          <button
            className="btn primary full"
            onClick={() => setTerms(null)}
          >
            확인했어요
          </button>
        </Modal>
      )}
    </div>
  );
}
