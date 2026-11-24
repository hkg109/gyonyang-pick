"use client";

import { Fragment } from "react";
import Link from "next/link";
import { DEFAULT_FILTERS, SEMESTER } from "@/lib/catalog";
import type { Course, Filters, Plan, Snapshot } from "@/lib/types";
import { Choice, Empty, Lock, Paw } from "./shared";

const DAYS = "월화수목금";
const HOURS = Array.from({ length: 13 }, (_, i) => i + 9);
const KINDS = ["대면", "SMART", "e-러닝"];

export function ExploreConditions({
  filters,
  setFilters,
  busy,
  onRecommend,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  busy: boolean;
  onRecommend: () => void;
}) {
  const toggle = (key: string) =>
    setFilters({
      ...filters,
      available: filters.available.includes(key)
        ? filters.available.filter((x) => x !== key)
        : [...filters.available, key],
    });
  return (
    <>
      <div className="card titleCard">
        <div>
          <span className="stepLabel">STEP 1 / 2 · 조건 고르기</span>
          <h1>교양탐색</h1>
          <p>조건을 고르면 시간이 겹치지 않는 교양 추천안을 만들어 드려요.</p>
        </div>
        <Link className="btn outline" href="/reviews">
          이미 들은 교양이 있나요? 강의평 입력하고 무료 젤리 받기 →
        </Link>
      </div>
      <div className="exploreLayout">
        <section className="card timeCard" aria-labelledby="tt">
          <div className="cardHead">
            <h2 id="tt">수업 가능 시간</h2>
            <span className="muted">{filters.available.length}칸 선택</span>
          </div>
          <p className="muted narrowText">
            수업을 들을 수 있는 시간을 눌러 칠하세요. 칠하지 않은 시간에는 과목을
            넣지 않아요.
          </p>
          <div className="timeGrid">
            <span />
            {[...DAYS].map((d) => (
              <strong key={d}>{d}</strong>
            ))}
            {HOURS.map((hour) => (
              <Fragment key={hour}>
                <span className="hourLabel">{hour}:00</span>
                {[0, 1, 2, 3, 4].map((day) => {
                  const key = `${day}-${hour}`;
                  const on = filters.available.includes(key);
                  return (
                    <button
                      type="button"
                      key={key}
                      className={`timeCell ${on ? "on" : ""}`}
                      aria-label={`${DAYS[day]}요일 ${hour}:00 ${on ? "수업 가능" : "수업 불가"}`}
                      aria-pressed={on}
                      onClick={() => toggle(key)}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
          <div className="legend">
            <span>
              <i className="on" />
              수업 가능
            </span>
            <span>
              <i />
              수업 불가
            </span>
            <button
              type="button"
              className="btn small outline pushRight"
              onClick={() =>
                setFilters({ ...filters, available: DEFAULT_FILTERS.available })
              }
            >
              전체 선택
            </button>
            <button
              type="button"
              className="btn small outline"
              onClick={() => setFilters({ ...filters, available: [] })}
            >
              전체 해제
            </button>
          </div>
        </section>
        <aside className="card filterCard" aria-label="추천 조건">
          <section className="stack small-gap">
            <h2 className="miniTitle">들을 교양 학점</h2>
            <div className="creditRange">
              <label className="srOnly" htmlFor="cmin">
                최소 학점
              </label>
              <select
                id="cmin"
                value={filters.min}
                onChange={(e) => setFilters({ ...filters, min: Number(e.target.value) })}
              >
                {[3, 6, 9].map((n) => (
                  <option key={n} value={n}>
                    {n}학점
                  </option>
                ))}
              </select>
              <span>~</span>
              <label className="srOnly" htmlFor="cmax">
                최대 학점
              </label>
              <select
                id="cmax"
                value={filters.max}
                onChange={(e) => setFilters({ ...filters, max: Number(e.target.value) })}
              >
                {[3, 6, 9, 12].map((n) => (
                  <option key={n} value={n}>
                    {n}학점
                  </option>
                ))}
              </select>
            </div>
          </section>
          <fieldset className="stack small-gap">
            <legend className="miniTitle">강좌 유형</legend>
            <div className="choices">
              {KINDS.map((kind) => {
                const on = filters.kinds.includes(kind);
                return (
                  <label className={`choice ${on ? "on" : ""}`} key={kind}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setFilters({
                          ...filters,
                          kinds: on
                            ? filters.kinds.filter((k) => k !== kind)
                            : [...filters.kinds, kind],
                        })
                      }
                    />
                    {kind}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <fieldset className="stack small-gap">
            <legend className="miniTitle">선호 조건</legend>
            <span className="subLabel">과제 부담</span>
            <Choice
              values={[
                [0, "적게"],
                [1, "보통"],
                [3, "상관없음"],
              ]}
              value={filters.assignment}
              onChange={(n) => setFilters({ ...filters, assignment: Number(n) })}
            />
            <span className="subLabel">팀플</span>
            <Choice
              values={[
                [0, "없는 수업"],
                [3, "상관없음"],
              ]}
              value={filters.team}
              onChange={(n) => setFilters({ ...filters, team: Number(n) })}
            />
            <span className="subLabel">선호 시간대</span>
            <Choice
              values={[
                ["am", "오전"],
                ["pm", "오후"],
                ["any", "상관없음"],
              ]}
              value={filters.time}
              onChange={(n) => setFilters({ ...filters, time: n as Filters["time"] })}
            />
          </fieldset>
          <div className="infoBox">
            <strong>항상 적용되는 규칙</strong>
            가능 시간 밖·시간 충돌 과목 제외 · e-러닝 타입 C·D는 추천안당 1강좌 ·
            유학생 e-러닝 1개 · 학년·학과·국적·P/F 수강 제한 · 학점 범위
          </div>
          <button
            type="button"
            className="btn primary full xl pushDown"
            disabled={busy || !filters.available.length || !filters.kinds.length}
            onClick={onRecommend}
          >
            {busy ? "추천안을 찾고 있어요…" : "이 조건으로 추천받기 →"}
          </button>
        </aside>
      </div>
    </>
  );
}

function FavButton({
  course,
  on,
  onToggle,
}: {
  course: Course;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`favButton ${on ? "on" : ""}`}
      aria-pressed={on}
      aria-label={`${course.name} 즐겨찾기 ${on ? "해제" : "추가"}`}
      onClick={onToggle}
    >
      <Paw size={34} />
    </button>
  );
}

export function ExploreResults({
  filters,
  plans,
  tab,
  setTab,
  search,
  setSearch,
  courses,
  account,
  byId,
  favorite,
}: {
  filters: Filters;
  plans: Plan[] | null;
  tab: number;
  setTab: (n: number) => void;
  search: string;
  setSearch: (s: string) => void;
  courses: Course[];
  account: Snapshot["account"];
  byId: (id: string | null) => Course | undefined;
  favorite: (id: string) => void;
}) {
  // null means no recommendation was requested yet (e.g. the results URL was opened directly).
  if (!plans)
    return (
      <div className="card">
        <Empty title="먼저 추천 조건을 골라 주세요">
          가능 시간과 원하는 조건을 고르면 추천안을 만들어 드려요.{" "}
          <Link className="textLink" href="/explore">
            조건 고르러 가기 →
          </Link>
        </Empty>
      </div>
    );
  const plan = plans[tab];
  const matches = search.trim()
    ? courses.filter(
        (c) =>
          c.semester === SEMESTER &&
          `${c.name} ${c.professor}`.includes(search.trim()),
      )
    : [];
  const chips = [
    `가능 시간 ${filters.available.length}칸`,
    `${filters.min}~${filters.max}학점`,
    filters.kinds.join(" · "),
    ["과제 적게", "과제 보통", "", ""][filters.assignment],
    filters.team === 0 ? "팀플 없는 수업" : "",
    { am: "오전 선호", pm: "오후 선호", any: "" }[filters.time],
  ].filter(Boolean);
  return (
    <>
      <div className="card titleCard column">
        <div className="rowBetween">
          <div>
            <span className="stepLabel">STEP 2 / 2 · 추천안</span>
            <h1>교양 추천안</h1>
          </div>
          <Link className="btn outline" href="/explore">
            ← 조건 다시 고르기
          </Link>
        </div>
        <div className="chips">
          {chips.map((c) => (
            <span className="chip" key={c}>
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="card searchCard">
        <div className="searchRow">
          <label htmlFor="q">과목 검색</label>
          <input
            id="q"
            type="search"
            placeholder="추천 밖의 교양도 과목명·교수명으로 찾아 즐겨찾기할 수 있어요"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {search.trim() && (
          <ul className="plainList">
            {matches.length ? (
              matches.map((c) => (
                <li className="listRow" key={c.id}>
                  <div>
                    <strong>{c.name}</strong>
                    <span className="muted">
                      {c.professor} · {c.kind} · {c.credits}학점
                    </span>
                  </div>
                  <FavButton
                    course={c}
                    on={account.favorites.includes(c.id)}
                    onToggle={() => favorite(c.id)}
                  />
                </li>
              ))
            ) : (
              <li className="muted">검색 결과가 없어요.</li>
            )}
          </ul>
        )}
      </div>

      <div className="card stack">
        <div className="cardHead">
          <h2>추천안</h2>
          {plan && (
            <span className="muted">합계 {plan.credits}학점 · 시간 충돌 없음</span>
          )}
        </div>
        {account.paid && plans.length > 1 ? (
          <div className="tabs" role="tablist" aria-label="추천안 유형">
            {plans.map((p, i) => (
              <button
                type="button"
                role="tab"
                aria-selected={tab === i}
                key={i}
                className={`tab ${tab === i ? "on" : ""}`}
                onClick={() => setTab(i)}
              >
                <strong>{p.label}</strong> · 합계 {p.credits}학점
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="tabs">
              <span className="tab on">
                <strong>{plan?.label ?? "내 성향 맞춤 추천안"}</strong>
              </span>
              {!account.paid && (
                <>
                  <span className="tab locked">
                    안정 추천안 <Lock />
                  </span>
                  <span className="tab locked">
                    도전 추천안 <Lock />
                  </span>
                </>
              )}
            </div>
            {!account.paid && (
              <div className="unlockBanner">
                <span>테스트 충전 이력이 있으면 추천안 최대 3개가 열려요.</span>
                <Link href="/jelly" className="btn outline small">
                  젤리 알아보기
                </Link>
              </div>
            )}
          </>
        )}
        {plan && (
          <p className="softNotice">
            {plan.classified
              ? "선호 조건과 모의지원 표본을 참고한 추천안이에요."
              : "아직 모의지원 표본이 적어 안정·도전 분류를 보류했어요."}
          </p>
        )}
        {plan ? (
          <ul className="plainList">
            {plan.ids.map((id) => {
              const c = byId(id)!;
              const warn = ["e-러닝 C", "e-러닝 D"].includes(c.kind);
              return (
                <li className="courseItem" key={id}>
                  <div className="courseBody">
                    <div className="courseTitle">
                      <strong>{c.name}</strong>
                      <span className="tag">{c.kind}</span>
                      <span className="tag">{c.area}</span>
                    </div>
                    <span className="muted">
                      {c.credits}학점 ·{" "}
                      {c.meetings
                        .map((m) => `${DAYS[m.day]} ${m.start}:00–${m.end}:00`)
                        .join(" / ") || "정해진 수업 시간 없음"}{" "}
                      · {c.professor}
                    </span>
                    {plan.reasons[id] && (
                      <span className="reason">추천 이유 · {plan.reasons[id]}</span>
                    )}
                    {warn && (
                      <span className="warnText">
                        학점교류 e-러닝(타입 C·D)은 학기당 1강좌만 들을 수 있고, 매
                        학기 개설되지 않아 재수강이 어려울 수 있어요.
                      </span>
                    )}
                  </div>
                  <FavButton
                    course={c}
                    on={account.favorites.includes(id)}
                    onToggle={() => favorite(id)}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty title="조건에 맞는 추천안이 없어요">
            가능 시간을 넓히거나 학점·강좌 유형을 조정해 주세요.{" "}
            <Link className="textLink" href="/explore">
              조건 다시 고르기 →
            </Link>
          </Empty>
        )}
        <div className="bottomBar">
          <span>
            모의 경쟁률은 교양탐색에서 보여주지 않아요. <Paw size={16} /> 즐겨찾기한
            과목은 내 리포트에서 1·2·3지망 후보가 됩니다.
          </span>
          <Link href="/my-report" className="btn primary">
            즐겨찾기 {account.favorites.length}개 · 내 리포트로
          </Link>
        </div>
      </div>
    </>
  );
}
