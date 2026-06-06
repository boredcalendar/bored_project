import { useState } from "react";
import { JazzProvider, useAll, useDb, useLocalFirstAuth, useSession } from "jazz-tools/react";
import { app } from "../lib/jazz/schema";

/**
 * Jazz v2 sync proof-of-concept (issue #22, Option A).
 *
 * This is a real, runtime Jazz integration — NOT the dependency-free model from
 * the earlier spike commit. It is mounted only on the dedicated `/jazz-poc`
 * route (client:only) so the main local-only app is untouched. Sync config comes
 * from PUBLIC_ env vars; with no config the page explains how to set it up rather
 * than crashing, which keeps CI (no secrets) green.
 *
 * Identity mapping proven here (matches docs/jazz-spike.md):
 *   useLocalFirstAuth().secret  -> the device seed  (our `deviceSecret`)
 *   login(secret)               -> "restore this device" from a backup
 *   signOut()                   -> forget this device's identity
 */

const APP_ID = import.meta.env.PUBLIC_JAZZ_APP_ID as string | undefined;
const SERVER_URL = import.meta.env.PUBLIC_JAZZ_SERVER_URL as string | undefined;

function midnightKey(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Jazz sync PoC</h1>
      <p className="mt-3 text-stone-600">
        This proof-of-concept needs a Jazz app id and sync server. Create a <code>.env</code> with:
      </p>
      <pre className="mt-3 rounded bg-stone-100 p-3 text-sm">
        PUBLIC_JAZZ_APP_ID=…{"\n"}PUBLIC_JAZZ_SERVER_URL=https://v2.sync.jazz.tools/
      </pre>
      <p className="mt-3 text-sm text-stone-500">
        Without it the page stays inert — the main local-only app is unaffected.
      </p>
    </div>
  );
}

function SyncStatus() {
  const session = useSession();
  return (
    <p className="text-xs text-stone-500">
      {session
        ? `Connected as ${session.user_id ?? "local identity"}`
        : "Local only (not yet synced)"}
    </p>
  );
}

function DeviceKey() {
  const { secret, login, signOut } = useLocalFirstAuth();
  const [restoreInput, setRestoreInput] = useState("");
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="mt-6 rounded border border-stone-200 p-4">
      <h2 className="font-medium">This device&rsquo;s key</h2>
      <p className="mt-1 text-sm text-stone-600">
        Back this up to restore on another device. Anyone with it can act as this device — treat it
        like a password.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="block grow truncate rounded bg-stone-100 p-2 text-xs">
          {secret ? (revealed ? secret : "•".repeat(24)) : "(none yet)"}
        </code>
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs"
          onClick={() => setRevealed((v) => !v)}
        >
          {revealed ? "Hide" : "Reveal"}
        </button>
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium" htmlFor="restore">
          Restore this device from a backed-up key
        </label>
        <textarea
          id="restore"
          aria-label="Restore this device from a backed-up key"
          className="mt-1 w-full rounded border p-2 text-xs"
          rows={2}
          value={restoreInput}
          onChange={(e) => setRestoreInput(e.target.value)}
          placeholder="Paste a device key…"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="rounded bg-stone-800 px-3 py-1 text-xs text-white disabled:opacity-40"
            disabled={!restoreInput.trim()}
            onClick={() => void login(restoreInput.trim())}
          >
            Restore this device
          </button>
          <button
            type="button"
            className="rounded border px-3 py-1 text-xs"
            onClick={() => void signOut()}
          >
            Forget identity
          </button>
        </div>
      </div>
    </section>
  );
}

function Days() {
  const db = useDb();
  // useAll is typed from the table's row type, so `days` is BoredDayRow[] | undefined.
  const days = useAll(app.boredDays);
  const [minutes, setMinutes] = useState(15);

  async function logToday() {
    const now = new Date();
    const dayKey = midnightKey(now);
    const existing = days?.find((d) => d.dayKey === dayKey);
    const date = now.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (existing) {
      db.update(app.boredDays, existing.id, { minutes });
    } else {
      db.insert(app.boredDays, { dayKey, date, minutes });
    }
  }

  return (
    <section className="mt-6">
      <h2 className="font-medium">Boredom log (synced via Jazz)</h2>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={240}
          aria-label="Minutes spent bored today"
          className="w-24 rounded border p-2"
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value) || 0)}
        />
        <button
          type="button"
          className="rounded bg-stone-800 px-3 py-1 text-sm text-white"
          onClick={() => void logToday()}
        >
          Log today
        </button>
      </div>
      <ul className="mt-4 space-y-1">
        {days === undefined && <li className="text-sm text-stone-400">Loading…</li>}
        {days?.length === 0 && <li className="text-sm text-stone-400">No days logged yet.</li>}
        {days
          ?.slice()
          .sort((a, b) => b.dayKey - a.dayKey)
          .map((d) => (
            <li key={d.id} className="flex justify-between rounded bg-stone-50 px-3 py-2 text-sm">
              <span>{d.date}</span>
              <span className="tabular-nums">{d.minutes} min</span>
            </li>
          ))}
      </ul>
    </section>
  );
}

function Inner() {
  return (
    <div className="mx-auto max-w-xl p-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Jazz sync PoC</h1>
        <SyncStatus />
      </header>
      <p className="mt-1 text-sm text-stone-500">
        Open this page in two browser profiles to watch days sync. Edit offline, then reconnect to
        see the queued writes replay.
      </p>
      <Days />
      <DeviceKey />
    </div>
  );
}

export default function JazzPoc() {
  // Exactly one hook above the guards below. APP_ID/SERVER_URL are module
  // constants, so hook order is stable per mount — keep any new hooks above the
  // early returns to preserve that.
  const { secret, isLoading } = useLocalFirstAuth();

  if (!APP_ID || !SERVER_URL) {
    return <NotConfigured />;
  }
  if (isLoading) {
    return <div className="p-6 text-stone-500">Loading local identity…</div>;
  }

  return (
    <JazzProvider
      config={{ appId: APP_ID, serverUrl: SERVER_URL, secret: secret ?? undefined }}
      fallback={<div className="p-6 text-stone-500">Connecting to Jazz…</div>}
    >
      <Inner />
    </JazzProvider>
  );
}
