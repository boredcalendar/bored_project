import { describe, expect, it } from "vitest";
import { type as arktype } from "arktype";
import {
  BoredExport,
  ImportError,
  MAX_DAILY_MINUTES,
  SCHEMA_VERSION,
  buildExport,
  mergeDays,
  parseExport,
  planExport,
  planImport,
  serializeExport,
} from "./dataPortability";
import type { LogEntry } from "../components/logEntry";

const sampleDays: LogEntry[] = [
  { id: 1780704000000, date: "Jun 6, 2026", time: 20, reflection: "Watched clouds" },
  { id: 1780790400000, date: "Jun 7, 2026", time: 5, reflection: "" },
];

const exportedAt = "2026-06-06T00:00:00.000Z";

describe("serializeExport / buildExport", () => {
  it("wraps days in the versioned envelope", () => {
    const payload = buildExport(sampleDays, exportedAt);
    expect(payload).toEqual({ schemaVersion: SCHEMA_VERSION, exportedAt, days: sampleDays });
  });

  it("produces JSON that round-trips through parseExport", () => {
    const text = serializeExport(sampleDays, exportedAt);
    const parsed = parseExport(text);
    expect(parsed.days).toEqual(sampleDays);
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.exportedAt).toBe(exportedAt);
  });

  it("ends with a trailing newline (POSIX-friendly files)", () => {
    expect(serializeExport([], exportedAt).endsWith("}\n")).toBe(true);
  });
});

describe("parseExport", () => {
  it("rejects non-JSON with a gentle message", () => {
    expect(() => parseExport("not json{")).toThrow(ImportError);
    expect(() => parseExport("not json{")).toThrow(/valid JSON/);
  });

  it("rejects a newer schema version with a version-specific message", () => {
    const text = JSON.stringify({ schemaVersion: 99, exportedAt, days: [] });
    expect(() => parseExport(text)).toThrow(/format version 99/);
  });

  it("rejects wrong-shape JSON without throwing a raw validation error", () => {
    const text = JSON.stringify({ schemaVersion: SCHEMA_VERSION, exportedAt, days: [{ id: 1 }] });
    expect(() => parseExport(text)).toThrow(ImportError);
    expect(() => parseExport(text)).toThrow(/doesn't look like a Bored Calendar export/);
  });

  it("rejects extra top-level keys (strict envelope)", () => {
    const text = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt,
      days: [],
      sneaky: true,
    });
    expect(() => parseExport(text)).toThrow(ImportError);
  });

  it("rejects extra keys inside a day entry", () => {
    const text = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt,
      days: [{ ...sampleDays[0], rogue: 1 }],
    });
    expect(() => parseExport(text)).toThrow(ImportError);
  });

  it("accepts a day without the optional reflection", () => {
    const text = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt,
      days: [{ id: 1780704000000, date: "Jun 6, 2026", time: 20 }],
    });
    expect(parseExport(text).days).toHaveLength(1);
  });

  it("rejects a non-integer (fractional) day id", () => {
    const text = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt,
      days: [{ id: 1.5, date: "Jun 6, 2026", time: 20 }],
    });
    expect(() => parseExport(text)).toThrow(ImportError);
  });

  it("rejects a negative time", () => {
    const text = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt,
      days: [{ id: 1780704000000, date: "Jun 6, 2026", time: -5 }],
    });
    expect(() => parseExport(text)).toThrow(ImportError);
  });

  it(`rejects a time above ${MAX_DAILY_MINUTES} minutes`, () => {
    const text = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt,
      days: [{ id: 1780704000000, date: "Jun 6, 2026", time: MAX_DAILY_MINUTES + 1 }],
    });
    expect(() => parseExport(text)).toThrow(ImportError);
  });

  it("rejects a non-integer time", () => {
    const text = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt,
      days: [{ id: 1780704000000, date: "Jun 6, 2026", time: 12.5 }],
    });
    expect(() => parseExport(text)).toThrow(ImportError);
  });

  it("accepts the boundary times 0 and the daily max", () => {
    const text = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt,
      days: [
        { id: 1780704000000, date: "Jun 6, 2026", time: 0 },
        { id: 1780790400000, date: "Jun 7, 2026", time: MAX_DAILY_MINUTES },
      ],
    });
    expect(parseExport(text).days).toHaveLength(2);
  });
});

describe("planExport (refuse export when store not loaded)", () => {
  it("refuses when days are undefined (loading or read error)", () => {
    const plan = planExport(undefined);
    expect(plan.ok).toBe(false);
    if (!plan.ok) {
      expect(plan.reason).toMatch(/nothing was exported/);
    }
  });

  it("allows export of an empty (but loaded) store", () => {
    expect(planExport([])).toEqual({ ok: true, days: [] });
  });

  it("passes through loaded days", () => {
    expect(planExport(sampleDays)).toEqual({ ok: true, days: sampleDays });
  });
});

describe("planImport (validate existing + file, then merge)", () => {
  const fileText = JSON.stringify(buildExport([sampleDays[1]], exportedAt));

  it("merges file days over existing stored days", () => {
    const plan = planImport([sampleDays[0]], fileText);
    expect(plan.merged).toEqual([sampleDays[0], sampleDays[1]]);
    expect(plan.imported).toEqual([sampleDays[1]]);
  });

  it("tolerates an empty existing store", () => {
    const plan = planImport([], fileText);
    expect(plan.merged).toEqual([sampleDays[1]]);
  });

  it("throws ImportError for a bad file before touching data", () => {
    expect(() => planImport([sampleDays[0]], "not json{")).toThrow(ImportError);
  });

  it("throws if the existing stored data is itself corrupt", () => {
    expect(() => planImport([{ id: "oops" }], fileText)).toThrow();
  });
});

describe("mergeDays (upsert by id, imported wins)", () => {
  it("adds new days and keeps existing ones", () => {
    const existing = [sampleDays[0]];
    const imported = [sampleDays[1]];
    expect(mergeDays(existing, imported)).toEqual([sampleDays[0], sampleDays[1]]);
  });

  it("overwrites an existing day when ids collide", () => {
    const existing = [sampleDays[0]];
    const updated: LogEntry = { ...sampleDays[0], time: 40, reflection: "Updated" };
    expect(mergeDays(existing, [updated])).toEqual([updated]);
  });

  it("never drops days missing from the import (no destructive replace)", () => {
    const merged = mergeDays(sampleDays, []);
    expect(merged).toEqual(sampleDays);
  });

  it("returns days sorted by id ascending", () => {
    const merged = mergeDays([sampleDays[1]], [sampleDays[0]]);
    expect(merged.map((d) => d.id)).toEqual([sampleDays[0].id, sampleDays[1].id]);
  });
});

describe("BoredExport type guard", () => {
  it("returns validated data for a well-formed payload", () => {
    const result = BoredExport({ schemaVersion: SCHEMA_VERSION, exportedAt, days: sampleDays });
    expect(result).toEqual({ schemaVersion: SCHEMA_VERSION, exportedAt, days: sampleDays });
  });

  it("flags a malformed payload with an arktype errors summary", () => {
    const result = BoredExport({ schemaVersion: SCHEMA_VERSION });
    expect(result).toBeInstanceOf(arktype.errors);
    expect((result as { summary: string }).summary).toBeTruthy();
  });
});
