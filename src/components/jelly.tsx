"use client";

import { useState } from "react";
import Link from "next/link";
import type { Course, Snapshot } from "@/lib/types";
import { Paw, date, number } from "./shared";

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
  return (
    <>
      <div className="jellyLayout">
        <aside className="panel balancePanel">
          <span className="muted">보유 젤리</span>
          <div className="balanceNumber">
            <Paw size={34} />
            <strong>{account!.balance}</strong>
            <span>개</span>
          </div>
          <span className="tag">유효기간 없음</span>
          <span className="small muted">
            {account!.paid
              ? "추천안 최대 3개 열림"
              : "추천안 3개 잠김 · 충전 이력 없음"}
          </span>
          <h3>이렇게 사용해요</h3>
          <div className="usageRow">
            <span>첫 지망 저장</span>
            <b>무료</b>
          </div>
          <div className="usageRow">
            <span>지망 변경</span>
            <b>1개</b>
          </div>
          <div className="usageRow">
            <span>리포트 최초 열람</span>
            <b>1개</b>
          </div>
          <div className="usageRow">
            <span>리포트 재열람</span>
            <b className="blueText">무료</b>
          </div>
          <h3>최근 내역</h3>
          {account!.entries.length ? (
            account!.entries.slice(0, 3).map((e) => (
              <div className="entry" key={e.id}>
                <div>
                  <span>{e.reason}</span>
                  <small>{date(e.createdAt)}</small>
                </div>
                <strong className={e.delta > 0 ? "blueText" : ""}>
                  {e.delta > 0 ? "+" : "−"}
                  {Math.abs(e.delta)}
                </strong>
              </div>
            ))
          ) : (
            <p className="muted small">아직 사용 내역이 없어요.</p>
          )}
          <button
            className="button outline full"
            onClick={() => onHistory()}
          >
            전체 내역 보기
          </button>
        </aside>
        <Recharge busy={busy} mode={mode} />
      </div>
      <section className="panel">
        <div className="panelHeading">
          <div>
            <h2>무료 젤리 얻기</h2>
            <p>
              여러분의 경험이 더 정확한 추천과 리포트를 만들어요.
            </p>
          </div>
          <span className="tag blue">참여하고 차곡차곡</span>
        </div>
        <div className="earnGrid">
          <article className="earnCard">
            <div className="earnTop">
              <h3>강의평 입력</h3>
              <span className="tag">2과목마다 1개</span>
            </div>
            <p>
              들었던 교양의 강의평을 남겨 주세요.
              <br />
              같은 강좌는 한 번만 입력할 수 있어요.
            </p>
            <div className="earnProgress">
              <span>
                이번 진행{" "}
                {account!.reviews.filter((r) => !r.hidden).length %
                  2}{" "}
                / 2과목
              </span>
              <div className="progress">
                <i
                  style={{
                    width: `${(account!.reviews.filter((r) => !r.hidden).length % 2) * 50}%`,
                  }}
                />
              </div>
            </div>
            <Link className="button primary full" href="/reviews">
              강의평 입력하기
            </Link>
          </article>
          <article className="earnCard">
            <div className="earnTop">
              <h3>모의수강신청 표본</h3>
              <span className="tag">1개</span>
            </div>
            <p>
              이번 학기 1·2·3지망 후보를 알려 주세요. 개인별 지망은
              공개되지 않아요.
            </p>
            <span className="muted small">
              학기당 한 번 받을 수 있어요.
            </span>
            <button
              className="button outline full"
              disabled={!!account!.sample}
              onClick={() => onSample()}
            >
              {account!.sample
                ? "이번 학기 보상 받음 ✓"
                : "지망 후보 입력하기"}
            </button>
          </article>
          <article className="earnCard">
            <div className="earnTop">
              <h3>추천인 코드</h3>
              <span className="tag">준비 중</span>
            </div>
            <p>
              친구와 함께 더 좋은 선택을.
              <br />
              추천인 보상은 다음 버전에서 만나요.
            </p>
            <span className="muted small">
              중복 보상 방지를 준비하고 있어요.
            </span>
            <button className="button outline full" disabled>
              곧 만나요
            </button>
          </article>
        </div>
      </section>
    </>
  );
}

export function Recharge({ busy, mode }: { busy: boolean; mode: string }) {
  const [product, setProduct] = useState(12);
  return (
    <section className="panel rechargePanel">
      <h2>젤리 충전</h2>
      <p className="muted">
        충전 이력이 있으면 교양탐색 추천안 최대 3개가 열려요.
      </p>
      <div className="productGrid">
        {[
          [5, 5000, "기본"],
          [12, 10000, "더 많이"],
        ].map(([qty, price, label]) => (
          <button
            key={qty}
            aria-pressed={product === qty}
            className={`product ${product === qty ? "productSelected" : ""}`}
            onClick={() => setProduct(Number(qty))}
          >
            <div className="productHead">
              <strong>{label}</strong>
              <span className={`tag ${product === qty ? "blue" : ""}`}>
                {product === qty ? "선택됨" : "선택"}
              </span>
            </div>
            <h3>
              <Paw size={28} />
              젤리 {qty}개
            </h3>
            <p>{number(Number(price))}원</p>
            <span>개당 {qty === 5 ? "1,000" : "약 833"}원</span>
          </button>
        ))}
      </div>
      <div className="costTable">
        <div>
          <span>선택한 상품</span>
          <b>
            젤리 {product}개 · {product === 5 ? "5,000" : "10,000"}원
          </b>
        </div>
        <div>
          <span>이용 방식</span>
          <b>1차 버전 · 테스트 젤리</b>
        </div>
        <div>
          <strong>실제 결제 금액</strong>
          <b>0원</b>
        </div>
      </div>
      <div className="infoBox">
        <strong>지금은 무료 시범 운영 중이에요.</strong>
        <p className="small">
          테스트 충전은 운영자가 지급합니다. 실제 결제는 진행하지 않아요. 아래
          무료 젤리 얻기로 리포트를 이용해 보세요.
        </p>
      </div>
      <p className="muted small">
        남은 젤리는 유효기간 없이 다음 학기에도 이어서 쓸 수 있어요.
      </p>
      <button className="button primary full" disabled>
        실제 결제 준비 중
      </button>
      {mode === "demo" && (
        <p className="muted small">
          테스트 충전이 필요하면 README의 운영자 지급 명령을 사용해 주세요.
        </p>
      )}
    </section>
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
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(ranks);
      }}
    >
      <p className="muted">
        이번 학기에 수강하고 싶은 교양을 알려 주세요. 제출하면 젤리 1개를
        받아요.
      </p>
      {[0, 1, 2].map((i) => (
        <label key={i}>
          {i + 1}지망
          <select
            value={ranks[i] ?? ""}
            required={i === 0}
            onChange={(e) =>
              setRanks((old) =>
                old.map((id, j) => (j === i ? e.target.value || null : id)),
              )
            }
          >
            <option value="">
              {i === 0 ? "교양을 선택해 주세요" : "선택 안 함"}
            </option>
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
      <div className="infoBox small">
        개인별 지망은 공개되지 않고, 과목별 합산 통계로만 표시돼요. 저장한
        지망이 있으면 표본과 중복 집계하지 않아요.
      </div>
      <button className="button primary full" disabled={busy}>
        제출하고 젤리 1개 받기
      </button>
    </form>
  );
}
