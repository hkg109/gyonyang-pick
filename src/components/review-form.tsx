"use client";

import { useState } from "react";
import Link from "next/link";
import type { Mutation, Snapshot } from "@/lib/types";
import { Choice, Paw } from "./shared";

export default function ReviewForm({
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
