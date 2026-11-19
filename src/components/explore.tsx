"use client";

import { Fragment } from "react";
import Link from "next/link";
import { DEFAULT_FILTERS, SEMESTER } from "@/lib/catalog";
import type { Course, Filters, Plan, Snapshot } from "@/lib/types";
import { Choice, CourseCard, Empty, Paw } from "./shared";

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
  return (
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
            onClick={onRecommend}
          >
            {busy
              ? "추천안을 찾고 있어요…"
              : "이 조건으로 추천받기"}
            <span>→</span>
          </button>
        </aside>
      </div>
    </>
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
  plans: Plan[];
  tab: number;
  setTab: (n: number) => void;
  search: string;
  setSearch: (s: string) => void;
  courses: Course[];
  account: Snapshot["account"];
  byId: (id: string | null) => Course | undefined;
  favorite: (id: string) => void;
}) {
  return (
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
  );
}
