import { schema as s } from "jazz-tools";

/**
 * Jazz v2 schema for the Bored Calendar sync PoC (issue #22, Option A).
 *
 * This is the real, runtime Jazz relational schema — one row per logged day —
 * mirroring the local `LogEntry` shape (`src/components/logEntry.ts`). Jazz owns
 * its own string row `id`; our logical day key (local-midnight epoch ms) lives in
 * `dayKey` so we can upsert by day the same way IndexedDB keys by it.
 *
 * `minutes` is an INTEGER column left on the default last-write-wins merge — the
 * conflict behavior the spike doc argues is acceptable for a personal daily
 * journal. Jazz also supports counter-style merges on integers if we ever want
 * additive resolution instead.
 */
const appSchema = {
  boredDays: s.table({
    dayKey: s.int(),
    date: s.string(),
    minutes: s.int(),
    reflection: s.string().optional(),
  }),
};

type AppSchema = s.Schema<typeof appSchema>;

export const app: s.App<AppSchema> = s.defineApp(appSchema);
