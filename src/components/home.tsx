import Link from "next/link";
import type { Course, Snapshot } from "@/lib/types";
import { Paw } from "./shared";

const Next = ({ href }: { href: string }) => (
  <a href={href} className="nextHint" aria-label="다음 섹션으로">
    <span>다음</span>
    <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true">
      <path
        d="M2 2l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </a>
);

export default function HomePage({
  account,
  byId,
}: {
  account: Snapshot["account"];
  byId: (id: string | null) => Course | undefined;
}) {
  return (
    <main id="content">
      <section className="hero" aria-label="교냥픽 소개">
        <div className="heroDeco" aria-hidden="true">
          <span className="deco d1">
            <Paw size={110} />
          </span>
          <span className="deco d2">
            <Paw size={140} />
          </span>
          <span className="deco d3">
            <Paw size={170} />
          </span>
          <span className="deco d4">
            <Paw size={230} />
          </span>
          <div className="pickCard">
            <div className="pickHead">
              <strong>오늘의 Pick</strong>
              <span>
                <Paw size={24} />
              </span>
            </div>
            {[0, 1, 2].map((i) => (
              <div className="pickRow" key={i}>
                <span className={`rankBadge r${i}`}>{i + 1}지망</span>
                <span>{byId(account.ranks[i])?.name ?? "아직 고르지 않았어요"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="heroCopy">
          <span className="heroBadge">한양대학교 수강 신청 도우미</span>
          <h1>교냥픽</h1>
          <p>성향 맞춤 교양 추천과 모의 경쟁률 리포트</p>
          <div className="heroButtons">
            <Link className="btn heroPrimary" href="/explore">
              교양 추천받기
            </Link>
            <Link className="btn heroGhost" href="/my-report">
              내 리포트 보기
            </Link>
          </div>
        </div>
        <Next href="#banners" />
      </section>

      <section id="banners" className="homeBand" aria-label="바로가기 배너">
        <div className="bandInner">
          <div className="bannerGrid">
            <Link href="/jelly" className="banner">
              <Paw size={44} />
              <strong>무료 젤리 얻기</strong>
              <span>
                들은 교양 강의평 2과목 = 젤리 1개. 모의수강신청 표본으로도 받을
                수 있어요.
              </span>
              <em>젤리로 이동 →</em>
            </Link>
            <Link href="/explore" className="banner">
              <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true">
                <circle
                  cx="10.5"
                  cy="10.5"
                  r="6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                />
                <path
                  d="M15.5 15.5L21 21"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
              <strong>인기 교양 검색하러 가기</strong>
              <span>
                가능 시간과 원하는 조건만 고르면 시간이 겹치지 않는 추천안을
                만들어 드려요.
              </span>
              <em>교양탐색으로 이동 →</em>
            </Link>
            <Link href="/my-report" className="banner">
              <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true">
                <rect
                  x="4.5"
                  y="3.5"
                  width="15"
                  height="18"
                  rx="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path d="M9 3.5h6v3H9z" fill="currentColor" />
                <path
                  d="M8 11h2M8 14.5h2M8 18h2M12.5 11H16M12.5 14.5H16M12.5 18H16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <strong>
                내 리포트에서
                <br />
                1·2·3지망 정하기
              </strong>
              <span>즐겨찾기한 교양으로 지망을 등록하고 모의 경쟁률을 확인하세요.</span>
              <em>내 리포트로 이동 →</em>
            </Link>
          </div>
          <Next href="#steps-section" />
        </div>
      </section>

      <section id="steps-section" className="homeBand" aria-labelledby="steps">
        <div className="bandInner">
          <div className="card stepsCard">
            <h2 id="steps">이렇게 이용해요</h2>
            <ol className="stepList">
              <li>
                <b>STEP 1 · 교양탐색</b>
                <span>조건을 넣고 추천받은 교양 중 마음에 드는 과목을 즐겨찾기</span>
              </li>
              <li aria-hidden="true" className="stepArrow">
                →
              </li>
              <li>
                <b>STEP 2 · 내 리포트</b>
                <span>
                  즐겨찾기한 교양으로 1·2·3지망 등록
                  <br />
                  (첫 저장 무료 · 변경 시 젤리 1개)
                </span>
              </li>
              <li aria-hidden="true" className="stepArrow">
                →
              </li>
              <li>
                <b>STEP 3 · 리포트</b>
                <span>
                  모의 경쟁률·강의평·성적 비율·과제/팀플 확인
                  <br />
                  (처음 열 때만 젤리 1개)
                </span>
              </li>
            </ol>
            <a href="#content" className="btn outline pillBtn">
              맨 위로 ↑
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
