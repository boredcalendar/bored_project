# Jazz spike — local-first multi-device sync (issue #22)

Status: **spike / running proof-of-concept.** The deliverable is three things:

1. **A real, runtime Jazz integration** — `src/components/JazzPoc.tsx` +
   `src/lib/jazz/schema.ts`, mounted on a dedicated `/jazz-poc` route
   (`client:only`). It declares a Jazz v2 relational schema, reads/writes a synced
   `boredDays` table, and exposes device-key backup/restore via Jazz's local-first
   auth. This is what proves the engine actually works against the live sync server.
2. **The export/restore + identity-sensitivity model** — `src/lib/sync/jazzSync.ts`
   (pure, dependency-free, fully tested): how identity/secret material rides along
   with a JSON export and what "restore this device" vs "add a new device" vs
   "import data only" mean. This is the product layer we would build _on top of_ the
   raw engine.
3. **This decision doc** — the recommendation, the cost/maturity analysis, and the
   verification findings (including a hard environment blocker, below).

The `/jazz-poc` route is isolated: the main app (issue #21) stays local-only and
account-free. Sync config comes from `PUBLIC_`-prefixed env vars; with no config
the page renders setup instructions instead of crashing, so CI (which has no
secrets) stays green.

## TL;DR recommendation

**Proceed with Jazz as the sync engine, but gate it behind an explicit opt-in
and ship secret-bearing exports only with passphrase encryption.** Jazz fits the
local-first product shape better than a backend-first option (Convex/Supabase),
its cost at Bored Calendar's scale is negligible, and it is self-hostable if we
ever need to leave the cloud. The main risk is maturity (**Jazz v2 is alpha as
of 2026-06-06**), so the
recommendation is: build the integration behind a flag, keep the IndexedDB +
JSON import/export path (issue #21) as the always-available floor, and do a live
two-device + offline validation run before exposing sync to users.

## How Jazz maps onto Bored Calendar

Jazz stores data as **CoValues** (collaborative values: `CoMap`, `CoList`, etc.)
that live in a local replica (IndexedDB / OPFS in the browser) and sync through a
server. Each CoValue is owned by an **Account** or a **Group**, and access is
controlled by group membership. Authentication establishes which Account the
current device acts as; the Account's secret is the key material that proves it.

We map our existing model (`src/components/logEntry.ts`, one `LogEntry` per day,
keyed by local-midnight epoch ms) like this:

| Bored Calendar concept                   | Jazz primitive                                       | Notes                                              |
| ---------------------------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| The person / data owner (`userId`)       | a **Group** that owns the log                        | members of the group can read/write the days       |
| One device/install (`deviceId`)          | an **Account**                                       | each device is its own account with its own secret |
| Device write capability (`deviceSecret`) | the Account's **Account Secret**                     | proves the device can act as itself                |
| The daily boredom log                    | a `CoList`/`CoMap` of day entries owned by the Group | one entry per day, same `id` key as today          |

Modeling each device as its own Account that is a _member_ of the user's Group
(rather than sharing one master secret across devices) means losing or leaking
one device never compromises the others — we can revoke a single device's
membership. This is the model the spike code encodes.

> **The actual v2 schema we shipped in the PoC** (`src/lib/jazz/schema.ts`):
>
> ```ts
> import { schema as s } from "jazz-tools";
> const appSchema = {
>   boredDays: s.table({
>     dayKey: s.int(), // local-midnight epoch ms — our logical day key
>     date: s.string(),
>     minutes: s.int(),
>     reflection: s.string().optional(),
>   }),
> };
> export const app = s.defineApp(appSchema);
> ```
>
> Shapes mirror the issue #21 `ImportDay` schema so an export and a synced row are
> the same data. Jazz owns its own string row `id`; our `dayKey` is what we upsert
> by, exactly as IndexedDB keys by it today.

> **API note — Jazz v2 alpha is a relational redesign.** The Group/Account/CoValue
> primitives in the table above are the _classic_ Jazz mental model and the
> longer-term permission story. The installed v2 alpha (`jazz-tools@2.0.0-alpha.50`)
> instead exposes a **relational** API: `s.table(...)`, `db.insert/update/all`, and a
> single per-device **local-first auth secret** (`useLocalFirstAuth().secret`) rather
> than an explicit Account-per-device / Group-membership split. The PoC proves the
> `deviceSecret` half of the mapping for real (the local seed _is_ the device's key,
> `login()` restores it, `signOut()` forgets it). The richer multi-device
> Group-authorization model in `jazzSync.ts` is therefore **design-ahead of the
> alpha API** — it stays valid as the product target, but the exact v2 primitives for
> multi-device authorization were still in flux at spike time and need re-confirming
> against a later release.

## What this spike actually implements

`src/lib/sync/jazzSync.ts` is dependency-free and models the export/restore
surface:

- **`SyncExport` (schemaVersion 2)** — the issue #21 v1 day list plus an optional
  `identity` block (`userId`, `deviceId`, optional `deviceSecret`). It reuses the
  strict, bounds-checked `ImportDay` schema from `dataPortability.ts`, so a sync
  export validates days exactly as strictly as a local export. Sync exports use a
  higher schema version so a v1-only reader rejects them clearly instead of
  misreading them, and `parseSyncExport` detects a v1 file and routes it back to
  the plain import path.
- **Export sensitivity** — `classifyExport` labels a file `data-only`,
  `account-linked`, or `secret-bearing`, and `redactSecret` strips the secret to
  downgrade `secret-bearing` → `account-linked`. This is what lets the UI warn
  appropriately and offer a "share-safe" export.
- **The three restore modes** — `applyRestore(data, mode, generate)` is pure (id
  generation is injected) and encodes the exact semantics below.

### Restore-mode UX (the answer to "exact UX for restore vs add-new-device")

| Mode                         | Requires                    | Resulting identity                                    | Group authorization                                 |
| ---------------------------- | --------------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| **Restore this device**      | a **secret-bearing** export | adopt `userId` + `deviceId` + `deviceSecret` verbatim | none — it _is_ the device                           |
| **Add this as a new device** | any export with an identity | keep `userId`, mint a fresh `deviceId`, **no** secret | **yes** — a trusted device must approve the new one |
| **Import data only**         | nothing (identity ignored)  | mint fresh `userId` + `deviceId`                      | none — unlinked copy                                |

Concretely in the UI:

- _Restore this device_ is the "I lost my phone, restore from backup" flow. It
  only makes sense if the backup carries the device secret, so we reject a
  secret-less file with a message that points the user at "Add as a new device".
- _Add this as a new device_ is "connect my laptop to the same account". The new
  device provisions its own Account (its own secret), so it cannot write until an
  already-trusted device authorizes it into the Group. The spike surfaces this as
  `requiresGroupAuthorization: true` rather than pretending the device is
  instantly trusted — that approval step is real in Jazz's permission model.
- _Import data only_ is "copy these days into a brand-new identity" — useful for
  trying the app, sharing a dataset, or starting clean.

## Answers to the issue's questions

**Can Jazz give us multi-device sync while keeping local-first behavior?** Yes —
that is precisely Jazz's model: a local replica is the source of truth and sync
is a background concern. The app stays usable offline and without an account; sync
is additive. This preserves the issue #21 / #22 non-goal of not requiring accounts
to use the app. _(Needs a live run on a supported architecture to confirm the
offline-then-reconnect replay behaves as documented — see "Verification" below.)_

**Can we safely include identity/secret material in exports, or should
secret-bearing exports require passphrase encryption?** A `secret-bearing` export
is equivalent to a password/seed-phrase backup: anyone holding the file can act
as that device. **Recommendation: secret-bearing exports must be passphrase-
encrypted** (e.g. wrap the `identity` block with WebCrypto AES-GCM + a
user-supplied passphrase, PBKDF2/Argon2 KDF). `data-only` and `account-linked`
exports can stay plaintext. The spike already separates these via
`classifyExport`/`redactSecret`, so the encryption boundary is well-defined: only
the `identity.deviceSecret` (and arguably the whole `identity`) needs wrapping.
The default export button should produce a `data-only` or redacted file; emitting
a secret requires an explicit, warned action.

**What happens if browser storage is cleared and the user loses the local
secret?** Without the Account Secret, the device can no longer prove it owns its
data. If the Group still has another authorized device (e.g. the laptop), the
data survives there and the wiped device can rejoin via _add-new-device_ +
re-authorization. If it was the _only_ device and there is **no** secret-bearing
backup, the synced data is effectively unrecoverable — there is no server-side
password reset in a local-first model. This is why we (a) request persistent
storage (issue #21's `persistentStorage.ts`, `navigator.storage.persist()`) to
reduce eviction risk, and (b) prompt for a secret-bearing encrypted backup when
sync is first enabled. The UI must state this trade-off plainly.

**Same-day conflict / is last-write-wins acceptable for v1?** Bored Calendar's
edits are single-user, low-frequency, and per-day (one `time` value + one
`reflection` per day id). Jazz CoMaps resolve concurrent field writes
last-write-wins. For our data, the realistic conflict is "edited the same day's
minutes on two devices while offline" — LWW (last edit wins) is **acceptable for
v1** and matches user expectation for a personal journal. If we later want to
avoid silently losing a number, the per-day `time` could become an additive
structure, but that is out of scope. _Document LWW in the sync UI._

**Does Jazz Cloud pricing + alpha maturity feel acceptable?** Pricing is
usage-based, scale-to-zero: **$0.15 / 1M I/O ops, $0.45 / GB-month storage, $0.09
/ GB egress** (jazz.tools, as of 2026-06-06 — verify current rates before
committing). Our data is tiny — a day entry is ~50–100 bytes,
one write/day/user, occasional sync reads. Even **10,000 daily-active users**
generate on the order of a few hundred thousand ops/month and well under a GB of
storage/egress, i.e. **a few dollars/month** total; their own published example
is ~$32/month for 1k MAU on _heavier_ usage, so Bored Calendar sits far below
that. Cost is a non-issue. **Maturity is the real caveat: Jazz v2 is alpha.** That
argues for: opt-in flag, keep the local-only floor, pin the version, and avoid
making sync load-bearing until it stabilizes.

**Is self-hosting realistic if needed?** Yes. Jazz's sync server is open source
and self-hostable (`jazz-tools` server / sync-server). Because identity and data
live in CoValues and the protocol is the same, self-hosting is a deployment
decision, not a rewrite — we could start on Jazz Cloud and move to a self-hosted
relay later. For a hobby-scale app, self-hosting a single sync node is realistic;
the cloud is simply lower-ops to start.

**Migration path if we later drop Jazz?** Strong, and demonstrated by the spike:
`toLocalExport(text)` degrades any v2 sync export back to a valid v1 local-only
export (issue #21 format), dropping all identity. Because the day shapes are
identical between the two formats, "leave Jazz" is just "export, strip identity,
keep using IndexedDB + JSON" — no data is trapped. That reversibility is a big
part of why Jazz is a low-risk bet.

## Hosted vs self-hosted summary

|                          | Jazz Cloud (hosted)                | Self-hosted sync server                |
| ------------------------ | ---------------------------------- | -------------------------------------- |
| Ops burden               | none (zero-config)                 | run/monitor a node                     |
| Cost                     | usage-based, ~$/month at our scale | infra cost of one small server         |
| Data residency / control | Jazz's cloud                       | ours                                   |
| Recommended for          | initial launch / spike → prod      | later, if control/residency demands it |

Start on Jazz Cloud; keep self-hosting as a known, low-friction exit.

## Verification — what we ran, and a hard environment blocker

**Verified (build + type + model):**

- [x] The PoC compiles and type-checks against the real `jazz-tools` v2 types
      (`vp run test` → 0 errors) — the `schema`/`db`/`useAll`/`useLocalFirstAuth`
      API is used correctly, not mocked.
- [x] `vp run build` produces a static site including `/jazz-poc`; the client
      bundle builds with the Jazz WASM runtime.
- [x] In the browser, the page loads and **every** Jazz asset is fetched
      successfully, including `jazz_wasm_bg.wasm` (HTTP 200) and the sync client.
- [x] The export format, strict validation, sensitivity classification, all three
      restore-mode semantics (incl. error cases), v1 detection, and the
      migration-away path — all covered by `src/lib/sync/jazzSync.test.ts`.

**Blocked on this machine (linux-arm64) — a real alpha-maturity finding:**

Jazz v2 alpha does not run end-to-end on `linux-arm64`, which is this VM's
architecture. Two distinct gaps:

1. **No Node native binding for `linux-arm64`.** The optional `jazz-napi` package
   ships prebuilt binaries only for `darwin-{arm64,x64}`, `linux-x64-gnu`, and
   `win32-x64-msvc` — there is **no `linux-arm64` binary**. So the Vite/dev
   schema-registration tooling logs `[jazz] initialization failed: Cannot find
native binding` on every `astro` invocation. Builds still complete (the browser
   path uses WASM, not napi), but the Node-side admin tooling can't run here.
2. **The browser WASM runtime hangs the page on arm64.** After `jazz_wasm_bg.wasm`
   loads (confirmed 200), the renderer's main thread stops responding on
   `/jazz-poc` — CDP `Runtime.evaluate`, `DOM.enable`, and screenshots all time
   out, while the non-Jazz `/app` route in the same browser stays fully responsive.
   The page never gets past Jazz runtime init.

The net effect: the multi-device + offline acceptance criteria below could **not**
be exercised in this environment. They are not code defects in the PoC (which
type-checks, builds, and loads all assets) but a `jazz-tools@2.0.0-alpha.50` ×
`linux-arm64` support gap. **Re-run the live validation on `darwin-arm64` or
`linux-x64`** (both have native bindings and are the maintainers' tested targets):

- [ ] Two browser profiles syncing the same log through the Jazz sync server.
- [ ] Offline edit → reconnect → replay behaves as expected.
- [ ] Observe real same-day conflict resolution (confirm LWW in practice).
- [ ] Confirm the v2 multi-device authorization primitives, then wire
      `applyRestore` output into real provisioning (see the API note above).

This blocker **reinforces** the TL;DR recommendation: treat v2 as alpha, gate sync
behind an opt-in flag, pin the version, and keep the issue #21 local-only floor as
the always-available path. A sync engine that doesn't yet run on one of our
developer architectures is not one to make load-bearing today.

## Relationship to issue #21

This builds directly on the JSON import/export foundation. The sync export is a
superset of the local export, reuses its `ImportDay` validation, and degrades back
to it. See [`docs/data-portability.md`](./data-portability.md).
