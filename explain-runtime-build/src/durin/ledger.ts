// Durin Slice 0 — append-only, hash-chained intake ledger.
//
// The storage medium (localStorage in the browser, memory in tests — the
// same KeyValueBackend idiom as teacherprep/store.ts) is inherently
// mutable, so this ledger makes mutation *detectable and fail-closed*
// rather than pretending the medium is immutable: every entry carries a
// hash over its canonical serialization plus the previous entry's hash,
// and the whole chain is verified on load. A tampered, reordered, or
// truncated-then-extended ledger refuses to open. Nothing here ever
// rewrites or removes an entry; corrections and denials are new entries.

import type {
  Actor,
  CorrectionTelemetry,
  DerivedRepresentation,
  DuplicateObservation,
  IntakeEnvelope,
  IntakeReceipt,
  RouteDisposition,
  SourceArtifact,
  SourceState,
  ThemeAssertion,
  DeletionState
} from "./contracts";
import { canonicalStringify, sha256Hex } from "./sha256";

export const LEDGER_STORE_VERSION = "durin.ledger.v1";
export const LEDGER_STORE_KEY = "durin.ledger.v1";

// Reused idiom from teacherprep/store.ts: minimal KV so the spine runs
// in tests without a browser and on-device without a server.
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

export type DurinEventPayloadByKind = {
  readonly SOURCE_RECEIVED: { readonly envelope: IntakeEnvelope };
  readonly SOURCE_PRESERVED: { readonly artifact: SourceArtifact };
  readonly SOURCE_STATE_CHANGED: {
    readonly artifactId: string;
    readonly from: SourceState;
    readonly to: SourceState;
    readonly reason: string;
  };
  readonly DERIVATION_CREATED: { readonly derived: DerivedRepresentation };
  readonly ASSERTION_PROPOSED: { readonly assertion: ThemeAssertion };
  readonly ASSERTION_REVIEWED: {
    readonly assertionId: string;
    readonly outcome: "approved" | "rejected" | "uncertain";
  };
  readonly ASSERTION_SUPERSEDED: {
    readonly supersededAssertionId: string;
    readonly replacement: ThemeAssertion;
    readonly telemetry: CorrectionTelemetry;
  };
  readonly ROUTE_DECIDED: { readonly disposition: RouteDisposition };
  readonly DUPLICATE_OBSERVED: { readonly observation: DuplicateObservation };
  readonly DELETION_STATE_CHANGED: {
    readonly artifactId: string;
    readonly from: DeletionState;
    readonly to: DeletionState;
    readonly reason: string;
  };
  readonly RECEIPT_ISSUED: { readonly receipt: IntakeReceipt };
  // Audit trail for refusals. Denied actions never mutate state; they only
  // append one of these.
  readonly ADMISSION_DENIED: { readonly intakeId: string; readonly reason: string };
  readonly TRANSITION_DENIED: {
    readonly subjectId: string;
    readonly machine: "source" | "review" | "deletion";
    readonly from: string;
    readonly to: string;
    readonly reason: string;
  };
  readonly CROSSING_DENIED: {
    readonly artifactId: string;
    readonly recordLane: string;
    readonly queryLane: string;
    readonly reason: string;
  };
};

export type DurinEventKind = keyof DurinEventPayloadByKind;

export type DurinLedgerEntry<K extends DurinEventKind = DurinEventKind> = {
  readonly seq: number;
  readonly occurredAt: string;
  readonly actor: Actor;
  readonly kind: K;
  readonly payload: DurinEventPayloadByKind[K];
  readonly prevHash: string;
  readonly entryHash: string;
};

export class LedgerIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerIntegrityError";
  }
}

const GENESIS_HASH = `sha256:${"0".repeat(64)}`;

function hashEntry(entry: Omit<DurinLedgerEntry, "entryHash">): string {
  return `sha256:${sha256Hex(canonicalStringify(entry))}`;
}

type PersistedLedger = {
  readonly version: string;
  readonly entries: readonly DurinLedgerEntry[];
};

// Append-only event log. `append` is the ONLY write path; there is no
// update or delete API by design.
export class DurinLedger {
  private readonly backend: KeyValueBackend;
  private readonly storageKey: string;
  private readonly clock: () => string;
  private entries: DurinLedgerEntry[];

  constructor(backend: KeyValueBackend, options?: { storageKey?: string; clock?: () => string }) {
    this.backend = backend;
    this.storageKey = options?.storageKey ?? LEDGER_STORE_KEY;
    this.clock = options?.clock ?? (() => new Date().toISOString());
    this.entries = this.load();
  }

  private load(): DurinLedgerEntry[] {
    const raw = this.backend.getItem(this.storageKey);
    if (raw === null) return [];
    let parsed: PersistedLedger;
    try {
      parsed = JSON.parse(raw) as PersistedLedger;
    } catch {
      throw new LedgerIntegrityError("ledger storage is not parseable; refusing to open");
    }
    if (parsed.version !== LEDGER_STORE_VERSION) {
      // Fail closed rather than destructively migrating an unknown format.
      throw new LedgerIntegrityError(
        `ledger version "${parsed.version}" is not "${LEDGER_STORE_VERSION}"; refusing to migrate destructively`
      );
    }
    verifyChain(parsed.entries);
    return [...parsed.entries];
  }

  private persist(): void {
    const payload: PersistedLedger = { version: LEDGER_STORE_VERSION, entries: this.entries };
    this.backend.setItem(this.storageKey, JSON.stringify(payload));
  }

  append<K extends DurinEventKind>(kind: K, payload: DurinEventPayloadByKind[K], actor: Actor): DurinLedgerEntry<K> {
    const prevHash = this.entries.length === 0 ? GENESIS_HASH : this.entries[this.entries.length - 1].entryHash;
    const unsigned = {
      seq: this.entries.length,
      occurredAt: this.clock(),
      actor,
      kind,
      payload,
      prevHash
    };
    const entry = { ...unsigned, entryHash: hashEntry(unsigned) } as DurinLedgerEntry<K>;
    this.entries.push(entry);
    this.persist();
    return entry;
  }

  all(): readonly DurinLedgerEntry[] {
    return this.entries;
  }

  ofKind<K extends DurinEventKind>(kind: K): readonly DurinLedgerEntry<K>[] {
    return this.entries.filter((entry): entry is DurinLedgerEntry<K> => entry.kind === kind);
  }

  nextSeq(): number {
    return this.entries.length;
  }

  verify(): void {
    verifyChain(this.entries);
  }
}

export function verifyChain(entries: readonly DurinLedgerEntry[]): void {
  let prevHash = GENESIS_HASH;
  entries.forEach((entry, index) => {
    if (entry.seq !== index) {
      throw new LedgerIntegrityError(`entry ${index} has out-of-order seq ${entry.seq}`);
    }
    if (entry.prevHash !== prevHash) {
      throw new LedgerIntegrityError(`entry ${index} breaks the hash chain (prevHash mismatch)`);
    }
    const { entryHash, ...unsigned } = entry;
    const expected = hashEntry(unsigned);
    if (entryHash !== expected) {
      throw new LedgerIntegrityError(`entry ${index} content does not match its hash; ledger was mutated`);
    }
    prevHash = entryHash;
  });
}
