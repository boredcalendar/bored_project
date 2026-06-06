import { afterEach, describe, expect, it, vi } from "vitest";
import { getPersistentStorageStatus, requestPersistentStorage } from "./persistentStorage";

const originalNavigator = globalThis.navigator;

function stubStorage(storage: unknown) {
  Object.defineProperty(globalThis, "navigator", {
    value: storage === undefined ? {} : { storage },
    configurable: true,
  });
}

afterEach(() => {
  Object.defineProperty(globalThis, "navigator", {
    value: originalNavigator,
    configurable: true,
  });
  vi.restoreAllMocks();
});

describe("getPersistentStorageStatus", () => {
  it("reports unsupported when the StorageManager is missing", async () => {
    stubStorage(undefined);
    expect(await getPersistentStorageStatus()).toBe("unsupported");
  });

  it("reports granted when already persisted", async () => {
    stubStorage({ persisted: vi.fn().mockResolvedValue(true) });
    expect(await getPersistentStorageStatus()).toBe("granted");
  });

  it("reports denied when not persisted", async () => {
    stubStorage({ persisted: vi.fn().mockResolvedValue(false) });
    expect(await getPersistentStorageStatus()).toBe("denied");
  });
});

describe("requestPersistentStorage", () => {
  it("reports unsupported when persist() is unavailable", async () => {
    stubStorage({ persisted: vi.fn().mockResolvedValue(false) });
    expect(await requestPersistentStorage()).toBe("unsupported");
  });

  it("does not prompt again when already granted", async () => {
    const persist = vi.fn().mockResolvedValue(true);
    stubStorage({ persisted: vi.fn().mockResolvedValue(true), persist });
    expect(await requestPersistentStorage()).toBe("granted");
    expect(persist).not.toHaveBeenCalled();
  });

  it("returns granted when the browser grants the request", async () => {
    stubStorage({
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(true),
    });
    expect(await requestPersistentStorage()).toBe("granted");
  });

  it("returns denied when the browser rejects the request", async () => {
    stubStorage({
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(false),
    });
    expect(await requestPersistentStorage()).toBe("denied");
  });
});
