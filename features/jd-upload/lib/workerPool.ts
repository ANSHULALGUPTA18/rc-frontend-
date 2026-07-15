/**
 * workerPool — bounded-concurrency task runner (sliding window).
 *
 * Runs `items` through `worker`, keeping at most `concurrency` tasks in flight
 * at once. The moment one task settles, the next queued item starts — the pool
 * stays full rather than waiting for a whole batch to finish (a "sliding
 * window", not strict batching).
 *
 * Every task is isolated: a thrown error is captured as a `failed` outcome and
 * never rejects the pool, so one bad item can't stop the rest. Outcomes are
 * returned in the original `items` order regardless of completion order.
 *
 * Used by the JD upload flow for both extraction (per-PDF smart-upload +
 * confirm) and pricing (per-JD priceJd), each capped at 5 concurrent.
 */

export type PoolStatus = "succeeded" | "failed";

export interface PoolOutcome<T, R> {
  /** The original input item. */
  item: T;
  /** Its position in the input array. */
  index: number;
  status: PoolStatus;
  /** Present when status === "succeeded". */
  result?: R;
  /** Present when status === "failed" — whatever the worker threw. */
  error?: unknown;
}

export interface PoolSummary<T, R> {
  /** All outcomes, in original input order. */
  outcomes: PoolOutcome<T, R>[];
  succeeded: PoolOutcome<T, R>[];
  failed: PoolOutcome<T, R>[];
}

/**
 * Run `items` through `worker` with bounded concurrency.
 *
 * @param items       Inputs to process.
 * @param concurrency Max tasks in flight at once (clamped to [1, items.length]).
 * @param worker      Async fn producing a result for one item. May throw —
 *                    the throw is captured, not propagated.
 * @param onSettled   Optional callback fired after each task settles, with the
 *                    outcome plus a running (completed, total) count. Ideal for
 *                    live progress UI.
 */
export async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  onSettled?: (outcome: PoolOutcome<T, R>, completed: number, total: number) => void,
): Promise<PoolSummary<T, R>> {
  const total = items.length;

  if (total === 0) {
    return { outcomes: [], succeeded: [], failed: [] };
  }

  const outcomes = new Array<PoolOutcome<T, R>>(total);
  const lanes = Math.max(1, Math.min(concurrency, total));
  let cursor = 0;
  let completed = 0;

  // Each "lane" pulls the next unclaimed index and processes it until the
  // queue is drained. `cursor` is read+incremented synchronously before any
  // await, so no two lanes can ever claim the same index.
  async function runLane(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= total) return;

      const item = items[index];
      let outcome: PoolOutcome<T, R>;
      try {
        const result = await worker(item, index);
        outcome = { item, index, status: "succeeded", result };
      } catch (error) {
        outcome = { item, index, status: "failed", error };
      }

      outcomes[index] = outcome;
      completed += 1;
      onSettled?.(outcome, completed, total);
    }
  }

  await Promise.all(Array.from({ length: lanes }, () => runLane()));

  return {
    outcomes,
    succeeded: outcomes.filter((o) => o.status === "succeeded"),
    failed: outcomes.filter((o) => o.status === "failed"),
  };
}
