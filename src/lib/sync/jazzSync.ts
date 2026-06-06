import { type as arktype } from "arktype";
import { type LogEntry } from "../../components/logEntry";
import {
  ImportDay,
  ImportError,
  SCHEMA_VERSION,
  parseExport,
  safeJsonParse,
} from "../dataPortability";

/**
 * Jazz sync spike — model layer (issue #22).
 *
 * This module is intentionally dependency-free and is NOT wired into the running
 * app: the free experience stays local-only (issue #21). It models the product
 * decisions that a Jazz integration forces — how identity/secret material rides
 * along with a JSON export, and what "restore this device" vs "add a new device"
 * vs "import data only" actually mean — so they can be evaluated and tested
 * before committing to the `jazz-tools` runtime. See docs/jazz-spike.md.
 *
 * Mapping to Jazz primitives (see docs for detail):
 *   userId       -> a Jazz Group that owns the boredom-log CoValues (the data owner)
 *   deviceId     -> a Jazz Account for one install/device
 *   deviceSecret -> that Account's Account Secret (lets the device act as itself)
 * Each device is its own Account (its own secret) and a member of the userId
 * Group, so losing one device never leaks a shared master secret.
 */

// Sync-aware exports use a distinct, higher schema version than the local-only
// v1 export so old readers reject them clearly rather than misinterpreting them.
export const SYNC_SCHEMA_VERSION = 2;

/** Identity/secret material a device may hold. `deviceSecret` is sensitive. */
const DeviceIdentity = arktype({
  userId: "string",
  deviceId: "string",
  "deviceSecret?": "string",
  "+": "reject",
});
export type DeviceIdentity = typeof DeviceIdentity.infer;

/** A sync-aware export: the v1 day list plus optional identity. */
export const SyncExport = arktype({
  schemaVersion: arktype.unit(SYNC_SCHEMA_VERSION),
  exportedAt: "string",
  days: ImportDay.array(),
  "identity?": DeviceIdentity,
  "+": "reject",
});
export type SyncExport = typeof SyncExport.infer;

/**
 * How sensitive an export is to share, driven by what identity material it
 * carries:
 *   "data-only"      no identity — safe to share; can only become a new identity
 *   "account-linked" userId (+deviceId) but no secret — reveals the data owner,
 *                    cannot write without being granted Group membership
 *   "secret-bearing" includes deviceSecret — anyone holding it can act as that
 *                    device's account; treat like a password backup
 */
export type ExportSensitivity = "data-only" | "account-linked" | "secret-bearing";

export function classifyExport(data: SyncExport): ExportSensitivity {
  if (!data.identity) {
    return "data-only";
  }
  return data.identity.deviceSecret ? "secret-bearing" : "account-linked";
}

/**
 * Strip the device secret so the export is safe to share/transport. Returns the
 * input unchanged when there is nothing to redact (no identity, or no secret);
 * otherwise returns a shallow copy with `deviceSecret` removed.
 */
export function redactSecret(data: SyncExport): SyncExport {
  if (!data.identity?.deviceSecret) {
    return data;
  }
  const { deviceSecret: _omit, ...identity } = data.identity;
  return { ...data, identity };
}

export type RestoreMode = "restore-this-device" | "add-new-device" | "import-data-only";

export type IdGenerator = {
  /** New data-owner id (Jazz Group). */
  userId: () => string;
  /** New device/account id (Jazz Account). */
  deviceId: () => string;
};

export type RestoreResult = {
  /** Boredom days to load locally. */
  days: LogEntry[];
  /** Identity this device should adopt after the restore. */
  identity: DeviceIdentity;
  /**
   * True when the resulting device still needs to be authorized into the
   * existing user's Group by an already-trusted device (add-new-device without
   * a secret in the file). The spike surfaces this rather than papering over it.
   */
  requiresGroupAuthorization: boolean;
  notes: string[];
};

/**
 * Compute the local identity + data that a given restore mode produces from a
 * parsed sync export. Pure: callers inject id generation so this is fully
 * testable and free of ambient randomness.
 *
 * - restore-this-device: adopt userId, deviceId, and deviceSecret from the file
 *   (a true backup restore). Requires a secret-bearing export.
 * - add-new-device: keep the userId (same data owner), mint a fresh deviceId and
 *   drop any secret — this device provisions its own account and must be granted
 *   Group membership by a trusted device.
 * - import-data-only: ignore identity entirely; mint a fresh userId and deviceId
 *   so the data lives under a brand-new, unlinked identity.
 */
export function applyRestore(
  data: SyncExport,
  mode: RestoreMode,
  generate: IdGenerator,
): RestoreResult {
  switch (mode) {
    case "restore-this-device": {
      if (!data.identity) {
        throw new ImportError(
          "This file has no saved account, so there is nothing to restore. Try “Import data only”.",
        );
      }
      if (!data.identity.deviceSecret) {
        throw new ImportError(
          "This backup is missing its device secret, so this device can’t be fully restored. Try “Add this as a new device”.",
        );
      }
      // Copy days and identity so a caller mutating the result can't corrupt
      // the parsed export it was derived from.
      return {
        days: [...data.days],
        identity: { ...data.identity },
        requiresGroupAuthorization: false,
        notes: ["Restored the saved account, device, and secret from the backup."],
      };
    }
    case "add-new-device": {
      if (!data.identity) {
        throw new ImportError("This file has no saved account to join. Try “Import data only”.");
      }
      return {
        days: [...data.days],
        identity: { userId: data.identity.userId, deviceId: generate.deviceId() },
        requiresGroupAuthorization: true,
        notes: [
          "Kept the existing user and minted a new device id with no secret.",
          "A trusted device must approve this new device before it can sync.",
        ],
      };
    }
    case "import-data-only": {
      return {
        days: [...data.days],
        identity: { userId: generate.userId(), deviceId: generate.deviceId() },
        requiresGroupAuthorization: false,
        notes: ["Created a fresh, unlinked identity and copied the days into it."],
      };
    }
  }
}

/**
 * Parse a sync-aware export. Mirrors `parseExport` (issue #21): validates JSON,
 * version, and shape before anything is trusted, and throws `ImportError` with a
 * user-safe message otherwise. A v1 (local-only) export is detected and reported
 * so the caller can fall back to the plain import path.
 */
export function parseSyncExport(text: string): SyncExport {
  const parsed = safeJsonParse(text);

  const version =
    parsed !== null && typeof parsed === "object" && "schemaVersion" in parsed
      ? (parsed as { schemaVersion: unknown }).schemaVersion
      : undefined;

  if (version === SCHEMA_VERSION) {
    throw new ImportError(
      "This is a local-only export without sync data. Import it with the standard import instead.",
    );
  }

  const result = SyncExport(parsed);
  if (result instanceof arktype.errors) {
    throw new ImportError(
      "This file doesn't look like a Bored Calendar sync export, so nothing was changed.",
    );
  }
  return result;
}

/**
 * Build a v1 (local-only) export from a sync export, dropping all identity. This
 * is the documented migration path *away* from Jazz: a sync export always
 * degrades cleanly to the issue #21 format.
 */
export function toLocalExport(text: string): ReturnType<typeof parseExport> {
  const sync = parseSyncExport(text);
  return parseExport(
    JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: sync.exportedAt,
      days: sync.days,
    }),
  );
}
