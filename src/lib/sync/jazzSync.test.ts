import { describe, expect, it } from "vitest";
import { ImportError, SCHEMA_VERSION } from "../dataPortability";
import {
  SYNC_SCHEMA_VERSION,
  SyncExport,
  applyRestore,
  classifyExport,
  parseSyncExport,
  redactSecret,
  toLocalExport,
  type DeviceIdentity,
  type IdGenerator,
  type SyncExport as SyncExportType,
} from "./jazzSync";

const exportedAt = "2026-06-06T00:00:00.000Z";

const day = { id: 1780704000000, date: "Jun 6, 2026", time: 20, reflection: "Watched clouds" };

function syncExport(identity?: DeviceIdentity): SyncExportType {
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    exportedAt,
    days: [day],
    ...(identity ? { identity } : {}),
  };
}

// Deterministic id generator so restore output is fully assertable.
const generate: IdGenerator = {
  userId: () => "new-user",
  deviceId: () => "new-device",
};

describe("classifyExport", () => {
  it("classifies an export with no identity as data-only", () => {
    expect(classifyExport(syncExport())).toBe("data-only");
  });

  it("classifies an export with userId but no secret as account-linked", () => {
    expect(classifyExport(syncExport({ userId: "u1", deviceId: "d1" }))).toBe("account-linked");
  });

  it("classifies an export carrying a device secret as secret-bearing", () => {
    expect(classifyExport(syncExport({ userId: "u1", deviceId: "d1", deviceSecret: "s1" }))).toBe(
      "secret-bearing",
    );
  });
});

describe("redactSecret", () => {
  it("strips the device secret from a secret-bearing export", () => {
    const redacted = redactSecret(syncExport({ userId: "u1", deviceId: "d1", deviceSecret: "s1" }));
    expect(redacted.identity?.deviceSecret).toBeUndefined();
    expect(classifyExport(redacted)).toBe("account-linked");
  });

  it("keeps userId/deviceId while redacting", () => {
    const redacted = redactSecret(syncExport({ userId: "u1", deviceId: "d1", deviceSecret: "s1" }));
    expect(redacted.identity).toEqual({ userId: "u1", deviceId: "d1" });
  });

  it("returns the export unchanged when there is no secret to strip", () => {
    const linked = syncExport({ userId: "u1", deviceId: "d1" });
    expect(redactSecret(linked)).toBe(linked);
    const dataOnly = syncExport();
    expect(redactSecret(dataOnly)).toBe(dataOnly);
  });

  it("does not mutate the original export", () => {
    const original = syncExport({ userId: "u1", deviceId: "d1", deviceSecret: "s1" });
    redactSecret(original);
    expect(original.identity?.deviceSecret).toBe("s1");
  });
});

describe("applyRestore — restore-this-device", () => {
  it("adopts the full saved identity from a secret-bearing export", () => {
    const result = applyRestore(
      syncExport({ userId: "u1", deviceId: "d1", deviceSecret: "s1" }),
      "restore-this-device",
      generate,
    );
    expect(result.identity).toEqual({ userId: "u1", deviceId: "d1", deviceSecret: "s1" });
    expect(result.requiresGroupAuthorization).toBe(false);
    expect(result.days).toEqual([day]);
  });

  it("throws when the export has no identity", () => {
    expect(() => applyRestore(syncExport(), "restore-this-device", generate)).toThrow(ImportError);
  });

  it("throws when the export has an identity but no secret", () => {
    expect(() =>
      applyRestore(syncExport({ userId: "u1", deviceId: "d1" }), "restore-this-device", generate),
    ).toThrow(ImportError);
  });
});

describe("applyRestore — add-new-device", () => {
  it("keeps the user but mints a fresh device id and drops the secret", () => {
    const result = applyRestore(
      syncExport({ userId: "u1", deviceId: "d1", deviceSecret: "s1" }),
      "add-new-device",
      generate,
    );
    expect(result.identity).toEqual({ userId: "u1", deviceId: "new-device" });
    expect(result.requiresGroupAuthorization).toBe(true);
    expect(result.days).toEqual([day]);
  });

  it("works from an account-linked (secret-less) export", () => {
    const result = applyRestore(
      syncExport({ userId: "u1", deviceId: "d1" }),
      "add-new-device",
      generate,
    );
    expect(result.identity).toEqual({ userId: "u1", deviceId: "new-device" });
    expect(result.requiresGroupAuthorization).toBe(true);
  });

  it("throws when there is no identity to join", () => {
    expect(() => applyRestore(syncExport(), "add-new-device", generate)).toThrow(ImportError);
  });
});

