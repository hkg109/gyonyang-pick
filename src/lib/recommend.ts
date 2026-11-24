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

type Prepared = {
  course: Course;
  score: number;
  mask: bigint;
  cd: number;
  intlE: number;
  sufficient: boolean;
  risk: number;
};

function courseMask(c: Course): bigint {
  let mask = 0n;
  for (const m of c.meetings) {
    for (let h = m.start; h < m.end; h++) {
      mask |= 1n << BigInt(m.day * 16 + (h - 9));
    }
  }
  return mask;
}

const POOL_SIZE = 24;
const SMALL_LIMIT = 24;

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
  if (!candidates.length) return [];

  const statsById = new Map(stats.map((s) => [s.courseId, s]));
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
  const scoreOf = (c: Course) =>
    (c.assignment <= filters.assignment ? 3 : 0) +
    (c.team <= filters.team ? 4 : 0) +
    (c.meetings.every(
      (m) =>
        filters.time === "any" ||
        (filters.time === "pm" ? m.start >= 12 : m.end <= 12),
    )
      ? 2
      : 0);

  const prepared: Prepared[] = candidates.map((course) => {
    const firstRank = statsById.get(course.id)?.ranks[0] ?? 0;
    const sufficient = firstRank >= 5 && course.capacity > 0;
    return {
      course,
      score: scoreOf(course),
      mask: courseMask(course),
      cd: course.kind === "e-러닝 C" || course.kind === "e-러닝 D" ? 1 : 0,
      intlE:
        course.kind.startsWith("e-러닝") && !course.internationalException
          ? 1
          : 0,
      sufficient,
      risk: course.capacity > 0 ? firstRank / course.capacity : 0,
    };
  });

  const seen = new Map<
    string,
    { courses: Course[]; score: number; credits: number }
  >();

  function searchPool(
    pool: Prepared[],
    maxOptions: number,
    maxNodes: number,
  ) {
    let nodes = 0;
    let found = 0;
    const chosen: Course[] = [];
    const usedCodes = new Set<string>();

    function walk(
      index: number,
      credits: number,
      points: number,
      usedMask: bigint,
      cdCount: number,
      intlECount: number,
    ) {
      if (nodes >= maxNodes || found >= maxOptions) return;
      nodes++;
      if (credits >= filters.min && chosen.length > 0) {
        const key = chosen
          .map((c) => c.id)
          .sort()
          .join(",");
        if (!seen.has(key)) {
          seen.set(key, {
            courses: [...chosen],
            score: points / chosen.length,
            credits,
          });
          found++;
        }
      }
      for (let i = index; i < pool.length; i++) {
        if (nodes >= maxNodes || found >= maxOptions) return;
        const item = pool[i];
        const nextCredits = credits + item.course.credits;
        if (nextCredits > filters.max) continue;
        if ((usedMask & item.mask) !== 0n) continue;
        if (usedCodes.has(item.course.code)) continue;
        if (cdCount + item.cd > 1) continue;
        if (profile.international && intlECount + item.intlE > 1) continue;

        chosen.push(item.course);
        usedCodes.add(item.course.code);
        walk(
          i + 1,
          nextCredits,
          points + item.score,
          usedMask | item.mask,
          cdCount + item.cd,
          intlECount + item.intlE,
        );
        usedCodes.delete(item.course.code);
        chosen.pop();
      }
    }

    walk(0, 0, 0, 0n, 0, 0);
  }

  if (prepared.length <= SMALL_LIMIT) {
    searchPool(prepared, 2000, 20000);
  } else {
    const byScore = [...prepared]
      .sort((a, b) => b.score - a.score || b.course.credits - a.course.credits)
      .slice(0, POOL_SIZE);
    searchPool(byScore, 300, 6000);

    if (paid && prepared.some((p) => p.sufficient)) {
      const bySafe = [...prepared]
        .sort(
          (a, b) =>
            Number(b.sufficient) - Number(a.sufficient) ||
            a.risk - b.risk ||
            b.score - a.score,
        )
        .slice(0, POOL_SIZE);
      searchPool(bySafe, 300, 6000);

      const byBold = [...prepared]
        .sort(
          (a, b) =>
            Number(b.sufficient) - Number(a.sufficient) ||
            b.risk - a.risk ||
            b.score - a.score,
        )
        .slice(0, POOL_SIZE);
      searchPool(byBold, 300, 6000);
    }
  }

  const options = Array.from(seen.values());
  options.sort((a, b) => b.score - a.score || b.credits - a.credits);
  if (!options.length) return [];

  const sufficient = (c: Course) =>
    (statsById.get(c.id)?.ranks[0] ?? 0) >= 5 && c.capacity > 0;
  const risk = (courses: Course[]) =>
    courses.reduce(
      (n, c) =>
        n + (statsById.get(c.id)?.ranks[0] ?? 0) / c.capacity,
      0,
    ) / courses.length;

  const chosen = [options[0]];
  if (paid) {
    const remaining = options.filter((o) => o !== options[0]);
    const known = remaining.filter((o) => o.courses.every(sufficient));
    const safe =
      [...known].sort((a, b) => risk(a.courses) - risk(b.courses))[0] ??
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
    credits: o.credits,
    label: o.courses.every(sufficient)
      ? ["소신", "안정", "도전"][i]
      : `추천 ${i + 1}`,
    classified: o.courses.every(sufficient),
    reasons: Object.fromEntries(o.courses.map((c) => [c.id, reason(c)])),
  }));
}
