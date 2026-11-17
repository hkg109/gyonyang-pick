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
    !catalog.some((c) => c.id === r.courseId) ||
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
