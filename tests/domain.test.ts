import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { CATALOG, DEFAULT_FILTERS } from "../src/lib/catalog";
import {
  aggregate,
  gradeDistribution,
  isSchoolEmail,
  mutate,
  newAccount,
  refreshMinutes,
} from "../src/lib/domain";
import { overlap, recommend, validCombination } from "../src/lib/recommend";
import type { Mutation, Review } from "../src/lib/types";

const apply = (
  a: ReturnType<typeof newAccount>,
  action: Mutation,
  id = randomUUID(),
) => mutate(a, action, id);
const setup = () => {
  const a = newAccount(randomUUID());
  for (const c of CATALOG.slice(0, 4))
    apply(a, { type: "favorite", courseId: c.id });
  return a;
};
const review = (courseId: string): Extract<Mutation, { type: "review" }> => ({
  type: "review",
  review: {
    courseId,
    rating: 4,
    grade: "B+",
    assignment: 1,
    team: 0,
    exams: 2,
    attendance: ["전자출결"],
    text: "수업 내용을 이해하기 좋았어요.",
  },
});
describe("지망과 젤리", () => {
  it("첫 저장은 무료이고 변경·리포트는 잔액을 검사한다", () => {
    const a = setup();
    apply(a, { type: "save", ranks: ["course-1", null, null], version: 0 });
    expect(a.balance).toBe(0);
    expect(a.saved).toBe(true);
    expect(() =>
      apply(a, { type: "save", ranks: ["course-2", null, null], version: 1 }),
    ).toThrow("부족");
    expect(a.ranks[0]).toBe("course-1");
  });
  it("표본 보상은 한 번, 최초 열람은 한 번 차감하고 지망 해제 뒤도 무료다", () => {
    const a = setup();
    apply(a, { type: "save", ranks: ["course-1", null, null], version: 0 });
    apply(a, { type: "sample", ranks: ["course-1", null, null] });
    expect(() =>
      apply(a, { type: "sample", ranks: ["course-1", null, null] }),
    ).toThrow("이미");
    const id = randomUUID();
    apply(a, { type: "open", courseId: "course-1" }, id);
    apply(a, { type: "open", courseId: "course-1" }, id);
    apply(a, { type: "open", courseId: "course-1" });
    expect(a.balance).toBe(0);
    a.ranks = [null, null, null];
    apply(a, { type: "open", courseId: "course-1" });
    expect(a.balance).toBe(0);
    expect(a.entries.filter((e) => e.delta < 0)).toHaveLength(1);
    expect(a.balance).toBe(a.entries.reduce((n, e) => n + e.delta, 0));
  });
  it("다른 강좌 최초 열람, 중복 순위, 수정 버전 충돌을 거부한다", () => {
    const a = setup();
    expect(() => apply(a, { type: "open", courseId: "course-1" })).toThrow(
      "저장",
    );
    expect(() =>
      apply(a, {
        type: "save",
        ranks: ["course-1", "course-1", null],
        version: 0,
      }),
    ).toThrow("서로 다른");
    expect(() =>
      apply(a, { type: "save", ranks: ["course-1", null, null], version: 9 }),
    ).toThrow("다른 창");
  });
  it("강의평 2개마다 보상하며 동일 강좌 중복 지급을 막는다", () => {
    const a = setup();
    apply(a, review("course-21"));
    expect(a.balance).toBe(0);
    apply(a, review("course-22"));
    expect(a.balance).toBe(1);
    expect(() => apply(a, review("course-22"))).toThrow("이미");
    apply(a, review("course-23"));
    apply(a, review("course-24"));
    expect(a.balance).toBe(2);
  });
  it("연락처가 포함된 강의평을 거부한다", () => {
    const a = setup();
    const action = review("course-21");
    action.review.text = "연락 주세요 010-1234-5678";
    expect(() => apply(a, action)).toThrow("연락처");
  });
});
describe("추천", () => {
  it("겹치는 강좌는 제외하고 바로 이어지는 수업은 허용한다", () => {
    const first = {...CATALOG[0], meetings:[{day:0,start:9,end:11}]};
    const overlapping = {...CATALOG[1], meetings:[{day:0,start:10,end:12}]};
    const adjacent = {...CATALOG[1], meetings:[{day:0,start:11,end:13}]};
    expect(overlap(first, overlapping)).toBe(true);
    expect(validCombination([first,overlapping],newAccount("test").profile)).toBe(false);
    expect(overlap(first,adjacent)).toBe(false);
    expect(validCombination([first,adjacent],newAccount("test").profile)).toBe(true);
  });
  it("충전 이용자에게 표본 없이도 서로 다른 유효 조합 3개를 준다", () => {
    const p = newAccount("test").profile;
    const plans = recommend(CATALOG, DEFAULT_FILTERS, p, true);
    expect(plans).toHaveLength(3);
    expect(new Set(plans.map((p) => p.ids.join(","))).size).toBe(3);
    for (const plan of plans) {
      const courses = plan.ids.map((id) => CATALOG.find((c) => c.id === id)!);
      expect(validCombination(courses, p)).toBe(true);
      expect(plan.credits).toBeGreaterThanOrEqual(9);
      expect(plan.credits).toBeLessThanOrEqual(12);
      expect(plan.classified).toBe(false);
    }
  });
  it("무료 이용자는 1개, 불가능한 시간은 추천하지 않는다", () => {
    const p = newAccount("test").profile;
    expect(recommend(CATALOG, DEFAULT_FILTERS, p, false)).toHaveLength(1);
    expect(
      recommend(CATALOG, { ...DEFAULT_FILTERS, available: [] }, p, false),
    ).toHaveLength(0);
  });
  it("국적 제한과 e-러닝 합계 제한을 적용한다", () => {
    const p = {
      ...newAccount("test").profile,
      nationality: "CN",
      international: true,
    };
    const plans = recommend(
      CATALOG,
      { ...DEFAULT_FILTERS, kinds: ["e-러닝"], min: 3, max: 9 },
      p,
      true,
    );
    for (const plan of plans) {
      expect(plan.ids).not.toContain("course-19");
      const c = plan.ids.map((id) => CATALOG.find((c) => c.id === id)!);
      expect(c.filter((c) => !c.internationalException)).toHaveLength(1);
      expect(validCombination(c, p)).toBe(true);
    }
    expect(validCombination([CATALOG[17], CATALOG[18]], p)).toBe(false);
  });
  it("300개 이상 대량 강좌에서도 제한 없이 빠르게 유효 조합 3개를 찾는다", () => {
    const p = newAccount("scale").profile;
    const bigCatalog = Array.from({ length: 300 }, (_, i) => ({
      ...CATALOG[i % 16],
      id: `big-${i + 1}`,
      code: `BIG${String(i + 1).padStart(3, "0")}`,
      name: `대규모 교양 ${i + 1}`,
      capacity: 20 + (i % 5) * 10,
      meetings: [
        {
          day: i % 5,
          start: 9 + (Math.floor(i / 5) % 5) * 2,
          end: 11 + (Math.floor(i / 5) % 5) * 2,
        },
      ],
      assignment: i % 4,
      team: i % 3 === 0 ? 0 : 1,
    }));
    const bigStats = bigCatalog.map((c, i) => ({
      courseId: c.id,
      ranks: [5 + (i % 40) * 3, 2, 1],
      sampleSize: 10 + (i % 50),
      updatedAt: new Date().toISOString(),
    }));
    const t0 = performance.now();
    const plans = recommend(bigCatalog, DEFAULT_FILTERS, p, true, bigStats);
    const elapsed = performance.now() - t0;
    expect(plans).toHaveLength(3);
    expect(plans.map((pl) => pl.label)).toEqual(["소신", "안정", "도전"]);
    expect(new Set(plans.map((pl) => pl.ids.join(","))).size).toBe(3);
    for (const plan of plans) {
      const courses = plan.ids.map(
        (id) => bigCatalog.find((c) => c.id === id)!,
      );
      expect(validCombination(courses, p)).toBe(true);
      expect(plan.credits).toBeGreaterThanOrEqual(DEFAULT_FILTERS.min);
      expect(plan.credits).toBeLessThanOrEqual(DEFAULT_FILTERS.max);
    }
    expect(elapsed).toBeLessThan(200);
  });
});
describe("집계와 경계", () => {
  it("표본과 저장 지망을 중복 집계하지 않는다", () => {
    const a = setup();
    a.sample = ["course-2", null, null];
    a.ranks = ["course-1", null, null];
    a.saved = true;
    const stats = aggregate([a]);
    expect(stats.find((s) => s.courseId === "course-1")!.ranks).toEqual([
      1, 0, 0,
    ]);
    expect(stats.find((s) => s.courseId === "course-2")!.ranks).toEqual([
      0, 0, 0,
    ]);
  });
  it("한국 날짜 경계로 당일·하루 전 주기를 고른다", () => {
    const start = new Date("2026-12-01T10:00:00+09:00");
    expect(refreshMinutes(new Date("2026-11-26T12:00:00+09:00"), start)).toBe(
      60,
    );
    expect(refreshMinutes(new Date("2026-11-29T12:00:00+09:00"), start)).toBe(
      30,
    );
    expect(refreshMinutes(new Date("2026-11-30T00:00:00+09:00"), start)).toBe(
      10,
    );
    expect(refreshMinutes(new Date("2026-12-01T00:00:00+09:00"), start)).toBe(
      5,
    );
  });
  it("P/F와 숨긴 후기를 성적 분포에서 제외한다", () => {
    const base = review("course-21").review;
    const rows = [
      { ...base, grade: "A+", hidden: false },
      { ...base, grade: "P", hidden: false },
      { ...base, grade: "C 이하", hidden: true },
    ] as Review[];
    expect(gradeDistribution(rows)).toEqual([100, 0, 0]);
  });
  it("한양 이메일 도메인을 정확히 검사한다", () => {
    expect(isSchoolEmail("test@hanyang.ac.kr")).toBe(true);
    expect(isSchoolEmail("test@hanyang.ac.kr.evil.com")).toBe(false);
    expect(isSchoolEmail("test@gmail.com")).toBe(false);
  });
});
