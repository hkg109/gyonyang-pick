"use client";

import { useState } from "react";
import Link from "next/link";
import { SEMESTER } from "@/lib/catalog";
import type { Mutation, Snapshot } from "@/lib/types";
import { Choice, Empty, Paw } from "./shared";

type ReviewInput = Extract<Mutation, { type: "review" }>["review"];
const LEVELS: [number, string][] = [
  [0, "없음"],
  [1, "적음"],
  [2, "보통"],
  [3, "많음"],
];
const unique = (values: string[]) => [...new Set(values)];

export default function ReviewForm({
  state,
  busy,
  onSubmit,
}: {
  state: Snapshot;
  busy: boolean;
  onSubmit: (r: ReviewInput, stay: boolean) => Promise<boolean>;
}) {
  // Reviews are only for courses already taken, so the current semester is not offered.
  const semesters = unique(
    state.courses.map((c) => c.semester).filter((s) => s !== SEMESTER),
  ).sort((a, b) => b.localeCompare(a));
  const [semester, setSemester] = useState(semesters[0] ?? "");
  const [name, setName] = useState("");
  const [professor, setProfessor] = useState("");
  const [section, setSection] = useState("");
  const [rating, setRating] = useState(4);
  const [grade, setGrade] = useState("B+");
  const [assignment, setAssignment] = useState(1);
  const [team, setTeam] = useState(0);
  const [exams, setExams] = useState(2);
  const [attendance, setAttendance] = useState(["전자출결"]);
  const [text, setText] = useState("");

  const offered = state.courses.filter((c) => c.semester === semester);
  const byName = offered.filter((c) => c.name === name);
  const byProfessor = byName.filter((c) => c.professor === professor);
  const course = byProfessor.find((c) => c.section === section);
  const completed = state.account.reviews.map((r) => r.courseId);
  const done = (list: typeof offered) => list.every((c) => completed.includes(c.id));
  const progress = state.account.reviews.filter((r) => !r.hidden).length % 2;

  function resetCourse() {
    setName("");
    setProfessor("");
    setSection("");
    setText("");
  }
  async function submit(stay: boolean) {
    if (!course) return;
    const ok = await onSubmit(
      { courseId: course.id, rating, grade, assignment, team, exams, attendance, text },
      stay,
    );
    if (ok && stay) resetCourse();
  }

  if (!semesters.length)
    return (
      <div className="card">
        <Empty title="강의평을 남길 수 있는 지난 학기 강좌가 없어요">
          지난 학기 강좌 정보가 등록되면 강의평을 입력할 수 있어요.{" "}
          <Link className="textLink" href="/jelly">
            젤리로 돌아가기 →
          </Link>
        </Empty>
      </div>
    );
  return (
    <form
      className="reviewForm"
      onSubmit={(e) => {
        e.preventDefault();
        const stay = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "stay";
        void submit(stay);
      }}
    >
      <div className="card stack">
        <Link className="backLink" href="/jelly">
          ← 젤리로
        </Link>
        <div className="rowBetween">
          <h1>강의평 입력</h1>
          <strong className="small">
            이번 입력 {progress} / 2과목 · 2과목마다 젤리 1개
          </strong>
        </div>
        <div className="progress">
          <i style={{ width: `${progress * 50}%` }} />
        </div>
      </div>

      <section className="card stack">
        <h2>1. 강좌 고르기</h2>
        <p className="muted">
          직접 입력하지 않고 목록에서 차례로 골라요. 교수별 과거 데이터가 정확히 묶여요.
        </p>
        <div className="formGrid">
          <label className="field">
            ① 수강 학기
            <select
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                resetCourse();
              }}
            >
              {semesters.map((s) => (
                <option key={s} value={s}>
                  {s.replace("-", "학년도 ")}학기
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            ② 과목 (그 학기 개설 강좌)
            <select
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setProfessor("");
                setSection("");
              }}
            >
              <option value="">과목 선택</option>
              {unique(offered.map((c) => c.name)).map((n) => (
                <option key={n} value={n} disabled={done(offered.filter((c) => c.name === n))}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            ③ 담당 교수
            <select
              required
              value={professor}
              disabled={!name}
              onChange={(e) => {
                setProfessor(e.target.value);
                setSection("");
              }}
            >
              <option value="">교수 선택</option>
              {unique(byName.map((c) => c.professor)).map((p) => (
                <option key={p} value={p} disabled={done(byName.filter((c) => c.professor === p))}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            ④ 분반
            <select
              required
              value={section}
              disabled={!professor}
              onChange={(e) => setSection(e.target.value)}
            >
              <option value="">분반 선택</option>
              {byProfessor.map((c) => (
                <option key={c.id} value={c.section} disabled={completed.includes(c.id)}>
                  {c.section}분반{completed.includes(c.id) ? " · 작성 완료" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted small">
          이미 입력한 강좌(과목·교수·분반)는 목록에서 비활성화돼요. 강좌 정보는 시연용 예시입니다.
        </p>
      </section>

      <section className="card stack reviewFields">
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
                className={n <= rating ? "on" : ""}
                onClick={() => setRating(n)}
              >
                <Paw size={34} />
              </button>
            ))}
            <span className="muted">{rating} / 5</span>
          </div>
        </fieldset>
        <fieldset>
          <legend>받은 성적 구간</legend>
          <Choice
            pill
            values={["A+", "A0", "B+", "B0", "C 이하", "P", "F"].map((g) => [g, g])}
            value={grade}
            onChange={(n) => setGrade(String(n))}
          />
        </fieldset>
        <fieldset>
          <legend>과제 빈도</legend>
          <Choice pill values={LEVELS} value={assignment} onChange={(n) => setAssignment(Number(n))} />
        </fieldset>
        <fieldset>
          <legend>팀플</legend>
          <Choice pill values={LEVELS} value={team} onChange={(n) => setTeam(Number(n))} />
        </fieldset>
        <fieldset>
          <legend>시험 횟수</legend>
          <Choice
            pill
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
            출석 평가 방식 <span className="muted small">여러 개 선택 가능</span>
          </legend>
          <div className="choices">
            {["전자출결", "호명", "서명", "반영 안 함"].map((a) => (
              <button
                type="button"
                key={a}
                className={`pill ${attendance.includes(a) ? "on" : ""}`}
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
        <label className="field">
          한 줄 강의평
          <textarea
            required
            minLength={5}
            maxLength={300}
            rows={4}
            placeholder="수업 분위기, 추천하는 학생 유형 등을 짧게 남겨 주세요"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <p className="muted small rowBetween">
          <span>
            허위 내용·비방·개인정보(이름, 연락처 등)는 쓰지 마세요. 신고가 접수된 강의평은 임시로
            숨긴 뒤 운영자가 검토해요.
          </span>
          <span>{text.length}/300</span>
        </p>
      </section>

      <div className="formActions">
        <button
          className="btn outline lg"
          name="mode"
          value="stay"
          disabled={busy || !course || !attendance.length}
        >
          저장하고 다음 과목 입력
        </button>
        <button
          className="btn primary lg"
          name="mode"
          value="done"
          disabled={busy || !course || !attendance.length}
        >
          {busy ? "저장 중…" : "제출하고 젤리 받기"}
        </button>
      </div>
    </form>
  );
}
