import { randomUUID } from "node:crypto";
import { CATALOG, COUNTRIES, DEPARTMENTS, SEMESTER } from "./catalog";
import { eligible } from "./recommend";
import type {
  Account,
  Course,
  Mutation,
  Profile,
  PublicStats,
  Review,
} from "./types";

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const isSchoolEmail = (email: string) =>
  /^[^\s@]+@hanyang\.ac\.kr$/i.test(email);
export function validateProfile(p: Profile) {
  if (
    !p ||
    !Number.isInteger(p.year) ||
    p.year < 1 ||
    p.year > 4 ||
    !DEPARTMENTS.includes(p.department) ||
    !COUNTRIES.includes(p.nationality) ||
    typeof p.international !== "boolean"
  )
    throw new AppError("기본 정보를 다시 확인해 주세요.");
}
export function newAccount(id: string): Account {
  return {
    id,
    email: "demo@hanyang.ac.kr",
    profile: {
      year: 1,
      department: "경영학부",
      nationality: "KR",
      international: false,
    },
    favorites: [],
    ranks: [null, null, null],
    saved: false,
    version: 0,
    balance: 0,
    entries: [],
    unlocked: [],
    sample: null,
    reviews: [],
    paid: false,
    rewardedPairs: 0,
    receipts: {},
    consentAt: new Date().toISOString(),
  };
}
export function validateRanks(
  ranks: (string | null)[],
  catalog: Course[],
  profile: Profile,
  favorites?: string[],
) {
  if (
    !Array.isArray(ranks) ||
    ranks.length !== 3 ||
    ranks.some((id) => id !== null && typeof id !== "string")
  )
    throw new AppError("지망 형식이 올바르지 않습니다.");
  const ids = ranks.filter((id): id is string => !!id);
  if (
    new Set(ids).size !== ids.length ||
    ranks.some((id, i) => !!id && ranks.slice(0, i).some((x) => !x))
  )
    throw new AppError("1지망부터 빈칸 없이 서로 다른 강좌를 선택해 주세요.");
  if (
    ids.some((id) => {
      const c = catalog.find((c) => c.id === id);
      return (
        !c || !eligible(c, profile) || (favorites && !favorites.includes(id))
      );
    })
  )
    throw new AppError("수강 가능한 즐겨찾기 강좌만 지망에 넣을 수 있어요.");
}
export function addEntry(
  account: Account,
  delta: number,
  reason: string,
  id: string = randomUUID(),
) {
  if (account.balance + delta < 0)
    throw new AppError("젤리가 부족해요. 무료 젤리를 먼저 받아 주세요.", 402);
  account.balance += delta;
  account.entries.unshift({
    id,
    delta,
    reason,
    createdAt: new Date().toISOString(),
  });
}
export function validateReview(
  review: Mutation & { type: "review" },
  catalog: Course[],
) {
  const r = review.review;
  if (
    !r ||
    !catalog.some((c) => c.id === r.courseId && c.semester !== SEMESTER) ||
    !Number.isInteger(r.rating) ||
    r.rating < 1 ||
    r.rating > 5 ||
    !["A+", "A0", "B+", "B0", "C 이하", "P", "F"].includes(r.grade) ||
    ![0, 1, 2, 3].includes(r.assignment) ||
    ![0, 1, 2, 3].includes(r.team) ||
    ![0, 1, 2, 3].includes(r.exams) ||
    !Array.isArray(r.attendance) ||
    r.attendance.length < 1 ||
    r.attendance.length > 4 ||
    r.attendance.some(
      (a) => !["전자출결", "호명", "서명", "반영 안 함"].includes(a),
    ) ||
    typeof r.text !== "string" ||
    r.text.trim().length < 5 ||
    r.text.length > 300
  )
    throw new AppError(
      "강의평 필수 항목을 확인해 주세요. 한 줄 평은 5~300자입니다.",
    );
  if (
    /\b01[016789][- .]?\d{3,4}[- .]?\d{4}\b|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(
      r.text,
    )
  )
    throw new AppError("강의평에 연락처나 이메일을 적지 말아 주세요.");
}
export function mutate(
  account: Account,
  action: Mutation,
  requestId: string,
  catalog = CATALOG,
) {
  const body = JSON.stringify(action);
  if (account.receipts[requestId]) {
    if (account.receipts[requestId] !== body)
      throw new AppError("같은 요청 번호에 다른 내용을 보낼 수 없습니다.", 409);
    return;
  }
  const course =
    "courseId" in action
      ? catalog.find((c) => c.id === action.courseId)
      : undefined;
  switch (action.type) {
    case "favorite":
      if (!course || course.semester !== SEMESTER)
        throw new AppError("이번 학기 강좌를 선택해 주세요.");
      account.favorites = account.favorites.includes(course.id)
        ? account.favorites.filter((id) => id !== course.id)
        : [...account.favorites, course.id];
      break;
    case "save":
      validateRanks(action.ranks, catalog, account.profile, account.favorites);
      if (
        JSON.stringify(action.ranks) === JSON.stringify(account.ranks) &&
        account.saved
      )
        break;
      if (action.version !== account.version)
        throw new AppError(
          "다른 창에서 지망을 변경했어요. 새로고침 후 다시 저장해 주세요.",
          409,
        );
      if (!account.saved && !action.ranks.some(Boolean))
        throw new AppError("1지망을 선택해 주세요.");
      if (account.saved) addEntry(account, -1, "지망 변경", requestId);
      account.ranks = [...action.ranks];
      account.saved = true;
      account.version++;
      break;
    case "open":
      if (!course) throw new AppError("강좌를 찾을 수 없습니다.", 404);
      if (account.unlocked.includes(course.id)) break;
      if (!account.saved || !account.ranks.includes(course.id))
        throw new AppError("저장한 지망의 리포트만 처음 열 수 있어요.", 403);
      addEntry(account, -1, `리포트 열람 · ${course.name}`, requestId);
      account.unlocked.push(course.id);
      break;
    case "sample":
      if (account.sample)
        throw new AppError("이번 학기 표본 보상을 이미 받았어요.", 409);
      validateRanks(action.ranks, catalog, account.profile);
      if (!action.ranks.some(Boolean))
        throw new AppError("표본의 1지망을 선택해 주세요.");
      account.sample = [...action.ranks];
      addEntry(account, 1, "모의수강신청 표본 제출", requestId);
      break;
    case "review": {
      validateReview(action, catalog);
      if (account.reviews.some((r) => r.courseId === action.review.courseId))
        throw new AppError("이미 강의평을 남긴 강좌입니다.", 409);
      account.reviews.push({
        ...action.review,
        text: action.review.text.trim(),
        id: randomUUID(),
        hidden: false,
        createdAt: new Date().toISOString(),
      });
      const pairs = Math.floor(
        account.reviews.filter((r) => !r.hidden).length / 2,
      );
      if (pairs > account.rewardedPairs) {
        addEntry(account, 1, "강의평 2과목 입력", requestId);
        account.rewardedPairs = pairs;
      }
      break;
    }
    case "profile":
      validateProfile(action.profile);
      account.profile = action.profile;
      break;
    case "report":
      throw new AppError("신고는 별도 처리됩니다.");
    default:
      throw new AppError("지원하지 않는 요청입니다.");
  }
  account.receipts[requestId] = body;
}
export function aggregate(
  accounts: Account[],
  now = new Date().toISOString(),
): PublicStats[] {
  return CATALOG.map((c) => {
    const counts = [0, 0, 0];
    for (const a of accounts)
      (a.saved ? a.ranks : (a.sample ?? [])).forEach((id, i) => {
        if (id === c.id) counts[i]++;
      });
    return {
      courseId: c.id,
      ranks: counts,
      sampleSize: counts.reduce((a, b) => a + b, 0),
      updatedAt: now,
    };
  });
}
export function refreshMinutes(now: Date, registration: Date) {
  const seoul = (d: Date) =>
    d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  if (seoul(now) === seoul(registration) || now > registration) return 5;
  const day = new Date(registration);
  day.setUTCDate(day.getUTCDate() - 1);
  if (seoul(now) === seoul(day)) return 10;
  return registration.getTime() - now.getTime() <= 3 * 86400000 ? 30 : 60;
}
export function gradeDistribution(reviews: Review[]) {
  const counts = [0, 0, 0];
  for (const r of reviews.filter((r) => !r.hidden)) {
    if (r.grade.startsWith("A")) counts[0]++;
    else if (r.grade.startsWith("B")) counts[1]++;
    else if (r.grade === "C 이하") counts[2]++;
  }
  const total = counts.reduce((a, b) => a + b, 0);
  return total ? counts.map((n) => Math.round((n / total) * 100)) : [];
}
export const COURSE_KINDS: Course["kind"][] = [
  "대면",
  "SMART-F",
  "SMART-B",
  "e-러닝 A",
  "e-러닝 C",
  "e-러닝 D",
];
export function normalizeAdminCourse(input: unknown): Course {
  if (!input || typeof input !== "object")
    throw new AppError("강좌 데이터 형식이 올바르지 않습니다.");
  const c = input as Record<string, unknown>;
  const reqText = (key: string, label: string) => {
    const v = typeof c[key] === "string" ? (c[key] as string).trim() : "";
    if (!v || v.length > 100)
      throw new AppError(`${label} 항목을 확인해 주세요.`);
    return v;
  };
  const id = reqText("id", "강좌 ID");
  const code = reqText("code", "과목 코드");
  const name = reqText("name", "과목명");
  const professor = reqText("professor", "교수명");
  const section = reqText("section", "분반");
  const area = reqText("area", "영역");
  const semester = reqText("semester", "학기");
  if (!/^\d{4}-[12]$/.test(semester))
    throw new AppError("학기는 YYYY-1 또는 YYYY-2 형식이어야 합니다.");
  if (
    typeof c.credits !== "number" ||
    !Number.isInteger(c.credits) ||
    c.credits < 1 ||
    c.credits > 6
  )
    throw new AppError("학점은 1~6 사이의 정수여야 합니다.");
  if (
    typeof c.capacity !== "number" ||
    !Number.isInteger(c.capacity) ||
    c.capacity < 0
  )
    throw new AppError("정원은 0 이상의 정수여야 합니다.");
  if (!COURSE_KINDS.includes(c.kind as Course["kind"]))
    throw new AppError("강좌 유형이 올바르지 않습니다.");
  if (!Array.isArray(c.meetings))
    throw new AppError("수업 시간 형식이 올바르지 않습니다.");
  const meetings = c.meetings.map((m) => {
    if (!m || typeof m !== "object")
      throw new AppError("수업 시간 항목이 올바르지 않습니다.");
    const { day, start, end } = m as Record<string, unknown>;
    if (
      typeof day !== "number" ||
      !Number.isInteger(day) ||
      day < 0 ||
      day > 4 ||
      typeof start !== "number" ||
      !Number.isInteger(start) ||
      typeof end !== "number" ||
      !Number.isInteger(end) ||
      start < 9 ||
      end > 22 ||
      start >= end
    )
      throw new AppError("수업 시간은 월~금(0~4), 9~22시, 시작 < 종료여야 합니다.");
    return { day, start, end };
  });
  const assignment = c.assignment ?? 0;
  const team = c.team ?? 0;
  if (
    typeof assignment !== "number" ||
    !Number.isInteger(assignment) ||
    assignment < 0 ||
    assignment > 3 ||
    typeof team !== "number" ||
    !Number.isInteger(team) ||
    team < 0 ||
    team > 3
  )
    throw new AppError("과제·팀플 수치는 0~3 사이의 정수여야 합니다.");
  if (!Array.isArray(c.years) || c.years.length === 0)
    throw new AppError("수강 가능 학년(1~4)을 1개 이상 선택해 주세요.");
  const years = Array.from(
    new Set(
      c.years.map((y) => {
        if (typeof y !== "number" || !Number.isInteger(y) || y < 1 || y > 4)
          throw new AppError("학년은 1~4 사이의 정수여야 합니다.");
        return y;
      }),
    ),
  ).sort((a, b) => a - b);
  if (!Array.isArray(c.excludedNationalities))
    throw new AppError("제외 국적 형식이 올바르지 않습니다.");
  const excludedNationalities = Array.from(
    new Set(
      c.excludedNationalities.map((n) => {
        if (
          typeof n !== "string" ||
          !/^[A-Z]{2}$/.test(n) ||
          !COUNTRIES.includes(n)
        )
          throw new AppError("제외 국적은 2글자 대문자 국가 코드여야 합니다.");
        return n;
      }),
    ),
  );
  if (!Array.isArray(c.excludedDepartments))
    throw new AppError("제외 학과 형식이 올바르지 않습니다.");
  const excludedDepartments = Array.from(
    new Set(
      c.excludedDepartments.map((d) => {
        if (typeof d !== "string" || !DEPARTMENTS.includes(d))
          throw new AppError("제외 학과는 등록된 학과 목록의 값이어야 합니다.");
        return d;
      }),
    ),
  );
  if (
    typeof c.passFail !== "boolean" ||
    typeof c.internationalException !== "boolean"
  )
    throw new AppError("P/F 및 유학생 예외 여부는 true/false여야 합니다.");
  return {
    id,
    code,
    name,
    professor,
    section,
    semester,
    credits: c.credits,
    area,
    kind: c.kind as Course["kind"],
    capacity: c.capacity,
    meetings,
    assignment,
    team,
    rating: null,
    grades: [],
    excludedNationalities,
    excludedDepartments,
    years,
    passFail: c.passFail,
    internationalException: c.internationalException,
    example: false,
  };
}
