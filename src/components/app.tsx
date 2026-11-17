"use client";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  COUNTRIES,
  DEFAULT_FILTERS,
  DEPARTMENTS,
  SEMESTER,
  courseMeta,
} from "@/lib/catalog";
import type {
  Course,
  Filters,
  Mutation,
  Plan,
  Profile,
  Report,
  Snapshot,
} from "@/lib/types";
import Moderation from "./moderation";

export function Paw({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="16.5" rx="5.2" ry="4.3" />
      <ellipse cx="5" cy="10.5" rx="2.1" ry="2.7" />
      <ellipse cx="9.3" cy="6" rx="2.1" ry="2.8" />
      <ellipse cx="14.7" cy="6" rx="2.1" ry="2.8" />
      <ellipse cx="19" cy="10.5" rx="2.1" ry="2.7" />
    </svg>
  );
}
const Arrow = () => <span aria-hidden="true">↗</span>;
const number = (n: number) => n.toLocaleString("ko-KR");
const date = (value: string) =>
  new Date(value).getTime()
    ? new Date(value).toLocaleString("ko-KR", {
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "첫 집계 대기 중";
async function api<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(
    url,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "요청을 처리하지 못했어요.");
  return data;
}

function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const old = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modalWide" : ""}`}
      aria-labelledby="modal-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modalHead">
        <div>
          <span className="eyebrow">교냥픽</span>
          <h2 id="modal-title">{title}</h2>
        </div>
        <button className="iconButton" onClick={onClose} aria-label="닫기">
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <span className="emptyPaw">
        <Paw size={32} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function ProfileFields({
  value,
  onChange,
}: {
  value: Profile;
  onChange: (p: Profile) => void;
}) {
  const names = new Intl.DisplayNames(["ko"], { type: "region" });
  return (
    <div className="formGrid">
      <label>
        이번 학기 학년
        <select
          value={value.year}
          onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}학년
            </option>
          ))}
        </select>
      </label>
      <label>
        학과
        <select
          value={value.department}
          onChange={(e) => onChange({ ...value, department: e.target.value })}
        >
          {DEPARTMENTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </label>
      <label>
        국적
        <select
          value={value.nationality}
          onChange={(e) => onChange({ ...value, nationality: e.target.value })}
        >
          {COUNTRIES.map((code) => (
            <option key={code} value={code}>
              {names.of(code)}
            </option>
          ))}
        </select>
      </label>
      <label>
        유학생 여부
        <select
          value={String(value.international)}
          onChange={(e) =>
            onChange({ ...value, international: e.target.value === "true" })
          }
        >
          <option value="false">해당 없음</option>
          <option value="true">외국인 유학생</option>
        </select>
      </label>
      <p className="muted small span2">
        학번은 받지 않습니다. 학과·학년·국적은 수강 제한 확인에만 사용해요.
      </p>
    </div>
  );
}
function CourseCard({
  course,
  favorite,
  onFavorite,
  reason,
  children,
}: {
  course: Course;
  favorite: boolean;
  onFavorite: () => void;
  reason?: string;
  children?: ReactNode;
}) {
  return (
    <article className="courseCard">
      <div className="courseTop">
        <div className="tagRow">
          <span className="tag">{course.kind}</span>
          <span className="muted small">{course.area}</span>
        </div>
        <button
          className={`star ${favorite ? "starred" : ""}`}
          onClick={onFavorite}
          aria-label={`${course.name} 즐겨찾기 ${favorite ? "해제" : "추가"}`}
          aria-pressed={favorite}
        >
          {favorite ? "★" : "☆"}
        </button>
      </div>
      <h3>{course.name}</h3>
      <p className="courseMeta">{courseMeta(course)}</p>
      {reason && (
        <p className="reason">
          <Paw size={15} />
          {reason}
        </p>
      )}
      {["e-러닝 C", "e-러닝 D"].includes(course.kind) && (
        <p className="small warningText">
          학점교류 e-러닝 C·D는 학기당 합계 1강좌까지 추천해요.
        </p>
      )}
      {children}
    </article>
  );
}

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
  const pageTitle =
    path === "/my-report"
      ? "내 리포트"
      : path === "/jelly"
        ? "젤리"
        : path === "/reviews"
          ? "강의평 입력"
          : "교양탐색";
  const setRank = (rank: number, id: string | null) =>
    setDraft((old) =>
      old.map((value, i) =>
        i === rank ? id : value === id && id ? null : value,
      ),
    );
  const dirty = JSON.stringify(draft) !== JSON.stringify(account?.ranks);
  return (
    <div className={isHome ? "homeRoot" : "appRoot"}>
      <a className="skipLink" href="#content">
        본문으로 건너뛰기
      </a>
      <header className={`header ${isHome ? "headerHero" : ""}`}>
        <div className="headerInner">
          <Link href={account ? "/home" : "/login"} className="brand">
            <Paw size={25} />
            교냥픽
          </Link>
          <nav aria-label="주 메뉴">
            {navs.map(([href, label]) => (
              <Link
                key={href}
                href={account ? href : "/login"}
                className={path.startsWith(href) ? "navActive" : ""}
                aria-current={path.startsWith(href) ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="headerActions">
            {account ? (
              <>
                <Link href="/jelly" className="walletPill">
                  <Paw size={16} />
                  <span>
                    보유 젤리 <b>{account.balance}개</b>
                  </span>
                </Link>
                <button
                  className="avatar"
                  aria-label="내 정보"
                  onClick={() => setProfileOpen(true)}
                >
                  {account.profile.year}
                </button>
              </>
            ) : (
              <Link className="headerLogin" href="/signup">
                처음이신가요? <b>회원가입 ↗</b>
              </Link>
            )}
          </div>
        </div>
      </header>
      {ready && mode === "demo" && (
        <div className="demoStrip">
          <span className="demoDot" />
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
            <main id="content">
              <section className="hero">
                <div className="heroCopy">
                  <span className="heroBadge">한양대학교 수강신청 도우미</span>
                  <p className="heroKicker">이번 학기, 나를 위한 선택</p>
                  <h1>
                    교냥픽<span className="heroPeriod">.</span>
                  </h1>
                  <p className="heroDescription">
                    취향은 맞추고, 고민은 줄이고.
                    <br />
                    나에게 맞는 교양을 찾아보세요.
                  </p>
                  <div className="heroButtons">
                    <Link className="button light" href="/explore">
                      교양 추천받기 <Arrow />
                    </Link>
                    <Link className="button ghostLight" href="/my-report">
                      내 리포트 보기 <span>→</span>
                    </Link>
                  </div>
                  <p className="heroNote">
                    성향 맞춤 교양 추천 · 모의 경쟁률 리포트
                  </p>
                </div>
                <div className="heroVisual" aria-hidden="true">
                  <div className="orbit orbit1" />
                  <div className="orbit orbit2" />
                  <div className="heroPaw paw1">
                    <Paw size={170} />
                  </div>
                  <div className="heroPaw paw2">
                    <Paw size={92} />
                  </div>
                  <div className="pickCard">
                    <div className="pickHeading">
                      <span>TODAY’S PICK</span>
                      <Paw size={26} />
                    </div>
                    <h2>나의 교양 선택지</h2>
                    {[0, 1, 2].map((i) => (
                      <div className="pickRow" key={i}>
                        <span className={`rankBadge rank${i}`}>
                          {i + 1}지망
                        </span>
                        <strong>
                          {byId(account!.ranks[i])?.name ?? "아직 고르지 않았어요"}
                        </strong>
                      </div>
                    ))}
                    <div className="pickBottom">
                      <span className="statusDot" />
                      시간 충돌 없이, 나답게
                    </div>
                  </div>
                  <span className="floatingNote">좋은 교양, 먼저 찜! ✦</span>
                </div>
                <a href="#quick-links" className="scrollHint">
                  아래로 둘러보기 <span>↓</span>
                </a>
              </section>
              <section id="quick-links" className="homeSection">
                <div className="sectionIntro">
                  <span className="eyebrow">YOUR NEXT STEP</span>
                  <h2>어디서부터 시작할까요?</h2>
                  <p>추천부터 리포트까지, 한 번에 준비하세요.</p>
                </div>
                <div className="quickGrid">
                  {[
                    [
                      "01",
                      "무료 젤리 얻기",
                      "들은 교양의 강의평과 모의지원 표본으로 리포트를 열어 보세요.",
                      "/jelly",
                      "젤리 받으러 가기",
                    ],
                    [
                      "02",
                      "나에게 맞는 교양 찾기",
                      "가능 시간과 취향만 알려 주세요. 겹치지 않는 추천안을 만들어요.",
                      "/explore",
                      "교양탐색 시작하기",
                    ],
                    [
                      "03",
                      "1·2·3지망 정하기",
                      "찜한 교양으로 지망을 정하고, 모의 경쟁률 리포트를 확인하세요.",
                      "/my-report",
                      "내 리포트로 가기",
                    ],
                  ].map(([no, title, desc, href, cta]) => (
                    <Link href={href} className="quickCard" key={no}>
                      <span className="quickNumber">{no}</span>
                      <Paw size={34} />
                      <h3>{title}</h3>
                      <p>{desc}</p>
                      <strong>
                        {cta}
                        <Arrow />
                      </strong>
                    </Link>
                  ))}
                </div>
              </section>
              <section className="howSection">
                <span className="eyebrow">HOW TO PICK</span>
                <h2>딱 세 단계면 준비 끝.</h2>
                <div className="howGrid">
                  {[
                    [
                      "01",
                      "조건을 고르고",
                      "가능 시간과 원하는 수업 스타일을 알려 주세요.",
                    ],
                    [
                      "02",
                      "교양을 찜하고",
                      "추천받거나 검색한 과목을 즐겨찾기해요.",
                    ],
                    [
                      "03",
                      "리포트로 결정해요",
                      "첫 지망 저장은 무료, 리포트는 처음에만 젤리 1개.",
                    ],
                  ].map(([n, t, d]) => (
                    <div key={n}>
                      <span>{n}</span>
                      <h3>{t}</h3>
                      <p>{d}</p>
                    </div>
                  ))}
                </div>
              </section>
            </main>
          ) : (
            <main
              id="content"
              className={`main ${path === "/reviews" ? "narrow" : ""}`}
            >
              <div className="pageHeading">
                <div>
                  <span className="eyebrow">
                    {path.startsWith("/explore")
                      ? "FIND YOUR PICK"
                      : path === "/my-report"
                        ? "MY REPORT"
                        : path === "/reviews"
                          ? "SHARE YOUR EXPERIENCE"
                          : "MY JELLY"}
                  </span>
                  <h1>{pageTitle}</h1>
                  <p>
                    {path.startsWith("/explore")
                      ? "가능 시간과 취향을 고르면, 나에게 맞는 교양을 찾아드려요."
                      : path === "/my-report"
                        ? "찜한 교양으로 지망을 정하고, 더 확실하게 선택하세요."
                        : path === "/jelly"
                          ? "작은 참여로 모으고, 필요한 리포트에 사용하세요."
                          : "당신의 경험이 다음 학기의 더 좋은 선택이 됩니다."}
                  </p>
                </div>
                {path.startsWith("/explore") ? (
                  <Link className="textLink" href="/reviews">
                    강의평 쓰고 젤리 받기 <Arrow />
                  </Link>
                ) : (
                  <span className="semester">
                    {SEMESTER.replace("-", "학년도 ")}학기
                  </span>
                )}
              </div>
              {path === "/explore" && (
                <>
                  <div className="stepBar">
                    <span className="stepActive">
                      <b>1</b> 조건 고르기
                    </span>
                    <i />
                    <span>
                      <b>2</b> 추천안 확인
                    </span>
                  </div>
                  <div className="exploreLayout">
                    <section className="panel timePanel">
                      <div className="panelHeading">
                        <div>
                          <h2>수업 가능 시간</h2>
                          <p>
                            수업을 들을 수 있는 시간을 파란색으로 칠해 주세요.
                          </p>
                        </div>
                        <span className="tag blue">
                          {filters.available.length}칸 선택
                        </span>
                      </div>
                      <div className="timeGrid">
                        <span className="timeCorner">시간</span>
                        {[..."월화수목금"].map((d) => (
                          <strong key={d}>{d}</strong>
                        ))}
                        {Array.from({ length: 13 }, (_, i) => i + 9).map(
                          (hour) => (
                            <Fragment key={hour}>
                              <span className="hourLabel">{hour}:00</span>
                              {[0, 1, 2, 3, 4].map((day) => {
                                const key = `${day}-${hour}`;
                                const on = filters.available.includes(key);
                                return (
                                  <button
                                    key={key}
                                    className={`timeCell ${on ? "timeOn" : ""}`}
                                    aria-label={`${"월화수목금"[day]}요일 ${hour}시`}
                                    aria-pressed={on}
                                    onClick={() =>
                                      setFilters({
                                        ...filters,
                                        available: on
                                          ? filters.available.filter(
                                              (x) => x !== key,
                                            )
                                          : [...filters.available, key],
                                      })
                                    }
                                  >
                                    {on && <span>✓</span>}
                                  </button>
                                );
                              })}
                            </Fragment>
                          ),
                        )}
                      </div>
                      <div className="timeLegend">
                        <span>
                          <i className="legendOn" />
                          수업 가능
                        </span>
                        <span>
                          <i />
                          수업 불가
                        </span>
                        <button
                          className="textLink"
                          onClick={() =>
                            setFilters({
                              ...filters,
                              available: DEFAULT_FILTERS.available,
                            })
                          }
                        >
                          전체 선택
                        </button>
                        <button
                          className="textLink muted"
                          onClick={() =>
                            setFilters({ ...filters, available: [] })
                          }
                        >
                          전체 해제
                        </button>
                      </div>
                    </section>
                    <aside className="panel filterPanel">
                      <h2>내 추천 조건</h2>
                      <fieldset>
                        <legend>들을 교양 학점</legend>
                        <div className="creditRange">
                          <label className="srOnly" htmlFor="min-credit">
                            최소 학점
                          </label>
                          <select
                            id="min-credit"
                            value={filters.min}
                            onChange={(e) =>
                              setFilters({
                                ...filters,
                                min: Number(e.target.value),
                              })
                            }
                          >
                            {[3, 6, 9].map((n) => (
                              <option key={n} value={n}>
                                {n}학점
                              </option>
                            ))}
                          </select>
                          <span>~</span>
                          <label className="srOnly" htmlFor="max-credit">
                            최대 학점
                          </label>
                          <select
                            id="max-credit"
                            value={filters.max}
                            onChange={(e) =>
                              setFilters({
                                ...filters,
                                max: Number(e.target.value),
                              })
                            }
                          >
                            {[3, 6, 9, 12].map((n) => (
                              <option key={n} value={n}>
                                {n}학점
                              </option>
                            ))}
                          </select>
                        </div>
                      </fieldset>
                      <fieldset>
                        <legend>강좌 유형</legend>
                        <div className="choices">
                          {["대면", "SMART", "e-러닝"].map((kind) => (
                            <label
                              className={`choice ${filters.kinds.includes(kind) ? "selected" : ""}`}
                              key={kind}
                            >
                              <input
                                type="checkbox"
                                checked={filters.kinds.includes(kind)}
                                onChange={() =>
                                  setFilters({
                                    ...filters,
                                    kinds: filters.kinds.includes(kind)
                                      ? filters.kinds.filter((k) => k !== kind)
                                      : [...filters.kinds, kind],
                                  })
                                }
                              />
                              {kind}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <fieldset>
                        <legend>선호 조건</legend>
                        <label className="subLabel">과제 부담</label>
                        <Choice
                          values={[
                            [0, "적게"],
                            [1, "보통"],
                            [3, "상관없음"],
                          ]}
                          value={filters.assignment}
                          onChange={(n) =>
                            setFilters({ ...filters, assignment: Number(n) })
                          }
                        />
                        <label className="subLabel">팀플</label>
                        <Choice
                          values={[
                            [0, "없는 수업"],
                            [3, "상관없음"],
                          ]}
                          value={filters.team}
                          onChange={(n) =>
                            setFilters({ ...filters, team: Number(n) })
                          }
                        />
                        <label className="subLabel">선호 시간대</label>
                        <Choice
                          values={[
                            ["am", "오전"],
                            ["pm", "오후"],
                            ["any", "상관없음"],
                          ]}
                          value={filters.time}
                          onChange={(n) =>
                            setFilters({
                              ...filters,
                              time: n as Filters["time"],
                            })
                          }
                        />
                      </fieldset>
                      <div className="infoBox small">
                        <strong>항상 확인해요</strong>
                        <p>
                          시간 충돌 · 학점 범위 · e-러닝 개수 · 학년·학과·국적
                          수강 제한
                        </p>
                      </div>
                      <button
                        className="button primary full"
                        disabled={
                          busy ||
                          !filters.available.length ||
                          !filters.kinds.length
                        }
                        onClick={() =>
                          void run(async () => {
                            const data = await api<{ plans: Plan[] }>(
                              "/api/recommend",
                              filters,
                            );
                            setPlans(data.plans);
                            setTab(0);
                            router.push("/explore/results");
                          })
                        }
                      >
                        {busy
                          ? "추천안을 찾고 있어요…"
                          : "이 조건으로 추천받기"}
                        <span>→</span>
                      </button>
                    </aside>
                  </div>
                </>
              )}
              {path === "/explore/results" && (
                <>
                  <div className="resultTop">
                    <Link className="textLink" href="/explore">
                      ← 조건 다시 고르기
                    </Link>
                    <div className="tagRow">
                      <span className="tag">
                        {filters.min}~{filters.max}학점
                      </span>
                      {filters.kinds.map((k) => (
                        <span className="tag" key={k}>
                          {k}
                        </span>
                      ))}
                      <span className="tag">시간 충돌 없음</span>
                    </div>
                  </div>
                  <div className="resultLayout">
                    <section>
                      <div
                        className="planTabs"
                        role="tablist"
                        aria-label="추천안"
                      >
                        {(plans.length
                          ? plans
                          : [{ label: "내 성향 맞춤 추천안" }]
                        ).map((p, i) => (
                          <button
                            role="tab"
                            aria-selected={tab === i}
                            key={i}
                            className={tab === i ? "active" : ""}
                            onClick={() => setTab(i)}
                          >
                            {p.label}
                            <span>
                              {"credits" in p
                                ? `합계 ${p.credits}학점`
                                : "조건을 선택해 주세요"}
                            </span>
                          </button>
                        ))}
                      </div>
                      {plans[tab] ? (
                        <>
                          <div className="inlineNotice">
                            {plans[tab].classified
                              ? "선호 조건과 모의지원 표본을 참고한 추천안이에요."
                              : "아직 모의지원 표본이 적어 안정·도전 분류를 보류했어요."}
                          </div>
                          <div className="courseList">
                            {plans[tab].ids.map((id) => {
                              const c = byId(id)!;
                              return (
                                <CourseCard
                                  key={id}
                                  course={c}
                                  favorite={account!.favorites.includes(id)}
                                  onFavorite={() => favorite(id)}
                                  reason={plans[tab].reasons[id]}
                                />
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <Empty title="조건에 맞는 추천안이 없어요">
                          가능 시간을 넓히거나 학점·강좌 유형을 조정해 주세요.
                          <br />
                          <Link className="textLink" href="/explore">
                            조건 다시 고르기 →
                          </Link>
                        </Empty>
                      )}
                      {!account!.paid && (
                        <div className="unlockBanner">
                          <Paw size={25} />
                          <div>
                            <strong>나만의 선택지를 더 넓혀보세요.</strong>
                            <p>
                              테스트 충전 이력이 있으면 추천안 최대 3개가
                              열려요.
                            </p>
                          </div>
                          <Link href="/jelly" className="button outline">
                            젤리 알아보기
                          </Link>
                        </div>
                      )}
                      <p className="muted small">
                        모의 경쟁률은 내 리포트에서 확인할 수 있어요. 과목·교수
                        정보는 시연용 예시입니다.
                      </p>
                    </section>
                    <aside className="panel searchPanel">
                      <h2>원하는 교양이 있나요?</h2>
                      <label className="searchInput">
                        <span className="srOnly">과목 검색</span>
                        <span aria-hidden="true">⌕</span>
                        <input
                          placeholder="과목명, 교수명 검색"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </label>
                      <p className="muted small">
                        추천 밖의 과목도 검색하고 찜해 보세요.
                      </p>
                      <div className="searchResults">
                        {courses
                          .filter(
                            (c) =>
                              c.semester === SEMESTER &&
                              (!search ||
                                `${c.name} ${c.professor}`.includes(search)),
                          )
                          .map((c) => (
                            <div className="searchRow" key={c.id}>
                              <div>
                                <strong>{c.name}</strong>
                                <p>
                                  {c.professor} · {c.credits}학점
                                </p>
                              </div>
                              <button
                                className={`star ${account!.favorites.includes(c.id) ? "starred" : ""}`}
                                aria-label={`${c.name} 즐겨찾기 ${account!.favorites.includes(c.id) ? "해제" : "추가"}`}
                                aria-pressed={account!.favorites.includes(c.id)}
                                onClick={() => favorite(c.id)}
                              >
                                {account!.favorites.includes(c.id) ? "★" : "☆"}
                              </button>
                            </div>
                          ))}
                      </div>
                      <Link className="button primary full" href="/my-report">
                        즐겨찾기 {account!.favorites.length}개 · 내 리포트로 →
                      </Link>
                    </aside>
                  </div>
                </>
              )}
              {path === "/my-report" && (
                <>
                  <div className="inlineNotice">
                    <span className="statusDot" />
                    모의 경쟁률 갱신 · {date(state!.updatedAt)}
                    <span className="noticeRight">
                      지망 변경은 다음 집계에 반영돼요.
                    </span>
                  </div>
                  <section className="panel">
                    <div className="panelHeading">
                      <div>
                        <h2>나의 1·2·3지망</h2>
                        <p>
                          즐겨찾기 목록에서 원하는 과목과 순위를 골라 주세요.
                        </p>
                      </div>
                      <span className="tag blue">
                        {account!.saved ? "변경 시 젤리 1개" : "첫 저장 무료"}
                      </span>
                    </div>
                    <div className="rankGrid">
                      {draft.map((id, i) => {
                        const c = byId(id);
                        const saved =
                          account!.saved && account!.ranks[i] === id;
                        return (
                          <article
                            className={`rankCard ${c ? "rankFilled" : ""}`}
                            key={i}
                          >
                            <div className="rankCardTop">
                              <span className={`rankBadge rank${i}`}>
                                {i + 1}지망
                              </span>
                              {c && (
                                <button
                                  className="iconButton smallIcon"
                                  aria-label={`${i + 1}지망 비우기`}
                                  onClick={() => setRank(i, null)}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                            {c ? (
                              <>
                                <h3>{c.name}</h3>
                                <p>{courseMeta(c)}</p>
                                <button
                                  className="button outline full"
                                  disabled={!saved || busy}
                                  onClick={() => void openReport(c)}
                                >
                                  {account!.unlocked.includes(c.id)
                                    ? "다시 보기 (무료)"
                                    : "리포트 보기 · 젤리 1개"}
                                </button>
                              </>
                            ) : (
                              <div className="rankEmpty">
                                <span>+</span>
                                <p>아래에서 교양을 골라 주세요</p>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                    <div className="saveBar">
                      <p>
                        {dirty
                          ? account!.saved
                            ? "변경 사항이 있어요. 저장하면 젤리 1개가 차감돼요."
                            : "첫 지망 저장은 무료예요. 젤리 없이 시작하세요."
                          : account!.saved
                            ? "지망을 저장했어요. 첫 열람 이후에는 무료로 다시 볼 수 있어요."
                            : "1지망부터 순서대로 선택해 주세요."}
                      </p>
                      <button
                        className="button primary"
                        disabled={
                          busy ||
                          (!dirty && account!.saved) ||
                          (!account!.saved && !draft.some(Boolean))
                        }
                        onClick={() =>
                          void act(
                            {
                              type: "save",
                              ranks: draft,
                              version: account!.version,
                            },
                            account!.saved
                              ? "지망을 변경했어요. 젤리 1개를 사용했어요."
                              : "첫 지망을 무료로 저장했어요.",
                          )
                        }
                      >
                        {busy
                          ? "저장 중…"
                          : account!.saved
                            ? dirty
                              ? "젤리 1개로 변경"
                              : "저장됨"
                            : "무료로 저장"}
                      </button>
                    </div>
                  </section>
                  <section className="panel">
                    <div className="panelHeading">
                      <h2>
                        즐겨찾기한 교양{" "}
                        <span className="blueText">
                          {account!.favorites.length}
                        </span>
                      </h2>
                      <Link className="textLink" href="/explore">
                        교양탐색에서 더 찾기 <Arrow />
                      </Link>
                    </div>
                    {!account!.favorites.length ? (
                      <Empty title="아직 찜한 교양이 없어요">
                        교양탐색에서 마음에 드는 과목의 별을 눌러 주세요.
                      </Empty>
                    ) : (
                      <div className="favoriteList">
                        {account!.favorites.map((id) => {
                          const c = byId(id);
                          if (!c) return null;
                          return (
                            <div className="favoriteRow" key={id}>
                              <div>
                                <h3>
                                  <Paw size={18} />
                                  {c.name}
                                </h3>
                                <p>{courseMeta(c)}</p>
                              </div>
                              <div className="choices">
                                {[0, 1, 2].map((i) => (
                                  <button
                                    className={`choice ${draft[i] === id ? "selected" : ""}`}
                                    aria-pressed={draft[i] === id}
                                    key={i}
                                    onClick={() => setRank(i, id)}
                                  >
                                    {i + 1}지망
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                  <section className="panel">
                    <div className="panelHeading">
                      <div>
                        <h2>열람한 리포트</h2>
                        <p>
                          지망에서 뺀 과목도 추가 차감 없이 다시 볼 수 있어요.
                        </p>
                      </div>
                      <span className="tag">재열람 무료</span>
                    </div>
                    {account!.unlocked.length ? (
                      <div className="favoriteList">
                        {account!.unlocked.map((id) => {
                          const c = byId(id)!;
                          return (
                            <div className="favoriteRow" key={id}>
                              <div>
                                <h3>{c.name}</h3>
                                <p>{courseMeta(c)}</p>
                              </div>
                              <button
                                className="button outline"
                                disabled={busy}
                                onClick={() => void openReport(c)}
                              >
                                다시 보기 (무료)
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="muted small">
                        아직 열람한 리포트가 없어요.
                      </p>
                    )}
                  </section>
                </>
              )}
              {path === "/jelly" && (
                <>
                  <div className="jellyLayout">
                    <aside className="panel balancePanel">
                      <span className="muted">보유 젤리</span>
                      <div className="balanceNumber">
                        <Paw size={34} />
                        <strong>{account!.balance}</strong>
                        <span>개</span>
                      </div>
                      <span className="tag">유효기간 없음</span>
                      <span className="small muted">
                        {account!.paid
                          ? "추천안 최대 3개 열림"
                          : "추천안 3개 잠김 · 충전 이력 없음"}
                      </span>
                      <h3>이렇게 사용해요</h3>
                      <div className="usageRow">
                        <span>첫 지망 저장</span>
                        <b>무료</b>
                      </div>
                      <div className="usageRow">
                        <span>지망 변경</span>
                        <b>1개</b>
                      </div>
                      <div className="usageRow">
                        <span>리포트 최초 열람</span>
                        <b>1개</b>
                      </div>
                      <div className="usageRow">
                        <span>리포트 재열람</span>
                        <b className="blueText">무료</b>
                      </div>
                      <h3>최근 내역</h3>
                      {account!.entries.length ? (
                        account!.entries.slice(0, 3).map((e) => (
                          <div className="entry" key={e.id}>
                            <div>
                              <span>{e.reason}</span>
                              <small>{date(e.createdAt)}</small>
                            </div>
                            <strong className={e.delta > 0 ? "blueText" : ""}>
                              {e.delta > 0 ? "+" : "−"}
                              {Math.abs(e.delta)}
                            </strong>
                          </div>
                        ))
                      ) : (
                        <p className="muted small">아직 사용 내역이 없어요.</p>
                      )}
                      <button
                        className="button outline full"
                        onClick={() => setHistoryOpen(true)}
                      >
                        전체 내역 보기
                      </button>
                    </aside>
                    <Recharge busy={busy} mode={mode} />
                  </div>
                  <section className="panel">
                    <div className="panelHeading">
                      <div>
                        <h2>무료 젤리 얻기</h2>
                        <p>
                          여러분의 경험이 더 정확한 추천과 리포트를 만들어요.
                        </p>
                      </div>
                      <span className="tag blue">참여하고 차곡차곡</span>
                    </div>
                    <div className="earnGrid">
                      <article className="earnCard">
                        <div className="earnTop">
                          <h3>강의평 입력</h3>
                          <span className="tag">2과목마다 1개</span>
                        </div>
                        <p>
                          들었던 교양의 강의평을 남겨 주세요.
                          <br />
                          같은 강좌는 한 번만 입력할 수 있어요.
                        </p>
                        <div className="earnProgress">
                          <span>
                            이번 진행{" "}
                            {account!.reviews.filter((r) => !r.hidden).length %
                              2}{" "}
                            / 2과목
                          </span>
                          <div className="progress">
                            <i
                              style={{
                                width: `${(account!.reviews.filter((r) => !r.hidden).length % 2) * 50}%`,
                              }}
                            />
                          </div>
                        </div>
                        <Link className="button primary full" href="/reviews">
                          강의평 입력하기
                        </Link>
                      </article>
                      <article className="earnCard">
                        <div className="earnTop">
                          <h3>모의수강신청 표본</h3>
                          <span className="tag">1개</span>
                        </div>
                        <p>
                          이번 학기 1·2·3지망 후보를 알려 주세요. 개인별 지망은
                          공개되지 않아요.
                        </p>
                        <span className="muted small">
                          학기당 한 번 받을 수 있어요.
                        </span>
                        <button
                          className="button outline full"
                          disabled={!!account!.sample}
                          onClick={() => setSampleOpen(true)}
                        >
                          {account!.sample
                            ? "이번 학기 보상 받음 ✓"
                            : "지망 후보 입력하기"}
                        </button>
                      </article>
                      <article className="earnCard">
                        <div className="earnTop">
                          <h3>추천인 코드</h3>
                          <span className="tag">준비 중</span>
                        </div>
                        <p>
                          친구와 함께 더 좋은 선택을.
                          <br />
                          추천인 보상은 다음 버전에서 만나요.
                        </p>
                        <span className="muted small">
                          중복 보상 방지를 준비하고 있어요.
                        </span>
                        <button className="button outline full" disabled>
                          곧 만나요
                        </button>
                      </article>
                    </div>
                  </section>
                </>
              )}
              {path === "/reviews" && (
                <ReviewForm
                  state={state!}
                  busy={busy}
                  onSubmit={async (review) => {
                    const before = account!.balance;
                    const next = await act({ type: "review", review });
                    if (next) {
                      notify(
                        next.account.balance > before
                          ? "강의평 2과목 입력 완료! 젤리 1개를 받았어요."
                          : "강의평을 저장했어요. 한 과목 더 작성하면 젤리 1개!",
                      );
                      router.push("/jelly");
                    }
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
        <Modal title="리포트를 열까요?" onClose={() => setConfirm(null)}>
          <p className="muted">{confirm.name} · 최초 열람</p>
          <div className="costTable">
            <div>
              <span>현재 젤리</span>
              <b>{account!.balance}개</b>
            </div>
            <div>
              <span>이번에 쓰는 젤리</span>
              <b className="dangerText">1개</b>
            </div>
            <div>
              <strong>열고 난 뒤 남는 젤리</strong>
              <b>{Math.max(0, account!.balance - 1)}개</b>
            </div>
          </div>
          <p className="muted small">
            처음 열 때만 젤리 1개가 차감돼요. 이후에는 지망에서 빼도 무료로 다시
            볼 수 있어요.
          </p>
          <div className="modalActions">
            <button className="button outline" onClick={() => setConfirm(null)}>
              취소
            </button>
            {account!.balance < 1 ? (
              <Link
                className="button primary"
                href="/jelly"
                onClick={() => setConfirm(null)}
              >
                무료 젤리 받으러 가기
              </Link>
            ) : (
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void unlock()}
              >
                젤리를 사용해 리포트 열기
              </button>
            )}
          </div>
        </Modal>
      )}
      {report && (
        <Modal title={report.course.name} wide onClose={() => setReport(null)}>
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
            className="button outline full"
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
            className="textLink logout"
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
              <div className="entry" key={e.id}>
                <div>
                  {e.reason}
                  <small>{date(e.createdAt)}</small>
                </div>
                <strong className={e.delta > 0 ? "blueText" : ""}>
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
            className="button primary full"
            onClick={() => setTerms(null)}
          >
            확인했어요
          </button>
        </Modal>
      )}
    </div>
  );
}

function Choice({
  values,
  value,
  onChange,
}: {
  values: [string | number, string][];
  value: string | number;
  onChange: (n: string | number) => void;
}) {
  return (
    <div className="choices">
      {values.map(([n, label]) => (
        <button
          type="button"
          key={n}
          className={`choice ${value === n ? "selected" : ""}`}
          aria-pressed={value === n}
          onClick={() => onChange(n)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
function ProfileEditor({
  value,
  busy,
  onSave,
}: {
  value: Profile;
  busy: boolean;
  onSave: (p: Profile) => Promise<void>;
}) {
  const [profile, setProfile] = useState(value);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(profile);
      }}
    >
      <ProfileFields value={profile} onChange={setProfile} />
      <button className="button primary full" disabled={busy}>
        저장하기
      </button>
    </form>
  );
}

function AuthView({
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

function Recharge({ busy, mode }: { busy: boolean; mode: string }) {
  const [product, setProduct] = useState(12);
  return (
    <section className="panel rechargePanel">
      <h2>젤리 충전</h2>
      <p className="muted">
        충전 이력이 있으면 교양탐색 추천안 최대 3개가 열려요.
      </p>
      <div className="productGrid">
        {[
          [5, 5000, "기본"],
          [12, 10000, "더 많이"],
        ].map(([qty, price, label]) => (
          <button
            key={qty}
            aria-pressed={product === qty}
            className={`product ${product === qty ? "productSelected" : ""}`}
            onClick={() => setProduct(Number(qty))}
          >
            <div className="productHead">
              <strong>{label}</strong>
              <span className={`tag ${product === qty ? "blue" : ""}`}>
                {product === qty ? "선택됨" : "선택"}
              </span>
            </div>
            <h3>
              <Paw size={28} />
              젤리 {qty}개
            </h3>
            <p>{number(Number(price))}원</p>
            <span>개당 {qty === 5 ? "1,000" : "약 833"}원</span>
          </button>
        ))}
      </div>
      <div className="costTable">
        <div>
          <span>선택한 상품</span>
          <b>
            젤리 {product}개 · {product === 5 ? "5,000" : "10,000"}원
          </b>
        </div>
        <div>
          <span>이용 방식</span>
          <b>1차 버전 · 테스트 젤리</b>
        </div>
        <div>
          <strong>실제 결제 금액</strong>
          <b>0원</b>
        </div>
      </div>
      <div className="infoBox">
        <strong>지금은 무료 시범 운영 중이에요.</strong>
        <p className="small">
          테스트 충전은 운영자가 지급합니다. 실제 결제는 진행하지 않아요. 아래
          무료 젤리 얻기로 리포트를 이용해 보세요.
        </p>
      </div>
      <p className="muted small">
        남은 젤리는 유효기간 없이 다음 학기에도 이어서 쓸 수 있어요.
      </p>
      <button className="button primary full" disabled>
        실제 결제 준비 중
      </button>
      {mode === "demo" && (
        <p className="muted small">
          테스트 충전이 필요하면 README의 운영자 지급 명령을 사용해 주세요.
        </p>
      )}
    </section>
  );
}

function SampleForm({
  courses,
  initial,
  busy,
  onSubmit,
}: {
  courses: Course[];
  initial: (string | null)[];
  busy: boolean;
  onSubmit: (r: (string | null)[]) => Promise<void>;
}) {
  const [ranks, setRanks] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(ranks);
      }}
    >
      <p className="muted">
        이번 학기에 수강하고 싶은 교양을 알려 주세요. 제출하면 젤리 1개를
        받아요.
      </p>
      {[0, 1, 2].map((i) => (
        <label key={i}>
          {i + 1}지망
          <select
            value={ranks[i] ?? ""}
            required={i === 0}
            onChange={(e) =>
              setRanks((old) =>
                old.map((id, j) => (j === i ? e.target.value || null : id)),
              )
            }
          >
            <option value="">
              {i === 0 ? "교양을 선택해 주세요" : "선택 안 함"}
            </option>
            {courses.map((c) => (
              <option
                key={c.id}
                value={c.id}
                disabled={ranks.some((id, j) => j !== i && id === c.id)}
              >
                {c.name} · {c.professor}
              </option>
            ))}
          </select>
        </label>
      ))}
      <div className="infoBox small">
        개인별 지망은 공개되지 않고, 과목별 합산 통계로만 표시돼요. 저장한
        지망이 있으면 표본과 중복 집계하지 않아요.
      </div>
      <button className="button primary full" disabled={busy}>
        제출하고 젤리 1개 받기
      </button>
    </form>
  );
}

function ReviewForm({
  state,
  busy,
  onSubmit,
}: {
  state: Snapshot;
  busy: boolean;
  onSubmit: (
    r: Extract<Mutation, { type: "review" }>["review"],
  ) => Promise<void>;
}) {
  const [semester, setSemester] = useState("2026-1");
  const [courseId, setCourseId] = useState("");
  const [rating, setRating] = useState(4);
  const [grade, setGrade] = useState("B+");
  const [assignment, setAssignment] = useState(1);
  const [team, setTeam] = useState(0);
  const [exams, setExams] = useState(2);
  const [attendance, setAttendance] = useState(["전자출결"]);
  const [text, setText] = useState("");
  const offered = state.courses.filter((c) => c.semester === semester);
  const selected = offered.find((c) => c.id === courseId);
  const completed = state.account.reviews.map((r) => r.courseId);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({
          courseId,
          rating,
          grade,
          assignment,
          team,
          exams,
          attendance,
          text,
        });
      }}
    >
      <Link className="textLink" href="/jelly">
        ← 젤리로
      </Link>
      <section className="panel reviewProgress">
        <div className="panelHeading">
          <h2>강의평 입력</h2>
          <strong className="small">
            이번 진행{" "}
            {state.account.reviews.filter((r) => !r.hidden).length % 2} / 2과목
            · 2과목마다 젤리 1개
          </strong>
        </div>
        <div className="progress">
          <i
            style={{
              width: `${(state.account.reviews.filter((r) => !r.hidden).length % 2) * 50}%`,
            }}
          />
        </div>
      </section>
      <section className="panel">
        <h2>1. 강좌 고르기</h2>
        <p className="muted small">
          직접 입력하지 않고 목록에서 골라 주세요. 교수별 과거 데이터가 정확히
          묶여요.
        </p>
        <div className="formGrid">
          <label>
            ① 수강 학기
            <select
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                setCourseId("");
              }}
            >
              {["2026-1", "2026-2"].map((s) => (
                <option key={s} value={s}>
                  {s.replace("-", "학년도 ")}학기
                </option>
              ))}
            </select>
          </label>
          <label>
            ② 과목 (그 학기 개설 강좌)
            <select
              required
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">과목 선택</option>
              {offered.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                  disabled={completed.includes(c.id)}
                >
                  {c.name}
                  {completed.includes(c.id) ? " · 작성 완료" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            ③ 담당 교수
            <input
              readOnly
              value={selected?.professor ?? "과목을 먼저 선택해 주세요"}
            />
          </label>
          <label>
            ④ 분반
            <input
              readOnly
              value={
                selected
                  ? `${selected.section}분반`
                  : "과목을 먼저 선택해 주세요"
              }
            />
          </label>
        </div>
        <p className="muted small">
          이미 입력한 강좌는 목록에서 비활성화돼요. 강좌 정보는 시연용
          예시입니다.
        </p>
      </section>
      <section className="panel reviewFields">
        <h2>2. 수업 평가</h2>
        <fieldset>
          <legend>만족도</legend>
          <div className="ratingPaws" role="group" aria-label="만족도">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                aria-label={`${n}점`}
                aria-pressed={rating === n}
                className={n <= rating ? "rated" : ""}
                onClick={() => setRating(n)}
              >
                <Paw size={35} />
              </button>
            ))}
            <span>{rating} / 5</span>
          </div>
        </fieldset>
        <fieldset>
          <legend>받은 성적 구간</legend>
          <Choice
            values={["A+", "A0", "B+", "B0", "C 이하", "P", "F"].map((g) => [
              g,
              g,
            ])}
            value={grade}
            onChange={(n) => setGrade(String(n))}
          />
        </fieldset>
        <fieldset>
          <legend>과제 빈도</legend>
          <Choice
            values={[
              [0, "없음"],
              [1, "적음"],
              [2, "보통"],
              [3, "많음"],
            ]}
            value={assignment}
            onChange={(n) => setAssignment(Number(n))}
          />
        </fieldset>
        <fieldset>
          <legend>팀플</legend>
          <Choice
            values={[
              [0, "없음"],
              [1, "적음"],
              [2, "보통"],
              [3, "많음"],
            ]}
            value={team}
            onChange={(n) => setTeam(Number(n))}
          />
        </fieldset>
        <fieldset>
          <legend>시험 횟수</legend>
          <Choice
            values={[
              [0, "없음"],
              [1, "1회"],
              [2, "2회"],
              [3, "3회 이상"],
            ]}
            value={exams}
            onChange={(n) => setExams(Number(n))}
          />
        </fieldset>
        <fieldset>
          <legend>
            출석 평가 방식{" "}
            <span className="muted small">여러 개 선택 가능</span>
          </legend>
          <div className="choices">
            {["전자출결", "호명", "서명", "반영 안 함"].map((a) => (
              <button
                type="button"
                key={a}
                className={`choice ${attendance.includes(a) ? "selected" : ""}`}
                aria-pressed={attendance.includes(a)}
                onClick={() =>
                  setAttendance(
                    attendance.includes(a)
                      ? attendance.filter((x) => x !== a)
                      : [...attendance, a],
                  )
                }
              >
                {a}
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          한 줄 강의평
          <textarea
            required
            minLength={5}
            maxLength={300}
            rows={4}
            placeholder="수업 분위기, 추천하는 학생 유형 등을 짧게 남겨 주세요."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <p className="muted small">
          허위 내용·비방·개인정보(이름, 연락처 등)는 쓰지 마세요. 신고된
          강의평은 임시 숨김 후 검토합니다.{" "}
          <span className="floatRight">{text.length}/300</span>
        </p>
      </section>
      <div className="formActions">
        <Link className="button outline" href="/jelly">
          취소
        </Link>
        <button
          className="button primary"
          disabled={busy || !courseId || !attendance.length}
        >
          {busy ? "저장 중…" : "강의평 제출하기"}
        </button>
      </div>
    </form>
  );
}

function ReportView({
  report,
  busy,
  onReport,
}: {
  report: Report;
  busy: boolean;
  onReport: (id: string) => Promise<void>;
}) {
  const { course, stats, reviews } = report;
  const sufficient = stats.ranks[0] >= 5 && course.capacity > 0;
  const ratio = course.capacity
    ? Math.round((stats.ranks[0] / course.capacity) * 100)
    : null;
  const level =
    ratio === null
      ? "정원 정보 없음"
      : ratio < 100
        ? "낮음"
        : ratio <= 300
          ? "보통"
          : "높음";
  const displayRating =
    report.rating !== null
      ? report.rating.toFixed(1)
      : course.example
        ? course.rating?.toFixed(1)
        : null;
  const grades = report.grades.length
    ? report.grades
    : !reviews.length && course.example
      ? course.grades
      : [];
  return (
    <div className="reportBody">
      <p className="reportMeta">
        {courseMeta(course)} · {course.kind}
      </p>
      {report.example && (
        <div className="inlineNotice small">
          과목·교수와 기본 수업 정보는 시연용 예시입니다. 모의지원 인원과 작성된
          강의평은 실제 입력을 반영해요.
        </div>
      )}
      <div className="reportSummary">
        <strong>한 줄 요약</strong>
        <span className="tag">경쟁 {sufficient ? level : "표본 부족"}</span>
        <span className="tag">
          평가 {displayRating ?? "없음"}
          {!reviews.length && displayRating ? " (예시)" : ""}
        </span>
        <span className="tag">팀플 {course.team ? "있음" : "없음"} (예시)</span>
      </div>
      <section className="panel reportSection">
        <div className="panelHeading">
          <h2>모의 경쟁률</h2>
          <span className="muted small">
            표본 {stats.sampleSize}명 · {date(stats.updatedAt)} 갱신
          </span>
        </div>
        <div className="competition">
          <div>
            <p className="muted">1지망 기준 정원 대비</p>
            <strong className="ratio">
              {sufficient ? `${ratio}%` : "표본 부족"}
            </strong>
            <span className="tag blue">
              {sufficient ? level : "1지망 5명 미만"}
            </span>
          </div>
          <div className="rankBars">
            {stats.ranks.map((n, i) => (
              <div key={i}>
                <span>{i + 1}지망</span>
                <div className="barTrack">
                  <i
                    style={{
                      width: `${sufficient ? Math.max(2, (n / Math.max(...stats.ranks, 1)) * 100) : 0}%`,
                    }}
                  />
                </div>
                <b>{sufficient ? `${n}명` : "—"}</b>
              </div>
            ))}
            <p className="muted small">
              정원 {course.capacity || "정보 없음"}명 · 낮음 100% 미만 / 보통
              100~300% / 높음 300% 초과
            </p>
          </div>
        </div>
        <p className="muted small">
          교냥픽 이용자의 지망·표본 입력으로 만든 모의 경쟁률이며 실제 경쟁률이
          아닙니다. 변경한 지망은 다음 집계에 반영됩니다.
        </p>
      </section>
      <section className="panel reportSection">
        <div className="panelHeading">
          <h2>강의평 · 별점</h2>
          <span className="muted small">
            교냥픽 사용자 강의평 {reviews.length}건
          </span>
        </div>
        <p className="reportRating">
          <strong>{displayRating ?? "—"}</strong> / 5{" "}
          <span>{reviews.length ? "만족도 평균" : "시연용 예시 평가"}</span>
        </p>
        <div className="infoBox">
          <strong>강의평 요약</strong>
          <p>
            {reviews.length
              ? `현재 ${reviews.length}개의 강의평이 있어요. 아래 원문에서 수업 경험을 확인해 주세요.`
              : "아직 작성된 강의평이 없어요. 첫 강의평을 기다리고 있어요."}
          </p>
          <span className="small muted">
            AI 요약은 다음 버전에서 제공할 예정이에요.
          </span>
        </div>
        {reviews.map((r) => (
          <div className="reviewRow" key={r.id}>
            <div>
              <p>“{r.text}”</p>
              <span className="muted small">
                {course.semester}학기 · 만족도 {r.rating}/5
              </span>
            </div>
            <button
              className="button outline smallButton"
              disabled={busy}
              onClick={() => void onReport(r.id)}
            >
              신고
            </button>
          </div>
        ))}
      </section>
      <section className="panel reportSection">
        <div className="panelHeading">
          <h2>성적 비율</h2>
          <span className="muted small">
            {report.grades.length
              ? "사용자 성적 구간 응답 · P/F 제외"
              : "시연용 예시 분포"}
          </span>
        </div>
        {grades.length ? (
          <div className="gradeBar">
            {grades.map((n, i) => (
              <div key={i} style={{ flex: n || 0.01 }}>
                <span>
                  {["A 이상", "B대", "C 이하"][i]} {n}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">데이터 없음</p>
        )}
      </section>
      <section className="panel reportSection">
        <h2>과제 · 팀플 · 시험 · 출석</h2>
        <p className="muted small">
          시연용 기본 수업 정보 · 실제 후기 원문과 구분해 확인해 주세요.
        </p>
        <div className="factsGrid">
          {[
            ["과제 빈도", ["없음", "적음", "보통", "많음"][course.assignment]],
            ["팀플", course.team ? "있음" : "없음"],
            ["시험 횟수", "2회"],
            ["출석 평가", "전자출결"],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="panel reportSection">
        <h2>담당 교수 과거 데이터</h2>
        <p className="muted">
          데이터 없음 · 이전 학기 후기가 쌓이면 제공할 예정이에요.
        </p>
      </section>
      <p className="muted small center">
        이 리포트는 이후에도 추가 젤리 없이 다시 볼 수 있어요.
      </p>
    </div>
  );
}
