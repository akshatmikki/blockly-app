type Entry = {
  count: number;
  ts: number;
};

const store = new Map<string, Entry>();

export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.ts > windowMs) {
    store.set(key, { count: 1, ts: now });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}
