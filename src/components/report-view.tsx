"use client";

import { courseMeta } from "@/lib/catalog";
import type { Report } from "@/lib/types";
import { date } from "./shared";

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
