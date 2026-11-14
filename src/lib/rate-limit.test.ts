import { describe, expect, it } from "vitest";
import { consumeWindow } from "./rate-limit";

describe("consumeWindow", () => {
  it("blocks after the configured number of attempts", () => {
    const store = new Map();
    expect(consumeWindow(store, "client", 2, 1000)).toBe(true);
    expect(consumeWindow(store, "client", 2, 1001)).toBe(true);
    expect(consumeWindow(store, "client", 2, 1002)).toBe(false);
  });

  it("evicts expired entries and caps cardinality", () => {
    const store = new Map<string, { count: number; resetAt: number }>();
    consumeWindow(store, "expired", 1, 0, { windowMs: 10, maxKeys: 2 });
    consumeWindow(store, "one", 1, 20, { windowMs: 10, maxKeys: 2 });
    consumeWindow(store, "two", 1, 20, { windowMs: 10, maxKeys: 2 });
    consumeWindow(store, "three", 1, 20, { windowMs: 10, maxKeys: 2 });
    expect(store.has("expired")).toBe(false);
    expect(store.size).toBeLessThanOrEqual(2);
  });
});
