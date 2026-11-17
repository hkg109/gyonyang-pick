export type Profile = {
  year: number;
  department: string;
  nationality: string;
  international: boolean;
};
export type Meeting = { day: number; start: number; end: number };
export type Course = {
  id: string;
  code: string;
  name: string;
  professor: string;
  section: string;
  semester: string;
  credits: number;
  area: string;
  kind: "대면" | "SMART-F" | "SMART-B" | "e-러닝 A" | "e-러닝 C" | "e-러닝 D";
  capacity: number;
  meetings: Meeting[];
  assignment: number;
  team: number;
  rating: number | null;
  grades: number[];
  excludedNationalities: string[];
  excludedDepartments: string[];
  years: number[];
  passFail: boolean;
  internationalException: boolean;
  example: boolean;
};
export type Filters = {
  available: string[];
  min: number;
  max: number;
  kinds: string[];
  assignment: number;
  team: number;
  time: "am" | "pm" | "any";
};
export type Review = {
  id: string;
  courseId: string;
  rating: number;
  grade: string;
  assignment: number;
  team: number;
  exams: number;
  attendance: string[];
  text: string;
  hidden: boolean;
  createdAt: string;
};
export type Entry = {
  id: string;
  delta: number;
  reason: string;
  createdAt: string;
};
export type Account = {
  admin?: boolean;
  id: string;
  email: string;
  profile: Profile;
  favorites: string[];
  ranks: (string | null)[];
  saved: boolean;
  version: number;
  balance: number;
  entries: Entry[];
  unlocked: string[];
  sample: (string | null)[] | null;
  reviews: Review[];
  paid: boolean;
  rewardedPairs: number;
  receipts: Record<string, string>;
  consentAt: string;
};
export type PublicStats = {
  courseId: string;
  ranks: number[];
  sampleSize: number;
  updatedAt: string;
};
export type Snapshot = {
  account: Omit<Account, "receipts">;
  courses: Course[];
  mode: "demo" | "supabase";
  updatedAt: string;
};
export type Plan = {
  ids: string[];
  label: string;
  credits: number;
  reasons: Record<string, string>;
  classified: boolean;
};
export type Report = {
  course: Course;
  stats: PublicStats;
  reviews: Review[];
  rating: number | null;
  grades: number[];
  example: boolean;
};
export type Mutation =
  | { type: "favorite"; courseId: string }
  | { type: "save"; ranks: (string | null)[]; version: number }
  | { type: "sample"; ranks: (string | null)[] }
  | { type: "open"; courseId: string }
  | { type: "review"; review: Omit<Review, "id" | "createdAt" | "hidden"> }
  | { type: "report"; reviewId: string }
  | { type: "profile"; profile: Profile };
