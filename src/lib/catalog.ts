import type { Course, Filters } from "./types";

export const SEMESTER = "2026-2";
export const DEPARTMENTS = [
  "국어국문학과",
  "영어영문학과",
  "사학과",
  "경영학부",
  "경제금융학부",
  "컴퓨터소프트웨어학부",
  "정보시스템학과",
  "전자공학부",
  "기계공학부",
  "건축학부",
  "간호학부",
  "정책학과",
  "체육학과",
  "기타",
];
export const COUNTRIES =
  "KR CN JP US VN AX MN UZ ID TH IN PK NP BD TW HK MY SG PH KZ RU GB FR DE CA AU BR MX TR EG NG ZA AF AL DZ AS AD AO AI AQ AG AR AM AW AT AZ BS BH BB BY BE BZ BJ BM BT BO BQ BA BW BV IO BN BG BF BI CV KH CM KY CF TD CL CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC SV GQ ER EE SZ ET FK FO FJ FI GF PF TF GA GM GE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HU IS IR IQ IE IM IL IT JM JE JO KE KI KP KW KG LA LV LB LS LR LY LI LT LU MO MG MW MV ML MT MH MQ MR MU YT FM MD MC ME MS MA MZ MM NA NR NL NC NZ NI NE NU NF MK MP NO OM PW PS PA PG PY PE PN PL PT PR QA RE RO RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SX SK SI SB SO GS SS ES LK SD SR SJ SE CH SY TJ TZ TL TG TK TO TT TN TM TC TV UG UA AE UM UY VU VE VG VI WF EH YE ZM ZW".split(
    " ",
  );
const titles = [
  "영화로 읽는 인문학",
  "행복의 심리학",
  "생활 속의 경제",
  "예술과 창의적 사고",
  "지속가능한 미래",
  "음악의 이해",
  "철학의 쓸모",
  "데이터로 읽는 세상",
  "세계 문화 산책",
  "과학기술과 사회",
  "스포츠와 건강",
  "소통의 기술",
  "디자인과 일상",
  "한국사의 새로운 시선",
  "미디어와 현대사회",
  "환경과 생태",
  "문학과 상상력",
  "인공지능과 윤리",
  "현대 중국의 이해",
  "사랑의 실천",
  "디지털 리터러시",
  "글로벌 시민의식",
  "대학 글쓰기",
  "경제와 금융의 이해",
];
const professors = ["김서연", "이도윤", "박지현", "정민준", "최유진", "한지우"];

// shortcut: illustrative catalog for the first build; replace with approved semester data before public use.
export const CATALOG: Course[] = titles.map((name, i) => ({
  id: `course-${i + 1}`,
  code: `GEN${String(i + 1).padStart(3, "0")}`,
  name,
  professor: professors[i % professors.length],
  section: i > 19 ? "02" : "01",
  semester: i > 19 ? "2026-1" : SEMESTER,
  credits: i === 19 ? 1 : 3,
  area: ["인문과 예술", "사회와 세계", "과학과 기술", "창의와 소통"][i % 4],
  kind:
    i >= 16 && i <= 19
      ? (["e-러닝 A", "e-러닝 C", "e-러닝 D", "e-러닝 A"] as const)[i - 16]
      : i % 5 === 2
        ? "SMART-F"
        : i % 7 === 4
          ? "SMART-B"
          : "대면",
  capacity: 20 + (i % 4) * 10,
  meetings:
    i >= 16 && i <= 19
      ? []
      : [
          {
            day: i % 5,
            start: 9 + (Math.floor(i / 5) % 4) * 2,
            end: 11 + (Math.floor(i / 5) % 4) * 2,
          },
        ],
  assignment: i % 3,
  team: i % 4 === 0 ? 1 : 0,
  rating: 4.5 - (i % 5) / 10,
  grades: [40 + (i % 8), 45 - (i % 8), 15],
  excludedNationalities: i === 18 ? ["CN"] : [],
  excludedDepartments: i === 7 ? ["컴퓨터소프트웨어학부"] : [],
  years: i === 14 ? [2, 3, 4] : [1, 2, 3, 4],
  passFail: i === 19,
  internationalException: i === 19,
  example: true,
}));

export const DEFAULT_FILTERS: Filters = {
  available: Array.from({ length: 5 }, (_, day) =>
    Array.from({ length: 13 }, (_, hour) => `${day}-${hour + 9}`),
  ).flat(),
  min: 9,
  max: 12,
  kinds: ["대면", "SMART"],
  assignment: 0,
  team: 0,
  time: "pm",
};
export function courseMeta(course: Course) {
  const time =
    course.meetings
      .map((m) => `${"월화수목금"[m.day]} ${m.start}:00–${m.end}:00`)
      .join(" / ") || "정해진 수업 시간 없음";
  return `${course.professor} · ${course.section}분반 · ${course.credits}학점 · ${time}`;
}
