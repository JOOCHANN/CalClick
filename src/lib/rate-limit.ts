// In-memory per-instance rate limiter. Worker isolate마다 리셋되므로
// 분산 환경에선 공격 방어용은 못 됨 — 정상 유저 실수 연타/비용 폭주 방어용.
const buckets = new Map<string, number[]>();

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = buckets.get(key) ?? [];
  const fresh = arr.filter((t) => now - t < windowMs);
  if (fresh.length >= max) {
    buckets.set(key, fresh);
    return false;
  }
  fresh.push(now);
  buckets.set(key, fresh);
  return true;
}
