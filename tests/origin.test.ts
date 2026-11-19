import { describe, expect, it } from "vitest";
import { assertOrigin } from "../src/lib/server";

// Next dev rewrites request.url to localhost, so the check must use the Host header.
const post = (origin: string | null, host = "127.0.0.1:3000") =>
  new Request("http://localhost:3000/api/auth", {
    method: "POST",
    headers: { host, ...(origin ? { origin } : {}) },
  });

describe("assertOrigin", () => {
  it("같은 호스트에서 온 요청은 통과한다", () => {
    expect(() => assertOrigin(post("http://127.0.0.1:3000"))).not.toThrow();
  });
  it("다른 출처·출처 없음·잘못된 출처는 403으로 막는다", () => {
    for (const origin of ["http://evil.example", null, "null"])
      expect(() => assertOrigin(post(origin))).toThrow(
        expect.objectContaining({ status: 403 }),
      );
  });
});
