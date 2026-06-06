import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, parseExport } from "../dataPortability";

// Guards the dev/QA fixture: if the export format changes, this fails until the
// example file is regenerated, so the documented example never drifts stale.
describe("example-export.json fixture", () => {
  const text = readFileSync(new URL("./example-export.json", import.meta.url), "utf8");

  it("is a valid current-version export", () => {
    const parsed = parseExport(text);
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.days.length).toBeGreaterThan(0);
  });
});
