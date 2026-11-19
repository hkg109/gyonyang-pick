"use client";

import type { Report } from "@/lib/types";
import { date } from "./shared";

const AMOUNT = ["없음", "적음", "보통", "많음"];
const EXAMS = ["없음", "1회", "2회", "3회 이상"];
// Most common answer among reviews, or null when nobody answered.
const mode = <T,>(values: T[]) =>
  values.length
    ? [...values].sort(
        (a, b) => values.filter((v) => v === b).length - values.filter((v) => v === a).length,
      )[0]
    : null;

export default function ReportView({
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
  const ratio = course.capacity ? Math.round((stats.ranks[0] / course.capacity) * 100) : null;
  const level =
    ratio === null ? "정원 정보 없음" : ratio < 100 ? "낮음" : ratio <= 300 ? "보통" : "높음";
  const rating =
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
  const max = Math.max(...stats.ranks, 1);
  const fromReviews = reviews.length > 0;
  const facts: [string, string][] = [
    ["과제 빈도", AMOUNT[mode(reviews.map((r) => r.assignment)) ?? course.assignment]],
    ["팀플", AMOUNT[mode(reviews.map((r) => r.team)) ?? course.team]],
    ["시험 횟수", fromReviews ? EXAMS[mode(reviews.map((r) => r.exams))!] : "데이터 없음"],
    ["출석 평가", mode(reviews.flatMap((r) => r.attendance)) ?? "데이터 없음"],
  ];
  return (
    <div className="report">
      <p className="muted">
        {course.professor} · {course.section}분반 · {course.kind} · {course.credits}학점
      </p>
      {report.example && (
        <p className="softNotice">
          과목·교수와 기본 수업 정보는 시연용 예시입니다. 모의지원 인원과 작성된 강의평은 실제
          입력을 반영해요.
        </p>
      )}
      <div className="summary">
        <strong>한 줄 요약</strong>
        <span className="chip outline">경쟁 {sufficient ? level : "표본 부족"}</span>
        <span className="chip outline">평가 {rating ? `${rating} / 5` : "없음"}</span>
        {grades.length > 0 && <span className="chip outline">A 이상 {grades[0]}%</span>}
        <span className="chip outline">팀플 {facts[1][1]}</span>
      </div>

      <section className="card stack">
        <div className="cardHead">
          <h3>모의 경쟁률</h3>
          <span className="muted small">
            표본 {stats.sampleSize}명 · {date(stats.updatedAt)} 갱신
          </span>
        </div>
        <div className="competition">
          <div className="ratioBox">
            <span className="muted small">1지망 기준 정원 대비</span>
            <strong>{sufficient ? `${ratio}%` : "표본 부족"}</strong>
            <span className={`levelBadge ${sufficient ? level : ""}`}>
              {sufficient ? level : "1지망 5명 미만"}
            </span>
          </div>
          <div className="rankBars">
            {stats.ranks.map((n, i) => (
              <div className="barRow" key={i}>
                <span>{i + 1}지망</span>
                <div className="barTrack">
                  <i
                    className={`r${i}`}
                    style={{ width: `${sufficient ? Math.max(2, (n / max) * 100) : 0}%` }}
                  />
                </div>
                <b>{sufficient ? `${n}명` : "—"}</b>
              </div>
            ))}
            <p className="muted small">
              정원 {course.capacity || "정보 없음"}명 · 구간: 낮음 100% 미만 / 보통 100~300% / 높음
              300% 초과
            </p>
          </div>
        </div>
        <p className="muted small">
          교냥픽 이용자의 1·2·3지망과 모의수강신청 표본으로 추정한 값이며 실제 경쟁률이 아닙니다.
        </p>
      </section>

      <section className="card stack">
        <div className="cardHead">
          <h3>강의평 · 별점</h3>
          <span className="muted small">출처: 교냥픽 이용자 강의평 {reviews.length}건</span>
        </div>
        <p className="bigScore">
          <strong>{rating ?? "—"}</strong>
          <span>/ 5 {fromReviews ? "만족도 평균" : "시연용 예시 평가"}</span>
        </p>
        {reviews.length ? (
          <ul className="plainList">
            {reviews.map((r) => (
              <li className="listRow" key={r.id}>
                <span>
                  “{r.text}” <span className="muted">· 만족도 {r.rating}/5</span>
                </span>
                <button
                  type="button"
                  className="btn outline small"
                  disabled={busy}
                  onClick={() => void onReport(r.id)}
                >
                  신고
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">아직 작성된 강의평이 없어요.</p>
        )}
      </section>

      <section className="card stack">
        <div className="cardHead">
          <h3>성적 비율</h3>
          <span className="muted small">
            {report.grades.length ? "출처: 이용자 강의평의 성적 구간 응답 · P/F 제외" : "시연용 예시 분포"}
          </span>
        </div>
        {grades.length ? (
          <div className="gradeBar">
            {grades.map((n, i) => (
              <div key={i} className={`g${i}`} style={{ flex: n || 0.01 }}>
                {n >= 8 && `${["A 이상", "B대", "C 이하"][i]} ${n}%`}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">데이터 없음</p>
        )}
      </section>

      <section className="card stack">
        <div className="cardHead">
          <h3>과제 · 팀플 · 시험 · 출석</h3>
          {!fromReviews && <span className="muted small">시연용 기본 수업 정보</span>}
        </div>
        <div className="factGrid">
          {facts.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h3>담당 교수 과거 데이터</h3>
        <p className="muted">데이터 없음 · 이전 학기 강의평이 쌓이면 제공할 예정이에요.</p>
      </section>
      <p className="muted small center">이 리포트는 이후에도 추가 젤리 없이 다시 볼 수 있어요.</p>
    </div>
  );
}
