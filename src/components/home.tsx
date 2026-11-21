"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { Course, Snapshot } from "@/lib/types";
import { Paw } from "./shared";

// Same breakpoint as the home scroll-snap rule in globals.css.
const PAGED = "(min-width: 641px) and (min-height: 600px)";

// A small wheel turn, swipe or arrow/Page key moves one whole section.
function useSectionPaging() {
  useEffect(() => {
    const media = matchMedia(PAGED);
    let lastMove = 0;
    let lastWheel = 0;
    let touchY: number | null = null;
    const sections = () => [
      ...document.querySelectorAll<HTMLElement>("#content > section, .homeRoot .footer"),
    ];
    // Returns false when the current section is taller than the screen and still has room to scroll natively.
    function go(dir: 1 | -1) {
      const list = sections();
      const y = scrollY;
      const current = list.reduce((best, s, i) =>
        Math.abs(s.offsetTop - y) < Math.abs(list[best].offsetTop - y) ? i : best, 0);
      const box = list[current].getBoundingClientRect();
      if (dir === 1 && box.bottom > innerHeight + 2) return false;
      if (dir === -1 && box.top < -2) return false;
      const target = list[Math.min(list.length - 1, Math.max(0, current + dir))];
      target.scrollIntoView({ behavior: "smooth", block: target.matches(".footer") ? "end" : "start" });
      lastMove = Date.now();
      return true;
    }
    function onWheel(e: WheelEvent) {
      if (!media.matches || Math.abs(e.deltaY) < 4 || document.querySelector("dialog[open]")) return;
      const now = Date.now();
      const streaming = now - lastWheel < 250;
      lastWheel = now;
      // Trackpads keep firing during inertia; ignore that tail instead of skipping two sections.
      if (streaming && now - lastMove < 1500) return e.preventDefault();
      if (go(e.deltaY > 0 ? 1 : -1)) e.preventDefault();
    }
    function onKey(e: KeyboardEvent) {
      const dir = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 }[e.key] as 1 | -1 | undefined;
      const target = e.target as HTMLElement;
      if (!dir || !media.matches || document.querySelector("dialog[open]")) return;
      if (target.closest("input, select, textarea, [role=tablist]")) return;
      if (Date.now() - lastMove < 600 || go(dir)) e.preventDefault();
    }
    const onTouchStart = (e: TouchEvent) => (touchY = e.touches[0].clientY);
    function onTouchEnd(e: TouchEvent) {
      if (touchY === null || !media.matches) return;
      const dy = touchY - e.changedTouches[0].clientY;
      touchY = null;
      if (Math.abs(dy) > 30) go(dy > 0 ? 1 : -1);
    }
    addEventListener("wheel", onWheel, { passive: false });
    addEventListener("keydown", onKey);
    addEventListener("touchstart", onTouchStart, { passive: true });
    addEventListener("touchend", onTouchEnd);
    return () => {
      removeEventListener("wheel", onWheel);
      removeEventListener("keydown", onKey);
      removeEventListener("touchstart", onTouchStart);
      removeEventListener("touchend", onTouchEnd);
    };
  }, []);
}

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
  useSectionPaging();
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
