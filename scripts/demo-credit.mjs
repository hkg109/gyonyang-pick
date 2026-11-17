import { readFile, writeFile, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
const [accountId, quantityText = "12"] = process.argv.slice(2);
const file = new URL("../.local/demo.json", import.meta.url);
const db = JSON.parse(await readFile(file, "utf8"));
if (!accountId) {
  console.log("시연 계정 목록 (서버를 중지한 뒤 지급하세요):");
  for (const a of Object.values(db.accounts))
    console.log(a.id, a.email, `잔액 ${a.balance}개`);
  console.log("지급: npm run demo:credit -- <계정 ID> 12");
  process.exit(0);
}
const account = db.accounts[accountId];
const quantity = Number(quantityText);
if (!account || ![5, 12].includes(quantity))
  throw new Error("계정 ID와 수량(5 또는 12)을 확인하세요.");
account.balance += quantity;
account.paid = true;
account.entries.unshift({
  id: randomUUID(),
  delta: quantity,
  reason: "운영자 테스트 충전",
  createdAt: new Date().toISOString(),
});
const temporary = new URL(
  `../.local/credit-${randomUUID()}.tmp`,
  import.meta.url,
);
await writeFile(temporary, JSON.stringify(db));
await rename(temporary, file);
console.log(`테스트 젤리 ${quantity}개 지급 완료`);
