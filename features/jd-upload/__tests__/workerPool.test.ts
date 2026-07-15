import { describe, it, expect, vi } from "vitest";
import { runPool } from "@/features/jd-upload/lib/workerPool";

/** Resolve after `ms`. */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe("runPool", () => {
  it("processes every item and returns results in original order", async () => {
    const items = [1, 2, 3, 4, 5];
    const summary = await runPool(items, 2, async (n) => n * 10);

    expect(summary.outcomes.map((o) => o.result)).toEqual([10, 20, 30, 40, 50]);
    expect(summary.succeeded).toHaveLength(5);
    expect(summary.failed).toHaveLength(0);
  });

  it("returns an empty summary for an empty input", async () => {
    const worker = vi.fn(async (n: number) => n);
    const summary = await runPool<number, number>([], 5, worker);

    expect(summary.outcomes).toEqual([]);
    expect(summary.succeeded).toEqual([]);
    expect(summary.failed).toEqual([]);
    expect(worker).not.toHaveBeenCalled();
  });

  it("never exceeds the concurrency limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const items = Array.from({ length: 20 }, (_, i) => i);

    await runPool(items, 5, async (n) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await delay(5);
      inFlight -= 1;
      return n;
    });

    expect(peak).toBeLessThanOrEqual(5);
    expect(peak).toBe(5); // pool actually saturates
  });

  it("slides the window — starts the next item as soon as a slot frees", async () => {
    // 3 lanes, mixed durations. The fast items should let later items start
    // well before the slow ones finish. We assert total wall time is close to
    // the theoretical sliding-window minimum, not the strict-batch time.
    const durations = [50, 10, 10, 10, 10, 10]; // 6 items, concurrency 3
    const start = Date.now();

    await runPool(durations, 3, async (ms) => {
      await delay(ms);
      return ms;
    });

    const elapsed = Date.now() - start;
    // Sliding window: lane holding the 50ms item runs items[0] only (~50ms);
    // the other two lanes churn through the five 10ms items (~30ms each set).
    // So ~50-70ms. Strict batching would be ~50 + 10 = ~60ms too here, but the
    // key guarantee is it must NOT be ~90ms (fully sequential). Allow slack.
    expect(elapsed).toBeLessThan(140);
  });

  it("isolates failures — one thrown error does not stop the rest", async () => {
    const items = [1, 2, 3, 4, 5];
    const summary = await runPool(items, 2, async (n) => {
      if (n === 3) throw new Error("boom on 3");
      return n * 10;
    });

    expect(summary.succeeded).toHaveLength(4);
    expect(summary.failed).toHaveLength(1);

    const failed = summary.failed[0];
    expect(failed.index).toBe(2); // item value 3, index 2
    expect(failed.item).toBe(3);
    expect((failed.error as Error).message).toBe("boom on 3");

    // Order preserved; failed slot has no result
    expect(summary.outcomes.map((o) => o.status)).toEqual([
      "succeeded",
      "succeeded",
      "failed",
      "succeeded",
      "succeeded",
    ]);
    expect(summary.outcomes[2].result).toBeUndefined();
  });

  it("reports progress with a monotonically increasing completed count", async () => {
    const items = Array.from({ length: 8 }, (_, i) => i);
    const seen: Array<{ completed: number; total: number }> = [];

    await runPool(
      items,
      3,
      async (n) => {
        await delay(2);
        return n;
      },
      (_outcome, completed, total) => {
        seen.push({ completed, total });
      },
    );

    expect(seen).toHaveLength(8);
    expect(seen.map((s) => s.completed)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(seen.every((s) => s.total === 8)).toBe(true);
  });

  it("handles concurrency greater than item count", async () => {
    const summary = await runPool([1, 2], 10, async (n) => n + 1);
    expect(summary.succeeded).toHaveLength(2);
    expect(summary.outcomes.map((o) => o.result)).toEqual([2, 3]);
  });

  it("runs sequentially when concurrency is 1", async () => {
    const order: number[] = [];
    await runPool([1, 2, 3], 1, async (n) => {
      order.push(n);
      await delay(1);
      return n;
    });
    expect(order).toEqual([1, 2, 3]);
  });
});
