import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.env.SMOKE_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("로컬 시연 서버에서만 실행하세요.");
let cookie = "";
async function request(route, body, expected = 200) {
  const response = await fetch(base + route, {
    method: body ? "POST" : "GET",
    headers: {
      Origin: base,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const value = await response.json();
  if (response.headers.get("set-cookie"))
    cookie = response.headers.get("set-cookie").split(";")[0];
  assert.equal(response.status, expected, JSON.stringify(value));
  return value;
}
const action = (value, id = randomUUID(), status = 200) =>
  request("/api/action", { action: value, requestId: id }, status);
await request("/api/auth", { type: "demo" });
let state = await request("/api/session");
assert.equal(state.mode, "demo");
assert.equal(state.account.balance, 0);
await action({ type: "favorite", courseId: "course-1" });
await action({ type: "favorite", courseId: "course-2" });
state = await action({
  type: "save",
  ranks: ["course-1", null, null],
  version: 0,
});
assert.equal(state.account.balance, 0);
await action(
  { type: "save", ranks: ["course-2", null, null], version: 1 },
  randomUUID(),
  402,
);
await action({ type: "sample", ranks: ["course-1", null, null] });
const id = randomUUID();
await Promise.all(
  Array.from({ length: 5 }, () =>
    action({ type: "open", courseId: "course-1" }, id),
  ),
);
state = await request("/api/session");
assert.equal(state.account.balance, 0);
assert.equal(state.account.entries.filter((e) => e.delta === -1).length, 1);
await request("/api/report/course-1");
await request("/api/report/course-2", undefined, 403);
const review = {
  rating: 4,
  grade: "A+",
  assignment: 1,
  team: 0,
  exams: 2,
  attendance: ["전자출결"],
  text: "로컬 기능 검증용 예시 강의평입니다.",
};
await action({ type: "review", review: { ...review, courseId: "course-21" } });
state = await action({
  type: "review",
  review: { ...review, courseId: "course-22" },
});
assert.equal(state.account.balance, 1);
await action({ type: "save", ranks: ["course-2", null, null], version: 1 });
state = await action({ type: "open", courseId: "course-1" });
assert.equal(state.account.balance, 0);
await request("/api/report/course-1");
assert.equal(
  state.account.balance,
  state.account.entries.reduce((n, e) => n + e.delta, 0),
);
const plans = await request("/api/recommend", {
  available: Array.from({ length: 5 }, (_, d) =>
    Array.from({ length: 13 }, (_, h) => `${d}-${h + 9}`),
  ).flat(),
  min: 9,
  max: 12,
  kinds: ["대면", "SMART"],
  assignment: 0,
  team: 0,
  time: "pm",
});
assert.equal(plans.plans.length, 1);
await request("/api/moderation", undefined, 403);
console.log(
  "API smoke passed: first save, insufficient balance, concurrent duplicate charge, review rewards, archived re-open, ledger, recommendation, admin denial.",
);
