"use client";

import { useRef, useState } from "react";
import { DEPARTMENTS, SEMESTER } from "@/lib/catalog";
import type { Course, Entry } from "@/lib/types";
import Moderation from "./moderation";
import { Empty, date } from "./shared";

type AdminUser = { id: string; email: string; balance: number; entries: Entry[] };
const KINDS: Course["kind"][] = ["대면", "SMART-F", "SMART-B", "e-러닝 A", "e-러닝 C", "e-러닝 D"];
const DAYS = "월화수목금";
const BLANK: Course = {
  id: "",
  code: "",
  name: "",
  professor: "",
  section: "01",
  semester: SEMESTER,
  credits: 3,
  area: "",
  kind: "대면",
  capacity: 30,
  meetings: [{ day: 0, start: 9, end: 11 }],
  assignment: 1,
  team: 0,
  rating: null,
  grades: [],
  excludedNationalities: [],
  excludedDepartments: [],
  years: [1, 2, 3, 4],
  passFail: false,
  internationalException: false,
  example: false,
};

// Calls an admin API. A route that does not exist yet falls through to the app's HTML page,
// so any non-JSON reply means the backend part is not deployed.
async function adminApi<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(
    url,
    body
      ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : { cache: "no-store" },
  );
  if (!res.headers.get("content-type")?.includes("json"))
    throw new Error("관리자 API가 아직 준비되지 않았어요. (docs/admin-api.md)");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "요청을 처리하지 못했어요.");
  return data;
}

// Light client-side check so obvious mistakes are caught before upload; the server validates again.
export function courseProblem(c: Course): string | null {
  if (!c.code.trim() || !c.name.trim() || !c.professor.trim()) return "과목 코드·과목명·교수를 입력해 주세요.";
  if (!/^\d{4}-[12]$/.test(c.semester)) return "학기는 2026-2 형식이에요.";
  if (!KINDS.includes(c.kind)) return "강좌 유형을 확인해 주세요.";
  if (!(c.credits >= 1 && c.credits <= 6)) return "학점은 1~6이에요.";
  if (!(c.capacity >= 0)) return "정원은 0 이상이에요.";
  if (!c.years.length) return "수강 가능한 학년을 하나 이상 골라 주세요.";
  if (!c.kind.startsWith("e-러닝") && !c.meetings.length) return "수업 시간을 하나 이상 넣어 주세요.";
  if (c.meetings.some((m) => !(m.day >= 0 && m.day <= 4 && m.start >= 9 && m.end <= 22 && m.start < m.end)))
    return "수업 시간은 월~금, 9~22시, 시작이 끝보다 빨라야 해요.";
  return null;
}

