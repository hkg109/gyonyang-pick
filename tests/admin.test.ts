import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/lib/catalog";
import { courseProblem } from "../src/components/admin";

const base = CATALOG[0];

describe("courseProblem", () => {
  it("예시 강좌 전체를 정상으로 본다", () => {
    expect(CATALOG.map(courseProblem).filter(Boolean)).toEqual([]);
  });
  it("필수 값·학기 형식·시간 범위가 틀리면 이유를 돌려준다", () => {
    expect(courseProblem({ ...base, name: " " })).toContain("과목명");
    expect(courseProblem({ ...base, semester: "2026-3" })).toContain("학기");
    expect(courseProblem({ ...base, meetings: [{ day: 0, start: 11, end: 9 }] })).toContain("수업 시간");
    expect(courseProblem({ ...base, kind: "대면", meetings: [] })).toContain("수업 시간");
    expect(courseProblem({ ...base, years: [] })).toContain("학년");
  });
  it("e-러닝은 수업 시간이 없어도 된다", () => {
    expect(courseProblem({ ...base, kind: "e-러닝 A", meetings: [] })).toBeNull();
  });
});
