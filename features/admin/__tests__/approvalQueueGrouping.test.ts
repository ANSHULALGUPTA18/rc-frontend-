/**
 * Date-wise grouping helpers for the Approval Queue —
 * Today/Yesterday labels, local date keys, and newest-first grouping.
 */

import { describe, expect, it } from "vitest";
import {
  dateKey,
  dateLabel,
  groupByPeriod,
  inDateRange,
} from "@/features/admin/components/ApprovalQueueView";

const item = (id: string, createdAt?: string) =>
  ({
    id,
    jd_id: `jd-${id}`,
    pay_rate_low: "50",
    pay_rate_high: "70",
    bill_rate_low: "62.5",
    bill_rate_high: "87.5",
    markup_pct: "25",
    confidence_score: 0.9,
    status: "pending",
    explanation: null,
    created_at: createdAt,
  }) as Parameters<typeof groupByPeriod>[0][number];

const iso = (d: Date): string => d.toISOString();

describe("dateKey", () => {
  it("returns local YYYY-MM-DD for a valid ISO timestamp", () => {
    const key = dateKey("2026-07-15T10:30:00Z");
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns empty string for missing or invalid input", () => {
    expect(dateKey(undefined)).toBe("");
    expect(dateKey("not-a-date")).toBe("");
  });
});

describe("dateLabel", () => {
  it("labels today's key as Today", () => {
    expect(dateLabel(dateKey(iso(new Date())))).toBe("Today");
  });

  it("labels yesterday's key as Yesterday", () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    expect(dateLabel(dateKey(iso(y)))).toBe("Yesterday");
  });

  it("formats older dates as e.g. 01 Jul 2026", () => {
    expect(dateLabel("2026-07-01")).toBe("01 Jul 2026");
  });

  it("labels an empty key as Undated", () => {
    expect(dateLabel("")).toBe("Undated");
  });
});

describe("groupByPeriod", () => {
  // Fixed "now": Thursday 2026-07-16 (local).
  const now = new Date(2026, 6, 16, 12, 0, 0);
  const local = (y: number, m: number, d: number): string =>
    new Date(y, m - 1, d, 9, 0, 0).toISOString();

  it("buckets items into Today / Yesterday / This Week / This Year / Older", () => {
    const groups = groupByPeriod(
      [
        item("old", local(2025, 12, 20)),
        item("t1", local(2026, 7, 16)),
        item("y1", local(2026, 7, 15)),
        item("w1", local(2026, 7, 13)), // Monday of that week
        item("yr1", local(2026, 7, 1)),
      ],
      now,
    );
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ["Today", ["t1"]],
      ["Yesterday", ["y1"]],
      ["This Week", ["w1"]],
      ["This Year", ["yr1"]],
      ["Older", ["old"]],
    ]);
  });

  it("omits empty buckets", () => {
    const groups = groupByPeriod([item("t1", local(2026, 7, 16))], now);
    expect(groups.map((g) => g.label)).toEqual(["Today"]);
  });

  it("sorts newest first within a bucket", () => {
    const groups = groupByPeriod([item("a", local(2026, 7, 2)), item("b", local(2026, 7, 8))], now);
    expect(groups[0].items.map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("puts undated items in Older", () => {
    const groups = groupByPeriod([item("nodate")], now);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([["Older", ["nodate"]]]);
  });
});

describe("inDateRange", () => {
  it("is inclusive on both bounds", () => {
    expect(inDateRange("2026-07-15", "2026-07-15", "2026-07-17")).toBe(true);
    expect(inDateRange("2026-07-17", "2026-07-15", "2026-07-17")).toBe(true);
    expect(inDateRange("2026-07-16", "2026-07-15", "2026-07-17")).toBe(true);
  });

  it("excludes dates outside the range", () => {
    expect(inDateRange("2026-07-14", "2026-07-15", "2026-07-17")).toBe(false);
    expect(inDateRange("2026-07-18", "2026-07-15", "2026-07-17")).toBe(false);
  });

  it("supports open-ended bounds", () => {
    expect(inDateRange("2026-07-01", "", "2026-07-17")).toBe(true);
    expect(inDateRange("2026-07-20", "2026-07-15", "")).toBe(true);
  });

  it("undated items only match when no bounds are set", () => {
    expect(inDateRange("", "", "")).toBe(true);
    expect(inDateRange("", "2026-07-15", "")).toBe(false);
  });
});
