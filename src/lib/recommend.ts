import { SEMESTER } from "./catalog";
import type { Course, Filters, Plan, Profile, PublicStats } from "./types";

export function eligible(c: Course, p: Profile) {
  return (
    c.semester === SEMESTER &&
    c.years.includes(p.year) &&
    !c.excludedDepartments.includes(p.department) &&
    !c.excludedNationalities.includes(p.nationality)
  );
}
export function overlap(a: Course, b: Course) {
  return a.meetings.some((x) =>
    b.meetings.some(
      (y) => x.day === y.day && x.start < y.end && y.start < x.end,
    ),
  );
}
export function validCombination(courses: Course[], profile: Profile) {
  return (
    new Set(courses.map((c) => c.code)).size === courses.length &&
    courses.filter((c) => c.kind === "e-러닝 C" || c.kind === "e-러닝 D")
      .length <= 1 &&
    (!profile.international ||
      courses.filter(
        (c) => c.kind.startsWith("e-러닝") && !c.internationalException,
      ).length <= 1) &&
    !courses.some((a, i) => courses.slice(i + 1).some((b) => overlap(a, b)))
  );
}
export function recommend(
  catalog: Course[],
  filters: Filters,
  profile: Profile,
  paid: boolean,
  stats: PublicStats[] = [],
): Plan[] {
  const available = new Set(filters.available);
  const candidates = catalog.filter(
    (c) =>
      eligible(c, profile) &&
      filters.kinds.some((k) => c.kind.startsWith(k)) &&
      c.meetings.every((m) =>
        Array.from(
          { length: m.end - m.start },
          (_, h) => `${m.day}-${m.start + h}`,
        ).every((key) => available.has(key)),
      ),
  );
  const reason = (c: Course) =>
    [
      c.assignment <= filters.assignment
        ? "과제 부담 선호와 일치"
        : "선택한 시간에 수강 가능",
      c.team === 0 && filters.team === 0 ? "팀플 없음" : "",
      c.meetings.length &&
      filters.time === "pm" &&
      c.meetings.every((m) => m.start >= 12)
        ? "오후 수업"
        : "",
      c.meetings.length &&
      filters.time === "am" &&
      c.meetings.every((m) => m.end <= 12)
        ? "오전 수업"
        : "",
    ]
      .filter(Boolean)
      .join(" · ");
  const score = (c: Course) =>
    (c.assignment <= filters.assignment ? 3 : 0) +
    (c.team <= filters.team ? 4 : 0) +
    (c.meetings.every(
      (m) =>
        filters.time === "any" ||
        (filters.time === "pm" ? m.start >= 12 : m.end <= 12),
    )
      ? 2
      : 0);
  const options: { courses: Course[]; score: number }[] = [];
  function walk(
    index: number,
    chosen: Course[],
    credits: number,
    points: number,
  ) {
    if (credits >= filters.min)
      options.push({ courses: chosen, score: points / chosen.length });
    for (let i = index; i < candidates.length; i++) {
      const c = candidates[i];
      if (
        credits + c.credits > filters.max ||
        !validCombination([...chosen, c], profile)
      )
        continue;
      walk(i + 1, [...chosen, c], credits + c.credits, points + score(c));
    }
  }
  // shortcut: exhaustive search is bounded to the 24-row MVP catalog; cap or replace it before importing a full university catalog.
  if (candidates.length > 30)
    throw new Error(
      "추천 대상이 너무 많습니다. 강좌 유형이나 시간을 좁혀 주세요.",
    );
  walk(0, [], 0, 0);
  options.sort(
    (a, b) =>
      b.score - a.score ||
      b.courses.reduce((n, c) => n + c.credits, 0) -
        a.courses.reduce((n, c) => n + c.credits, 0),
  );
  if (!options.length) return [];
  const sufficient = (c: Course) =>
    (stats.find((s) => s.courseId === c.id)?.ranks[0] ?? 0) >= 5 &&
    c.capacity > 0;
  const risk = (courses: Course[]) =>
    courses.reduce(
      (n, c) =>
        n +
        (stats.find((s) => s.courseId === c.id)?.ranks[0] ?? 0) / c.capacity,
      0,
    ) / courses.length;
  const chosen = [options[0]];
  if (paid) {
    const remaining = options.filter((o) => o !== options[0]);
    const known = remaining.filter((o) => o.courses.every(sufficient));
    const safe =
      known.sort((a, b) => risk(a.courses) - risk(b.courses))[0] ??
      remaining[0];
    if (safe) chosen.push(safe);
    const rest = remaining.filter((o) => o !== safe);
    const bold =
      rest
        .filter((o) => o.courses.every(sufficient))
        .sort((a, b) => risk(b.courses) - risk(a.courses))[0] ?? rest[0];
    if (bold) chosen.push(bold);
  }
  return chosen.map((o, i) => ({
    ids: o.courses.map((c) => c.id),
    credits: o.courses.reduce((n, c) => n + c.credits, 0),
    label: o.courses.every(sufficient)
      ? ["소신", "안정", "도전"][i]
      : `추천 ${i + 1}`,
    classified: o.courses.every(sufficient),
    reasons: Object.fromEntries(o.courses.map((c) => [c.id, reason(c)])),
  }));
}
