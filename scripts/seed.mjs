import { createClient } from "@supabase/supabase-js";
import { CATALOG } from "../src/lib/catalog.ts";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw new Error(
    ".env.local에 Supabase URL과 서버용 service role 키를 설정해 주세요.",
  );
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error } = await db
  .from("offerings")
  .upsert(CATALOG.map((c) => ({ id: c.id, data: c })));
if (error) throw new Error(error.message);
const { error: statsError } = await db.rpc("refresh_public_stats", {
  p_force: true,
});
if (statsError) throw new Error(statsError.message);
console.log(
  `시연용 강좌 ${CATALOG.length}개 입력 완료. 실제 학교 데이터가 아닙니다.`,
);
