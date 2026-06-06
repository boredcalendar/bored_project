import { type as arktype } from "arktype";

export const LogEntry = arktype({
  id: "number",
  date: "string",
  time: "number",
  "reflection?": "string",
  "+": "reject",
});

export type LogEntry = typeof LogEntry.infer;

function validateLogEntry(data: unknown, context: string): LogEntry {
  try {
    return LogEntry.assert(data);
  } catch (error) {
    throw new Error(
      `Log entry failed validation (${context}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function validateStoredLogEntry(data: unknown, context: string): LogEntry | undefined {
  if (data === undefined) {
    return undefined;
  }

  return validateLogEntry(data, context);
}

export function validateStoredLogEntries(data: unknown, context: string): LogEntry[] {
  if (!Array.isArray(data)) {
    throw new Error(`Log entry list failed validation (${context}): expected an array`);
  }

  return data.map((entry, index) => validateLogEntry(entry, `${context}[${index}]`));
}
