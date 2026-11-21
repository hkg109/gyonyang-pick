"use client";

import { useState } from "react";
import Link from "next/link";
import { courseMeta } from "@/lib/catalog";
import type { Course, Mutation, Snapshot } from "@/lib/types";
import { Empty, Paw, date } from "./shared";

// Calls Claude only on request (it costs money); the answer is tied to the candidates it was asked about.
function AdviceBox({ draft }: { draft: (string | null)[] }) {
  const key = JSON.stringify(draft);
  const [answer, setAnswer] = useState<{ key: string; text: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function ask() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ranks: draft }),
      });
      // A route that is not deployed yet returns the app's HTML page instead of JSON.
      const data = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
      if (!data || !res.ok || typeof data.text !== "string")
        throw new Error(data?.error ?? "지금은 AI 도우미를 쓸 수 없어요.");
      setAnswer({ key, text: data.text });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="aiBox" aria-live="polite">
      <div className="cardHead">
        <strong>AI 지망 도우미</strong>
        <button type="button" className="btn outline small" disabled={loading} onClick={() => void ask()}>
          {loading ? "생각하는 중…" : answer?.key === key ? "다시 물어보기" : "AI에게 물어보기"}
        </button>
      </div>
      {answer?.key === key ? (
        <p>{answer.text}</p>
      ) : (
        <p className="muted small">지금 고른 1·2·3지망 순서가 괜찮은지 모의 경쟁률을 바탕으로 짧게 알려 드려요. 젤리는 쓰지 않아요.</p>
      )}
      {error && <p className="dangerText small">{error}</p>}
      <span className="muted small">모의 경쟁률은 이용자 지망으로 추정한 값이에요. 하루 5번까지 물어볼 수 있어요.</span>
    </div>
  );
}

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
  const firstSave = !account.saved;
  const message = dirty
    ? firstSave
      ? "첫 지망 저장은 무료예요. 젤리 없이 시작하세요."
      : "변경 사항이 있어요. 저장하면 젤리 1개가 차감돼요. (과목과 순위를 함께 바꿔도 1개)"
    : firstSave
      ? "즐겨찾기에서 1지망부터 순서대로 골라 주세요."
      : "지망을 저장했어요. 바뀐 지망은 다음 모의 경쟁률 집계에 반영돼요.";
  return (
    <>
      <div className="card titleCard">
        <div>
          <h1>내 리포트</h1>
          <p>즐겨찾기한 교양으로 1·2·3지망을 정하고, 등록한 과목의 리포트를 확인하세요.</p>
        </div>
        <span className="muted small">모의 경쟁률 갱신 · {date(state.updatedAt)}</span>
      </div>

      <section className="card stack" aria-labelledby="slots">
        <div className="cardHead">
          <h2 id="slots">나의 1·2·3지망</h2>
          <span className="tag soft">{firstSave ? "첫 저장 무료" : "변경 시 젤리 1개"}</span>
        </div>
        <div className="slotGrid">
          {draft.map((id, i) => {
            const c = byId(id);
            const savedHere = account.saved && account.ranks[i] === id;
            return (
              <div className="slot" key={i}>
                <span className="slotBadge">{i + 1}지망</span>
                {c ? (
                  <>
                    <strong>{c.name}</strong>
                    <span className="muted small">{courseMeta(c)}</span>
                    <div className="slotActions">
                      {savedHere ? (
                        <button
                          type="button"
                          className="btn primary grow"
                          disabled={busy}
                          onClick={() => void openReport(c)}
                        >
                          {account.unlocked.includes(c.id)
                            ? "다시 보기 (무료)"
                            : "리포트 보기 · 젤리 1개"}
                        </button>
                      ) : (
                        <span className="slotHint grow">저장 후 리포트 열람 가능</span>
                      )}
                      <button
                        type="button"
                        className="btn outline"
                        aria-label={`${i + 1}지망에서 빼기`}
                        onClick={() => setRank(i, null)}
                      >
                        빼기
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="slotEmpty">아래 즐겨찾기에서 과목을 골라 주세요</div>
                )}
              </div>
            );
          })}
        </div>
        {dirty && draft.some(Boolean) && <AdviceBox draft={draft} />}
        <div className="saveBar">
          <span className={dirty ? "" : "muted"}>{message}</span>
          {dirty || firstSave ? (
            <button
              type="button"
              className="btn primary lg"
              disabled={busy || !dirty || (firstSave && !draft.some(Boolean))}
              onClick={() =>
                void act(
                  { type: "save", ranks: draft, version: account.version },
                  firstSave
                    ? "첫 지망을 무료로 저장했어요."
                    : "지망을 변경했어요. 젤리 1개를 사용했어요.",
                )
              }
            >
              {busy ? "저장 중…" : firstSave ? "무료로 저장" : "지망 저장 · 젤리 1개"}
            </button>
          ) : (
            <span className="savedBadge">저장됨</span>
          )}
        </div>
      </section>

      <section className="card stack" aria-labelledby="favs">
        <div className="cardHead">
          <h2 id="favs">즐겨찾기한 교양 ({account.favorites.length})</h2>
          <Link className="textLink" href="/explore">
            교양탐색에서 더 찾기 →
          </Link>
        </div>
        {!account.favorites.length ? (
          <Empty title="아직 찜한 교양이 없어요">
            교양탐색에서 마음에 드는 과목의 발자국을 눌러 주세요.
          </Empty>
        ) : (
          <ul className="plainList">
            {account.favorites.map((id) => {
              const c = byId(id);
              if (!c) return null;
              return (
                <li className="listRow" key={id}>
                  <div>
                    <strong className="withIcon">
                      <Paw size={18} color="var(--accent)" />
                      {c.name}
                    </strong>
                    <span className="muted small">{courseMeta(c)}</span>
                  </div>
                  <div className="choices" role="group" aria-label={`${c.name} 지망 선택`}>
                    {[0, 1, 2].map((i) => (
                      <button
                        type="button"
                        key={i}
                        className={`choice ${draft[i] === id ? "on solid" : ""}`}
                        aria-pressed={draft[i] === id}
                        onClick={() => setRank(i, id)}
                      >
                        {i + 1}지망
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card stack" aria-labelledby="opened">
        <div className="cardHead">
          <div>
            <h2 id="opened">열람한 리포트</h2>
            <p className="muted small">지망에서 뺀 과목도 추가 차감 없이 다시 볼 수 있어요.</p>
          </div>
          <span className="tag soft">재열람 무료</span>
        </div>
        {account.unlocked.length ? (
          <ul className="plainList">
            {account.unlocked.map((id) => {
              const c = byId(id);
              if (!c) return null;
              return (
                <li className="listRow" key={id}>
                  <div>
                    <strong>{c.name}</strong>
                    <span className="muted small">{courseMeta(c)}</span>
                  </div>
                  <button
                    type="button"
                    className="btn outline"
                    disabled={busy}
                    onClick={() => void openReport(c)}
                  >
                    다시 보기 (무료)
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted small">아직 열람한 리포트가 없어요.</p>
        )}
      </section>
    </>
  );
}
