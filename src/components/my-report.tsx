import Link from "next/link";
import { courseMeta } from "@/lib/catalog";
import type { Course, Mutation, Snapshot } from "@/lib/types";
import { Arrow, Empty, Paw, date } from "./shared";

export default function MyReportPage({
  state,
  draft,
  setRank,
  dirty,
  busy,
  byId,
  openReport,
  act,
}: {
  state: Snapshot;
  draft: (string | null)[];
  setRank: (rank: number, id: string | null) => void;
  dirty: boolean;
  busy: boolean;
  byId: (id: string | null) => Course | undefined;
  openReport: (course: Course) => Promise<void>;
  act: (action: Mutation, message?: string) => Promise<Snapshot | null>;
}) {
  const account = state.account;
  return (
    <>
      <div className="inlineNotice">
        <span className="statusDot" />
        모의 경쟁률 갱신 · {date(state!.updatedAt)}
        <span className="noticeRight">
          지망 변경은 다음 집계에 반영돼요.
        </span>
      </div>
      <section className="panel">
        <div className="panelHeading">
          <div>
            <h2>나의 1·2·3지망</h2>
            <p>
              즐겨찾기 목록에서 원하는 과목과 순위를 골라 주세요.
            </p>
          </div>
          <span className="tag blue">
            {account!.saved ? "변경 시 젤리 1개" : "첫 저장 무료"}
          </span>
        </div>
        <div className="rankGrid">
          {draft.map((id, i) => {
            const c = byId(id);
            const saved =
              account!.saved && account!.ranks[i] === id;
            return (
              <article
                className={`rankCard ${c ? "rankFilled" : ""}`}
                key={i}
              >
                <div className="rankCardTop">
                  <span className={`rankBadge rank${i}`}>
                    {i + 1}지망
                  </span>
                  {c && (
                    <button
                      className="iconButton smallIcon"
                      aria-label={`${i + 1}지망 비우기`}
                      onClick={() => setRank(i, null)}
                    >
                      ×
                    </button>
                  )}
                </div>
                {c ? (
                  <>
                    <h3>{c.name}</h3>
                    <p>{courseMeta(c)}</p>
                    <button
                      className="button outline full"
                      disabled={!saved || busy}
                      onClick={() => void openReport(c)}
                    >
                      {account!.unlocked.includes(c.id)
                        ? "다시 보기 (무료)"
                        : "리포트 보기 · 젤리 1개"}
                    </button>
                  </>
                ) : (
                  <div className="rankEmpty">
                    <span>+</span>
                    <p>아래에서 교양을 골라 주세요</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <div className="saveBar">
          <p>
            {dirty
              ? account!.saved
                ? "변경 사항이 있어요. 저장하면 젤리 1개가 차감돼요."
                : "첫 지망 저장은 무료예요. 젤리 없이 시작하세요."
              : account!.saved
                ? "지망을 저장했어요. 첫 열람 이후에는 무료로 다시 볼 수 있어요."
                : "1지망부터 순서대로 선택해 주세요."}
          </p>
          <button
            className="button primary"
            disabled={
              busy ||
              (!dirty && account!.saved) ||
              (!account!.saved && !draft.some(Boolean))
            }
            onClick={() =>
              void act(
                {
                  type: "save",
                  ranks: draft,
                  version: account!.version,
                },
                account!.saved
                  ? "지망을 변경했어요. 젤리 1개를 사용했어요."
                  : "첫 지망을 무료로 저장했어요.",
              )
            }
          >
            {busy
              ? "저장 중…"
              : account!.saved
                ? dirty
                  ? "젤리 1개로 변경"
                  : "저장됨"
                : "무료로 저장"}
          </button>
        </div>
      </section>
      <section className="panel">
        <div className="panelHeading">
          <h2>
            즐겨찾기한 교양{" "}
            <span className="blueText">
              {account!.favorites.length}
            </span>
          </h2>
          <Link className="textLink" href="/explore">
            교양탐색에서 더 찾기 <Arrow />
          </Link>
        </div>
        {!account!.favorites.length ? (
          <Empty title="아직 찜한 교양이 없어요">
            교양탐색에서 마음에 드는 과목의 별을 눌러 주세요.
          </Empty>
        ) : (
          <div className="favoriteList">
            {account!.favorites.map((id) => {
              const c = byId(id);
              if (!c) return null;
              return (
                <div className="favoriteRow" key={id}>
                  <div>
                    <h3>
                      <Paw size={18} />
                      {c.name}
                    </h3>
                    <p>{courseMeta(c)}</p>
                  </div>
                  <div className="choices">
                    {[0, 1, 2].map((i) => (
                      <button
                        className={`choice ${draft[i] === id ? "selected" : ""}`}
                        aria-pressed={draft[i] === id}
                        key={i}
                        onClick={() => setRank(i, id)}
                      >
                        {i + 1}지망
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className="panel">
        <div className="panelHeading">
          <div>
            <h2>열람한 리포트</h2>
            <p>
              지망에서 뺀 과목도 추가 차감 없이 다시 볼 수 있어요.
            </p>
          </div>
          <span className="tag">재열람 무료</span>
        </div>
        {account!.unlocked.length ? (
          <div className="favoriteList">
            {account!.unlocked.map((id) => {
              const c = byId(id)!;
              return (
                <div className="favoriteRow" key={id}>
                  <div>
                    <h3>{c.name}</h3>
                    <p>{courseMeta(c)}</p>
                  </div>
                  <button
                    className="button outline"
                    disabled={busy}
                    onClick={() => void openReport(c)}
                  >
                    다시 보기 (무료)
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted small">
            아직 열람한 리포트가 없어요.
          </p>
        )}
      </section>
    </>
  );
}
