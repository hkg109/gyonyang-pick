import Link from "next/link";
import type { Course, Snapshot } from "@/lib/types";
import { Arrow, Paw } from "./shared";

export default function HomePage({
  account,
  byId,
}: {
  account: Snapshot["account"];
  byId: (id: string | null) => Course | undefined;
}) {
  return (
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
  );
}
