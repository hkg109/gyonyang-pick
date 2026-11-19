"use client";
import { useEffect, useState } from "react";
import type { Course, Review } from "@/lib/types";
export default function Moderation({
  courses,
  allowed,
}: {
  courses: Course[];
  allowed: boolean;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!allowed) return;
    fetch("/api/moderation")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setReviews(d.reviews);
      })
      .catch((e) => setError(e.message));
  }, [allowed]);
  async function update(id: string, hidden: boolean) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, hidden }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setReviews((old) => old.map((v) => (v.id === id ? { ...v, hidden } : v)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card stack">
      <h2>강의평 신고 검토</h2>
      {!allowed ? (
        <p className="muted">운영자만 접근할 수 있습니다.</p>
      ) : (
        <>
          <p className="muted small">
            신고 접수된 강의평의 숨김·복구를 결정합니다. 보상은 자동 회수하지
            않습니다.
          </p>
          {!reviews.length && <p>접수된 신고가 없습니다.</p>}
          {reviews.map((r) => (
            <article className="listRow" key={r.id}>
              <div>
                <strong>
                  {courses.find((c) => c.id === r.courseId)?.name}
                </strong>
                <p>{r.text}</p>
                <span className="tag">{r.hidden ? "숨김" : "표시 중"}</span>
              </div>
              <button
                className="btn outline"
                disabled={busy}
                onClick={() => void update(r.id, !r.hidden)}
              >
                {r.hidden ? "복구" : "숨김"}
              </button>
            </article>
          ))}
        </>
      )}
      {error && (
        <p role="alert" className="dangerText">
          {error}
        </p>
      )}
    </section>
  );
}
