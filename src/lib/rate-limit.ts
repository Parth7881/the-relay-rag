export interface WindowState { count: number; resetAt: number }

interface WindowOptions {
  windowMs?: number;
  maxKeys?: number;
}

export function consumeWindow(
  store: Map<string, WindowState>,
  key: string,
  limit: number,
  now = Date.now(),
  { windowMs = 60_000, maxKeys = 5_000 }: WindowOptions = {}
): boolean {
  for (const [storedKey, state] of store) {
    if (state.resetAt <= now) store.delete(storedKey);
  }
  while (store.size >= maxKeys && !store.has(key)) {
    const oldest = store.keys().next().value as string | undefined;
    if (!oldest) break;
    store.delete(oldest);
  }

  const current = store.get(key);
  if (!current) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