export default function AdminPage({
  allowed,
  courses,
  onCoursesChanged,
  notify,
}: {
  allowed: boolean;
  courses: Course[];
  onCoursesChanged: () => Promise<void>;
  notify: (text: string, error?: boolean) => void;
}) {
  const [tab, setTab] = useState<"courses" | "jelly" | "reports">("courses");
  if (!allowed)
    return (
      <div className="card">
        <Empty title="운영자만 들어올 수 있어요">운영자로 지정된 계정으로 로그인해 주세요.</Empty>
      </div>
    );
  return (
    <>
      <div className="card titleCard column">
        <div>
          <span className="stepLabel">ADMIN</span>
          <h1>관리자 모드</h1>
          <p>강좌를 추가·수정하고, 이용자 젤리를 조정하고, 신고된 강의평을 검토해요.</p>
        </div>
        <div className="tabs" role="tablist" aria-label="관리 메뉴">
          {(
            [
              ["courses", "강좌 관리"],
              ["jelly", "젤리 조정"],
              ["reports", "신고 검토"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`tab ${tab === key ? "on" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "courses" && (
        <CourseAdmin courses={courses} onChanged={onCoursesChanged} notify={notify} />
      )}
      {tab === "jelly" && <JellyAdmin notify={notify} />}
      {tab === "reports" && <Moderation courses={courses} allowed />}
    </>
  );
}

function CourseAdmin({
  courses,
  onChanged,
  notify,
}: {
  courses: Course[];
  onChanged: () => Promise<void>;
  notify: (text: string, error?: boolean) => void;
}) {
  const [form, setForm] = useState<Course>(BLANK);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const editing = courses.some((c) => c.id === form.id);
  const set = <K extends keyof Course>(key: K, value: Course[K]) => setForm({ ...form, [key]: value });
  const list = courses.filter((c) =>
    `${c.code} ${c.name} ${c.professor} ${c.semester}`.includes(query.trim()),
  );

  async function save() {
    const course = {
      ...form,
      id: form.id || `${form.semester}-${form.code}-${form.section}`.toLowerCase(),
      code: form.code.trim(),
      name: form.name.trim(),
      professor: form.professor.trim(),
      area: form.area.trim(),
      meetings: form.kind.startsWith("e-러닝") ? [] : form.meetings,
      example: false,
      rating: null,
      grades: [],
    };
    const problem = courseProblem(course);
    if (problem) return notify(problem, true);
    setBusy(true);
    try {
      await adminApi("/api/admin/courses", { course });
      await onChanged();
      notify(editing ? "강좌를 수정했어요." : "강좌를 추가했어요.");
      setForm(BLANK);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(courses, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gyonyang-courses-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importJson(f: File) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await f.text());
    } catch {
      return notify("JSON 파일 형식이 올바르지 않아요.", true);
    }
    if (!Array.isArray(parsed)) return notify("강좌 배열([...]) 형식의 JSON이어야 해요.", true);
    const items = parsed as Course[];
    const bad = items.findIndex((c) => !c || typeof c !== "object" || !c.id || courseProblem({ ...BLANK, ...c }));
    if (bad >= 0)
      return notify(`${bad + 1}번째 강좌를 확인해 주세요: ${items[bad]?.id ? courseProblem({ ...BLANK, ...items[bad] }) : "id가 없어요."}`, true);
    setBusy(true);
    try {
      const r = await adminApi<{ added: number; updated: number }>("/api/admin/courses/import", {
        courses: items.map((c) => ({ ...BLANK, ...c, example: false })),
      });
      await onChanged();
      notify(`가져오기 완료 · 추가 ${r.added}개, 수정 ${r.updated}개`);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }

  return (
    <div className="adminLayout">
      <section className="card stack" aria-labelledby="course-form">
        <div className="cardHead">
          <h2 id="course-form">{editing ? "강좌 수정" : "강좌 추가"}</h2>
          {editing && (
            <button type="button" className="btn outline small" onClick={() => setForm(BLANK)}>
              새 강좌로
            </button>
          )}
        </div>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="formGrid">
            <label className="field">
              학기
              <input value={form.semester} onChange={(e) => set("semester", e.target.value)} placeholder="2026-2" />
            </label>
            <label className="field">
              과목 코드
              <input required value={form.code} onChange={(e) => set("code", e.target.value)} />
            </label>
            <label className="field">
              과목명
              <input required value={form.name} onChange={(e) => set("name", e.target.value)} />
            </label>
            <label className="field">
              교수
              <input required value={form.professor} onChange={(e) => set("professor", e.target.value)} />
            </label>
            <label className="field">
              분반
              <input value={form.section} onChange={(e) => set("section", e.target.value)} />
            </label>
            <label className="field">
              영역
              <input value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="인문과 예술" />
            </label>
            <label className="field">
              강좌 유형
              <select value={form.kind} onChange={(e) => set("kind", e.target.value as Course["kind"])}>
                {KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="field">
              학점
              <input type="number" min={1} max={6} value={form.credits} onChange={(e) => set("credits", Number(e.target.value))} />
            </label>
            <label className="field">
              정원
              <input type="number" min={0} value={form.capacity} onChange={(e) => set("capacity", Number(e.target.value))} />
            </label>
            <label className="field">
              과제 (0 없음 ~ 3 많음)
              <input type="number" min={0} max={3} value={form.assignment} onChange={(e) => set("assignment", Number(e.target.value))} />
            </label>
            <label className="field">
              팀플 (0 없음 ~ 3 많음)
              <input type="number" min={0} max={3} value={form.team} onChange={(e) => set("team", Number(e.target.value))} />
            </label>
            <label className="field">
              제외 국적 (쉼표로 구분, 예: CN, JP)
              <input
                value={form.excludedNationalities.join(", ")}
                onChange={(e) =>
                  set("excludedNationalities", e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))
                }
              />
            </label>
          </div>

          {!form.kind.startsWith("e-러닝") && (
            <fieldset className="stack small-gap">
              <legend className="miniTitle">수업 시간</legend>
              {form.meetings.map((m, i) => (
                <div className="meetingRow" key={i}>
                  <select
                    aria-label={`${i + 1}번째 수업 요일`}
                    value={m.day}
                    onChange={(e) => set("meetings", form.meetings.map((x, j) => (j === i ? { ...x, day: Number(e.target.value) } : x)))}
                  >
                    {[...DAYS].map((d, n) => (
                      <option key={d} value={n}>
                        {d}요일
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={9}
                    max={21}
                    aria-label={`${i + 1}번째 수업 시작 시각`}
                    value={m.start}
                    onChange={(e) => set("meetings", form.meetings.map((x, j) => (j === i ? { ...x, start: Number(e.target.value) } : x)))}
                  />
                  <span>~</span>
                  <input
                    type="number"
                    min={10}
                    max={22}
                    aria-label={`${i + 1}번째 수업 종료 시각`}
                    value={m.end}
                    onChange={(e) => set("meetings", form.meetings.map((x, j) => (j === i ? { ...x, end: Number(e.target.value) } : x)))}
                  />
                  <span>시</span>
                  <button
                    type="button"
                    className="btn outline small"
                    aria-label={`${i + 1}번째 수업 시간 빼기`}
                    onClick={() => set("meetings", form.meetings.filter((_, j) => j !== i))}
                  >
                    빼기
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn outline small fitContent"
                onClick={() => set("meetings", [...form.meetings, { day: 0, start: 9, end: 11 }])}
              >
                + 수업 시간 추가
              </button>
            </fieldset>
          )}

          <fieldset className="stack small-gap">
            <legend className="miniTitle">수강 가능 학년</legend>
            <div className="choices">
              {[1, 2, 3, 4].map((y) => {
                const on = form.years.includes(y);
                return (
                  <label key={y} className={`choice ${on ? "on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => set("years", on ? form.years.filter((v) => v !== y) : [...form.years, y].sort())}
                    />
                    {y}학년
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="field">
            수강 제외 학과 (Ctrl 또는 Shift로 여러 개 선택)
            <select
              multiple
              className="multiSelect"
              value={form.excludedDepartments}
              onChange={(e) => set("excludedDepartments", [...e.target.selectedOptions].map((o) => o.value))}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>

          <div className="choices">
            <label className={`choice ${form.passFail ? "on" : ""}`}>
              <input type="checkbox" checked={form.passFail} onChange={() => set("passFail", !form.passFail)} />
              P/F 과목
            </label>
            <label className={`choice ${form.internationalException ? "on" : ""}`}>
              <input
                type="checkbox"
                checked={form.internationalException}
                onChange={() => set("internationalException", !form.internationalException)}
              />
              유학생 e-러닝 개수 제한 예외
            </label>
          </div>

          <button className="btn primary full lg" disabled={busy}>
            {busy ? "저장 중…" : editing ? "강좌 수정 저장" : "강좌 추가"}
          </button>
        </form>
      </section>

      <section className="card stack" aria-labelledby="course-list">
        <div className="cardHead">
          <h2 id="course-list">등록된 강좌 ({courses.length})</h2>
          <div className="choices">
            <button type="button" className="btn outline small" onClick={exportJson}>
              JSON 내보내기
            </button>
            <button type="button" className="btn outline small" disabled={busy} onClick={() => file.current?.click()}>
              JSON 가져오기
            </button>
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => e.target.files?.[0] && void importJson(e.target.files[0])}
            />
          </div>
        </div>
        <p className="note">
          JSON은 강좌 객체 배열이에요. 내보낸 파일을 고쳐서 다시 가져오면 같은 <code>id</code>는 수정되고 새 <code>id</code>는
          추가돼요.
        </p>
        <label className="srOnly" htmlFor="course-q">
          강좌 검색
        </label>
        <input id="course-q" type="search" placeholder="코드·과목명·교수·학기로 찾기" value={query} onChange={(e) => setQuery(e.target.value)} />
        <ul className="plainList adminList">
          {list.map((c) => (
            <li className="listRow" key={c.id}>
              <div>
                <strong>
                  {c.name} {c.example && <span className="tag">예시</span>}
                </strong>
                <span className="muted small">
                  {c.semester} · {c.code}-{c.section} · {c.professor} · {c.kind} · {c.credits}학점 · 정원 {c.capacity}
                </span>
              </div>
              <button type="button" className="btn outline small" onClick={() => setForm({ ...BLANK, ...c })}>
                수정
              </button>
            </li>
          ))}
          {!list.length && <li className="muted">찾는 강좌가 없어요.</li>}
        </ul>
      </section>
    </div>
  );
}

function JellyAdmin({ notify }: { notify: (text: string, error?: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [picked, setPicked] = useState<AdminUser | null>(null);
  const [delta, setDelta] = useState(1);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function search() {
    setBusy(true);
    try {
      const r = await adminApi<{ users: AdminUser[] }>(`/api/admin/users?email=${encodeURIComponent(email.trim())}`);
      setUsers(r.users);
      setPicked(r.users.length === 1 ? r.users[0] : null);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  async function adjust() {
    if (!picked) return;
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100)
      return notify("조정 수량은 −100~100 사이의 0이 아닌 정수예요.", true);
    if (reason.trim().length < 2) return notify("조정 사유를 2자 이상 적어 주세요.", true);
    if (picked.balance + delta < 0) return notify("잔액보다 많이 차감할 수 없어요.", true);
    setBusy(true);
    try {
      const r = await adminApi<{ user: AdminUser }>("/api/admin/jelly", {
        userId: picked.id,
        delta,
        reason: reason.trim(),
        requestId: crypto.randomUUID(),
      });
      setPicked(r.user);
      setUsers((old) => old?.map((u) => (u.id === r.user.id ? r.user : u)) ?? null);
      setReason("");
      notify(`${r.user.email} 잔액을 ${r.user.balance}개로 조정했어요.`);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adminLayout">
      <section className="card stack" aria-labelledby="user-search">
        <h2 id="user-search">이용자 찾기</h2>
        <form
          className="inlineForm"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <label className="srOnly" htmlFor="user-email">
            이용자 이메일
          </label>
          <input id="user-email" required minLength={2} placeholder="이메일 앞부분" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn primary" disabled={busy}>
            검색
          </button>
        </form>
        {users &&
          (users.length ? (
            <ul className="plainList">
              {users.map((u) => (
                <li className="listRow" key={u.id}>
                  <div>
                    <strong>{u.email}</strong>
                    <span className="muted small">잔액 {u.balance}개</span>
                  </div>
                  <button
                    type="button"
                    className={`btn small ${picked?.id === u.id ? "primary" : "outline"}`}
                    aria-pressed={picked?.id === u.id}
                    onClick={() => setPicked(u)}
                  >
                    {picked?.id === u.id ? "선택됨" : "선택"}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">해당하는 이용자가 없어요.</p>
          ))}
      </section>

      <section className="card stack" aria-labelledby="jelly-adjust">
        <h2 id="jelly-adjust">젤리 조정</h2>
        {picked ? (
          <>
            <p>
              <strong>{picked.email}</strong> · 현재 <strong>{picked.balance}개</strong>
            </p>
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                void adjust();
              }}
            >
              <div className="formGrid">
                <label className="field">
                  수량 (지급은 +, 차감은 −)
                  <input type="number" min={-100} max={100} step={1} value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
                </label>
                <label className="field">
                  사유
                  <input required minLength={2} maxLength={100} placeholder="예: 시연 계정 지급" value={reason} onChange={(e) => setReason(e.target.value)} />
                </label>
              </div>
              <p className="note">
                젤리는 지우지 않고 조정 내역으로 남겨요. 잘못 준 젤리는 같은 수만큼 반대로 조정하세요. 조정 후 잔액:{" "}
                <b>{picked.balance + (Number.isInteger(delta) ? delta : 0)}개</b>
              </p>
              <button className="btn primary lg" disabled={busy}>
                {busy ? "처리 중…" : delta > 0 ? `젤리 ${delta}개 지급` : `젤리 ${Math.abs(delta)}개 차감`}
              </button>
            </form>
            <h3>최근 내역</h3>
            {picked.entries.length ? (
              <ul className="plainList entries">
                {picked.entries.map((e) => (
                  <li key={e.id}>
                    <div>
                      <span>{e.reason}</span>
                      <small>{date(e.createdAt)}</small>
                    </div>
                    <b className={e.delta > 0 ? "accentText" : ""}>
                      {e.delta > 0 ? "+" : "−"}
                      {Math.abs(e.delta)}
                    </b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">내역이 없어요.</p>
            )}
          </>
        ) : (
          <p className="muted">왼쪽에서 이용자를 검색해 선택해 주세요.</p>
        )}
      </section>
    </div>
  );
}
