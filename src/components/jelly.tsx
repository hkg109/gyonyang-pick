"use client";

import { useState } from "react";
import Link from "next/link";
import type { Course, Snapshot } from "@/lib/types";
import { Lock, Paw, date, number } from "./shared";

const PRODUCTS = [
  { qty: 5, price: 5000, label: "기본", unit: "개당 1,000원" },
  { qty: 12, price: 10000, label: "더 많이", unit: "개당 약 833원" },
];

export default function JellyPage({
  account,
  busy,
  mode,
  onHistory,
  onSample,
}: {
  account: Snapshot["account"];
  busy: boolean;
  mode: string;
  onHistory: () => void;
  onSample: () => void;
}) {
  const [qty, setQty] = useState(12);
  const product = PRODUCTS.find((p) => p.qty === qty)!;
  const reviewed = account.reviews.filter((r) => !r.hidden).length % 2;
  return (
    <>
      <div className="jellyLayout">
        <aside className="card balanceCard">
          <span className="muted">보유 젤리</span>
          <div className="balance">
            <Paw size={34} />
            <strong>{account.balance}</strong>
            <span>개</span>
          </div>
          <div className="tagStack">
            <span className="tag">유효기간 없음</span>
            {account.paid ? (
              <span className="tag soft">추천안 최대 3개 열림</span>
            ) : (
              <span className="tag dashed">
                <Lock /> 추천안 3개 잠김 · 충전 이력 없음
              </span>
            )}
          </div>
          <h3>이렇게 사용해요</h3>
          <div className="usageBox">
            {[
              ["첫 지망 저장", "무료"],
              ["지망 변경", "1개"],
              ["리포트 최초 열람", "1개"],
              ["리포트 재열람", "무료"],
            ].map(([label, cost]) => (
              <div key={label}>
                <span>{label}</span>
                <b className={cost === "무료" ? "accentText" : ""}>{cost}</b>
              </div>
            ))}
          </div>
          <div className="cardHead">
            <h3>최근 내역</h3>
          </div>
          {account.entries.length ? (
            <ul className="plainList entries">
              {account.entries.slice(0, 3).map((e) => (
                <li key={e.id}>
                  <div>
                    <span>{e.reason}</span>
                    <small>{date(e.createdAt)}</small>
                  </div>
                  <b className={e.delta > 0 ? "accentText" : ""}>
                    {e.delta > 0 ? "+" : "−"}
                    {Math.abs(e.delta)}
                  </b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">아직 사용 내역이 없어요.</p>
          )}
          <button type="button" className="btn outline full" onClick={onHistory}>
            전체 내역 보기
          </button>
        </aside>

        <section className="card stack" aria-labelledby="charge">
          <div>
            <h2 id="charge">젤리 충전</h2>
            <p className="muted">충전 이력이 있으면 교양탐색 추천안 최대 3개가 열려요.</p>
          </div>
          <div className="productGrid">
            {PRODUCTS.map((p) => (
              <button
                type="button"
                key={p.qty}
                aria-pressed={qty === p.qty}
                className={`product ${qty === p.qty ? "on" : ""}`}
                onClick={() => setQty(p.qty)}
              >
                <span className="productHead">
                  <b>{p.label}</b>
                  <span className="tag">{qty === p.qty ? "선택됨" : "선택"}</span>
                </span>
                <span className="productQty">
                  <Paw size={24} />
                  젤리 {p.qty}개
                </span>
                <span className="productPrice">{number(p.price)}원</span>
                <span className="productUnit">{p.unit}</span>
              </button>
            ))}
          </div>
          <div className="costTable">
            <div>
              <span>선택한 상품</span>
              <b>
                젤리 {product.qty}개 · {number(product.price)}원
              </b>
            </div>
            <div>
              <span>충전 후 보유 젤리</span>
              <b>
                {account.balance}개 → {account.balance + product.qty}개
              </b>
            </div>
            <div className="total">
              <span>실제 결제 금액</span>
              <b>0원 · 테스트 젤리</b>
            </div>
          </div>
          <p className="infoBox">
            지금은 무료 시범 운영 중이에요. 테스트 충전은 운영자가 지급하고, 실제
            결제는 진행하지 않아요. 남은 젤리는 유효기간 없이 다음 학기로 이어서 쓸
            수 있어요.
          </p>
          <div className="rowBetween">
            <span className="muted small">
              {mode === "demo"
                ? "테스트 충전이 필요하면 README의 운영자 지급 명령을 사용해 주세요."
                : "결제 수단은 유료 전환 전에 확정됩니다."}
            </span>
            <button type="button" className="btn primary lg" disabled>
              실제 결제 준비 중
            </button>
          </div>
        </section>
      </div>

      <section className="card stack" aria-labelledby="free">
        <div>
          <h2 id="free">무료 젤리 얻기</h2>
          <p className="muted">입력해 주신 정보는 모의 경쟁률과 리포트를 더 정확하게 만드는 데 쓰여요.</p>
        </div>
        <div className="earnGrid">
          <article className="earnCard">
            <div className="cardHead">
              <h3>강의평 입력</h3>
              <span className="tag">2과목마다 1개 · 반복</span>
            </div>
            <p>들었던 교양의 강의평을 남겨 주세요. 같은 강좌(과목·교수·분반)는 한 번만 입력할 수 있어요.</p>
            <div className="progressLine">
              <span className="muted small">이번 진행: {reviewed} / 2과목</span>
              <div className="progress">
                <i style={{ width: `${reviewed * 50}%` }} />
              </div>
            </div>
            <Link className="btn primary full" href="/reviews">
              강의평 입력하기
            </Link>
          </article>
          <article className="earnCard">
            <div className="cardHead">
              <h3>모의수강신청 표본</h3>
              <span className="tag">1개</span>
            </div>
            <p>이번 학기 1·2·3지망 후보를 알려 주세요. 익명으로 집계돼요. 학기당 한 번 받을 수 있어요.</p>
            <button
              type="button"
              className="btn outline full"
              disabled={busy || !!account.sample}
              onClick={onSample}
            >
              {account.sample ? "이번 학기 보상 받음 ✓" : "지망 후보 입력하기"}
            </button>
          </article>
          <article className="earnCard">
            <div className="cardHead">
              <h3>추천인 코드</h3>
              <span className="tag">준비 중</span>
            </div>
            <p>추천인 보상은 중복 보상 방지 기준을 정한 뒤 다음 버전에서 열려요.</p>
            <div className="inlineForm">
              <label className="srOnly" htmlFor="ref">
                추천인 아이디
              </label>
              <input id="ref" placeholder="추천인 아이디" disabled />
              <button type="button" className="btn outline" disabled>
                받기
              </button>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

export function SampleForm({
  courses,
  initial,
  busy,
  onSubmit,
}: {
  courses: Course[];
  initial: (string | null)[];
  busy: boolean;
  onSubmit: (r: (string | null)[]) => Promise<void>;
}) {
  const [ranks, setRanks] = useState(initial);
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(ranks);
      }}
    >
      <p className="muted">
        이번 학기에 수강하고 싶은 교양을 알려 주세요. 제출하면 젤리 1개를 받아요.
      </p>
      {[0, 1, 2].map((i) => (
        <label className="field" key={i}>
          {i + 1}지망
          <select
            value={ranks[i] ?? ""}
            required={i === 0}
            onChange={(e) =>
              setRanks((old) => old.map((id, j) => (j === i ? e.target.value || null : id)))
            }
          >
            <option value="">{i === 0 ? "교양을 선택해 주세요" : "선택 안 함"}</option>
            {courses.map((c) => (
              <option
                key={c.id}
                value={c.id}
                disabled={ranks.some((id, j) => j !== i && id === c.id)}
              >
                {c.name} · {c.professor}
              </option>
            ))}
          </select>
        </label>
      ))}
      <p className="infoBox">
        개인별 지망은 공개되지 않고, 과목별 합산 통계로만 표시돼요. 저장한 지망이
        있으면 표본과 중복 집계하지 않아요.
      </p>
      <button className="btn primary full lg" disabled={busy}>
        제출하고 젤리 1개 받기
      </button>
    </form>
  );
}
