# Data portability (JSON import/export)

Bored Calendar stores your days locally in the browser (IndexedDB). To make
backup, restore, and moving between devices possible **without an account or
cloud sync**, the app can export all local data to a JSON file and import it
back.

This document describes the on-disk format so future versions can migrate old
files safely.

## Where it lives in the UI

On the `/app` screen, open the **Backup & restore** section:

- **Export JSON** downloads a file named `bored-calendar-YYYY-MM-DD.json`.
- **Import JSON** reads a file and merges its days into local storage.
- **Persistent storage** shows whether the browser has agreed to keep your data
  (and offers a button to request it where supported).

## File format

```jsonc
{
  "schemaVersion": 1,
  "exportedAt": "2026-06-06T00:00:00.000Z", // ISO-8601, informational
  "days": [
    {
      "id": 1780704000000, // local midnight of the day, in epoch ms (the storage key)
      "date": "Jun 6, 2026", // human-readable label as rendered when saved
      "time": 20, // minutes of boredom remembered (integer, 0–240)
      "reflection": "", // optional free-text note
    },
  ],
}
```

The shape of each day matches the `LogEntry` type used by IndexedDB
(`src/components/logEntry.ts`), so an export is a faithful snapshot of stored
data.

A canonical example lives at
[`src/lib/fixtures/example-export.json`](../src/lib/fixtures/example-export.json)
and is kept valid by a test, so it is safe to load into the app for dev/QA.

### Field notes

- `id` is the day's local-midnight timestamp in epoch milliseconds. It is the
  IndexedDB key, so it determines which day an entry overwrites on import.
- `date` is a display label produced by `toLocaleDateString`. It is not parsed
  on import; `id` is the source of truth.
- `reflection` is optional and may be omitted or empty.
- Unknown/extra keys are **rejected** (strict validation), both at the top level
  and inside each day.

## Import behavior: merge (upsert), never destructive

Import **merges** by `id`:

- Days in the file are added.
- Days already present with the same `id` are **overwritten** (imported wins).
- Days that exist locally but are absent from the file are **left untouched**.

This means importing a partial or older export can never wipe local history.
There is intentionally no "replace all" mode in this version.

## Validation and safety

Import validates the whole file **before writing anything**:

1. The file must be valid JSON.
2. `schemaVersion` must equal the version this app understands (currently `1`).
   A recognizably newer file produces a clear version message.
3. The envelope and every day must match the expected shape (via
   [arktype](https://arktype.io/)).

If any check fails, the user sees a gentle message and **no data is changed**.

## Versioning and future migrations

`schemaVersion` is a single integer, bumped only on non-additive changes.
`SCHEMA_VERSION` is defined in `src/lib/dataPortability.ts`. To introduce a v2:

1. Bump `SCHEMA_VERSION` to `2` and update the `BoredExport` schema.
2. In `parseExport`, branch on the detected version and upgrade v1 payloads to
   the v2 shape before validation (instead of rejecting them).
3. Add a fixture and tests for the new version.

Because the version is detected before strict validation, old files can be
recognized and migrated rather than rejected.

## Relationship to sync (Jazz spike)

JSON import/export is the local-only foundation. A separate spike (issue #22)
explores Jazz for optional multi-device sync, including how identity/secret
material could extend this export format for "restore this device" vs "add a new
device" flows. See [`docs/jazz-spike.md`](./jazz-spike.md) once that lands.

```

```