describe("applyRestore — import-data-only", () => {
  it("mints a brand-new, unlinked identity regardless of the file's identity", () => {
    const result = applyRestore(
      syncExport({ userId: "u1", deviceId: "d1", deviceSecret: "s1" }),
      "import-data-only",
      generate,
    );
    expect(result.identity).toEqual({ userId: "new-user", deviceId: "new-device" });
    expect(result.requiresGroupAuthorization).toBe(false);
    expect(result.days).toEqual([day]);
  });

  it("works when the file carries no identity at all", () => {
    const result = applyRestore(syncExport(), "import-data-only", generate);
    expect(result.identity).toEqual({ userId: "new-user", deviceId: "new-device" });
  });
});

describe("applyRestore — does not mutate its input", () => {
  it("restore-this-device returns copies, so mutating the result is safe", () => {
    const data = syncExport({ userId: "u1", deviceId: "d1", deviceSecret: "s1" });
    const result = applyRestore(data, "restore-this-device", generate);
    result.days.push({ id: 2, date: "Jun 7, 2026", time: 1 });
    (result.identity as { deviceSecret?: string }).deviceSecret = "tampered";
    expect(data.days).toEqual([day]);
    expect(data.identity).toEqual({ userId: "u1", deviceId: "d1", deviceSecret: "s1" });
  });

  it("import-data-only returns a copy of days", () => {
    const data = syncExport();
    const result = applyRestore(data, "import-data-only", generate);
    result.days.push({ id: 2, date: "Jun 7, 2026", time: 1 });
    expect(data.days).toEqual([day]);
  });
});

describe("parseSyncExport", () => {
  it("round-trips a well-formed sync export", () => {
    const text = JSON.stringify(syncExport({ userId: "u1", deviceId: "d1", deviceSecret: "s1" }));
    const parsed = parseSyncExport(text);
    expect(parsed.days).toEqual([day]);
    expect(parsed.identity).toEqual({ userId: "u1", deviceId: "d1", deviceSecret: "s1" });
  });

  it("accepts a sync export with no identity", () => {
    expect(parseSyncExport(JSON.stringify(syncExport())).identity).toBeUndefined();
  });

  it("rejects non-JSON with a gentle message", () => {
    expect(() => parseSyncExport("not json{")).toThrow(ImportError);
    expect(() => parseSyncExport("not json{")).toThrow(/valid JSON/);
  });

  it("detects a v1 local-only export and points to the standard import", () => {
    const v1 = JSON.stringify({ schemaVersion: SCHEMA_VERSION, exportedAt, days: [day] });
    expect(() => parseSyncExport(v1)).toThrow(/local-only export/);
  });

  it("rejects wrong-shape JSON without leaking a raw validation error", () => {
    const text = JSON.stringify({
      schemaVersion: SYNC_SCHEMA_VERSION,
      exportedAt,
      days: [{ id: 1 }],
    });
    expect(() => parseSyncExport(text)).toThrow(/sync export/);
  });

  it("rejects extra top-level keys (strict envelope)", () => {
    const text = JSON.stringify({ ...syncExport(), sneaky: true });
    expect(() => parseSyncExport(text)).toThrow(ImportError);
  });

  it("rejects extra keys inside the identity block", () => {
    const text = JSON.stringify({
      schemaVersion: SYNC_SCHEMA_VERSION,
      exportedAt,
      days: [day],
      identity: { userId: "u1", deviceId: "d1", rogue: true },
    });
    expect(() => parseSyncExport(text)).toThrow(ImportError);
  });

  it("rejects a smuggled __proto__ key that would slip past strict validation", () => {
    const text = `{"schemaVersion":${SYNC_SCHEMA_VERSION},"exportedAt":"${exportedAt}","days":[],"__proto__":{"polluted":true}}`;
    expect(() => parseSyncExport(text)).toThrow(ImportError);
  });
});

describe("toLocalExport (migration away from Jazz)", () => {
  it("degrades a sync export to a valid v1 local export, dropping identity", () => {
    const text = JSON.stringify(syncExport({ userId: "u1", deviceId: "d1", deviceSecret: "s1" }));
    const local = toLocalExport(text);
    expect(local.schemaVersion).toBe(SCHEMA_VERSION);
    expect(local.exportedAt).toBe(exportedAt);
    expect(local.days).toEqual([day]);
    expect(local).not.toHaveProperty("identity");
  });

  it("propagates ImportError for a non-sync file", () => {
    const v1 = JSON.stringify({ schemaVersion: SCHEMA_VERSION, exportedAt, days: [day] });
    expect(() => toLocalExport(v1)).toThrow(/local-only export/);
  });
});

describe("SyncExport type guard", () => {
  it("validates a well-formed payload", () => {
    const result = SyncExport(syncExport());
    expect(result).toEqual(syncExport());
  });
});
