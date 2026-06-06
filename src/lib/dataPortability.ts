import { type as arktype } from "arktype";
import { validateStoredLogEntries, type LogEntry } from "../components/logEntry";

// Bump this when the on-disk export shape changes in a non-additive way. Older
// files are detected by `parseExport` so we can show a clear message (and, later,
// run a migration) instead of failing with a confusing validation error.
export const SCHEMA_VERSION = 1;

// Largest daily total the UI can represent (mirrors `maxDailyMinutes` in App).
export const MAX_DAILY_MINUTES = 240;

// Import files are untrusted, so days are validated more strictly than data we
// wrote ourselves: ids must be non-negative integer day-keys and times must be
// whole minutes within the range the app can actually display. This is the gate
// that makes "validate before write" meaningful for hand-edited files.
export const ImportDay = arktype({
  id: "number.integer >= 0",
  date: "string",
  time: `0 <= number.integer <= ${MAX_DAILY_MINUTES}`,
  "reflection?": "string",
  "+": "reject",
});

// A Bored Calendar export is intentionally small and human-readable: a version,
// a timestamp, and the list of logged days exactly as they live in IndexedDB.
export const BoredExport = arktype({
  schemaVersion: arktype.unit(SCHEMA_VERSION),
  exportedAt: "string",
  days: ImportDay.array(),
  "+": "reject",
});

export type BoredExport = typeof BoredExport.infer;

/** A user-facing error whose message is safe to show directly in the UI. */
export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

/**
 * Parse JSON from an untrusted file while refusing `__proto__` keys.
 * `JSON.parse` materializes a literal `"__proto__"` key as a real own property
 * that arktype's strict `"+": "reject"` does NOT catch, so without this an
 * attacker-crafted file could smuggle an extra key (or pollute objects derived
 * from the result). The reviver runs for every nested key, so this guards the
 * whole tree. Throws `ImportError` (never a raw `SyntaxError`).
 */
export function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text, (key, value) => {
      if (key === "__proto__") {
        throw new ImportError(
          "This file isn't valid JSON. Please choose a Bored Calendar export file.",
        );
      }
      return value;
    });
  } catch (error) {
    if (error instanceof ImportError) {
      throw error;
    }
    throw new ImportError(
      "This file isn't valid JSON. Please choose a Bored Calendar export file.",
    );
  }
}

export function buildExport(days: LogEntry[], exportedAt: string): BoredExport {
  return { schemaVersion: SCHEMA_VERSION, exportedAt, days };
}

/** Serialize logged days to the versioned JSON export string. */
export function serializeExport(days: LogEntry[], exportedAt: string): string {
  return `${JSON.stringify(buildExport(days, exportedAt), null, 2)}\n`;
}

/**
 * Parse and validate an export file. Throws `ImportError` with a gentle,
 * user-facing message for anything that isn't a well-formed current export, so
 * callers never write partial/corrupt data to storage.
 */
export function parseExport(text: string): BoredExport {
  const parsed = safeJsonParse(text);

  // Detect a recognizable-but-newer export before strict validation so we can
  // explain the version mismatch instead of dumping a shape error.
  if (
    parsed !== null &&
    typeof parsed === "object" &&
    "schemaVersion" in parsed &&
    typeof (parsed as { schemaVersion: unknown }).schemaVersion === "number" &&
    (parsed as { schemaVersion: number }).schemaVersion !== SCHEMA_VERSION
  ) {
    const found = (parsed as { schemaVersion: number }).schemaVersion;
    throw new ImportError(
      `This export uses format version ${found}, but this app understands version ${SCHEMA_VERSION}.`,
    );
  }

  const result = BoredExport(parsed);
  if (result instanceof arktype.errors) {
    throw new ImportError(
      "This file doesn't look like a Bored Calendar export, so nothing was changed.",
    );
  }
  return result;
}

/**
 * Merge imported days into existing days, keyed by day id (the day's midnight
 * timestamp). Imported days win on conflict. This is an upsert, not a replace:
 * importing never deletes days that aren't in the file, so a partial export can
 * never wipe local history.
 */
export function mergeDays(existing: LogEntry[], imported: LogEntry[]): LogEntry[] {
  const byId = new Map<number, LogEntry>();
  for (const day of existing) {
    byId.set(day.id, day);
  }
  for (const day of imported) {
    byId.set(day.id, day);
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export type ExportPlan = { ok: true; days: LogEntry[] } | { ok: false; reason: string };

/**
 * Decide whether an export is safe to produce. `days` is `undefined` while the
 * store is still loading or if the read failed; in either case we refuse rather
 * than hand back a misleading empty backup.
 */
export function planExport(days: LogEntry[] | undefined): ExportPlan {
  if (days === undefined) {
    return {
      ok: false,
      reason: "Your days are still loading or couldn't be read, so nothing was exported.",
    };
  }
  return { ok: true, days };
}

export type ImportPlan = {
  /** Full set to persist (existing upserted with imported). */
  merged: LogEntry[];
  /** Days that came from the file (for user-facing counts). */
  imported: LogEntry[];
};

/**
 * Validate the existing stored days and the imported file, then return the
 * merged set to persist. Throws `ImportError` for a bad file before any write
 * is attempted, so a failed import never mutates storage.
 */
export function planImport(existingRaw: unknown, fileText: string): ImportPlan {
  const parsed = parseExport(fileText);
  const existing = validateStoredLogEntries(existingRaw, "import.existing");
  return { merged: mergeDays(existing, parsed.days), imported: parsed.days };
}
