import type { ClassSnapshot, PrepDoc, PrivateMaterial, WeeklyLesson } from "./types";

// Two stores, two keys, one hard wall.
//
// The shared store holds governed classroom data only: the prep document
// (lesson structure, promoted blocks) and the active Ready for Class
// snapshot. The private store holds personal material and never crosses
// into the shared payload — serializeSharedPayload() only ever sees the
// shared store's value. There is no network code anywhere in this module
// (or in this folder): both stores write to device-local storage only.

export const SHARED_STORE_KEY = "teacherprep.shared.v1";
export const PRIVATE_STORE_KEY = "teacherprep.private.v1";

// Minimal KV interface so logic tests run without a browser.
export interface KeyValueBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createMemoryBackend(): KeyValueBackend {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key)
  };
}

function defaultBackend(): KeyValueBackend {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  return createMemoryBackend();
}

export interface SharedState {
  prep: PrepDoc | null;
  activeSnapshot: ClassSnapshot | null;
  // The lesson the prep document was created from (validated current week
  // or the labeled fixture), pinned so Prepare/Teach never shift under the
  // teacher when the resolved current week later changes. Absent in older
  // saved state.
  lesson?: WeeklyLesson | null;
}

export interface PrivateState {
  material: PrivateMaterial | null;
}

const EMPTY_SHARED: SharedState = { prep: null, activeSnapshot: null };
const EMPTY_PRIVATE: PrivateState = { material: null };

export class SharedStore {
  constructor(private backend: KeyValueBackend = defaultBackend()) {}

  load(): SharedState {
    const raw = this.backend.getItem(SHARED_STORE_KEY);
    if (!raw) return { ...EMPTY_SHARED };
    try {
      return JSON.parse(raw) as SharedState;
    } catch {
      return { ...EMPTY_SHARED };
    }
  }

  save(state: SharedState): void {
    this.backend.setItem(SHARED_STORE_KEY, serializeSharedPayload(state));
  }

  clear(): void {
    this.backend.removeItem(SHARED_STORE_KEY);
  }
}

export class PrivateStore {
  constructor(private backend: KeyValueBackend = defaultBackend()) {}

  load(): PrivateState {
    const raw = this.backend.getItem(PRIVATE_STORE_KEY);
    if (!raw) return { ...EMPTY_PRIVATE };
    try {
      return JSON.parse(raw) as PrivateState;
    } catch {
      return { ...EMPTY_PRIVATE };
    }
  }

  save(state: PrivateState): void {
    this.backend.setItem(PRIVATE_STORE_KEY, JSON.stringify(state));
  }

  clear(): void {
    this.backend.removeItem(PRIVATE_STORE_KEY);
  }
}

// The one serializer for shared/governed data. It takes SharedState only;
// private material is a different type from a different store, so it cannot
// be included here without a type error — that is the boundary the privacy
// tests pin down.
export function serializeSharedPayload(state: SharedState): string {
  return JSON.stringify(state);
}
