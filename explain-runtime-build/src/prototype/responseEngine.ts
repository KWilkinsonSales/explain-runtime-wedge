// Companion v1.2 governed response engine.
//
// The single execution path between an admitted utterance and a rendered
// SPEAK/STEER answer. Guarantees, all unit-tested:
//   - one session ID per activation, with an explicit clean close;
//   - one stable event ID per admitted utterance;
//   - duplicate admissions (same utterance re-admitted back to back) are
//     suppressed before execution;
//   - exactly one provider execution per admitted event (idempotent);
//   - when a newer utterance is admitted while an older one is in flight,
//     the older result is superseded and never rendered as current;
//   - provider failure yields a stable fallback sentence, never a crash;
//   - transcript evidence (the admission receipt) is retained separately
//     from the rendered guidance.
//
// The default provider is the existing deterministic admission rail. A
// future model-backed provider plugs into the same seam; the engine itself
// never takes autonomous actions.

import {
  runAdmissionRail,
  type AdmissionInput,
  type AdmissionReceipt,
  type CompanionOutput,
  type SourceProvider
} from "./admissionSourceAdapter";

export type EngineState = "ready" | "thinking" | "error";

export interface EngineEvent {
  eventId: string;
  sessionId: string;
  seq: number;
  text: string;
  sourceProvider: SourceProvider;
  admittedAt: string;
}

export interface EngineResponse {
  eventId: string;
  seq: number;
  speak: string;
  steer: string;
  fallback: boolean;
  superseded: boolean;
  receipt: AdmissionReceipt | null;
}

export interface AdmitResult {
  event: EngineEvent | null;
  duplicate: boolean;
}

export const FALLBACK_SPEAK = "I could not process that just now. Keep going — I'm still listening.";
export const FALLBACK_STEER = "The response provider failed for this utterance; the transcript is preserved.";

export type ResponseProvider = (input: AdmissionInput) => Promise<AdmissionReceipt> | AdmissionReceipt;

export const deterministicProvider: ResponseProvider = (input) => runAdmissionRail(input);

export interface EngineCallbacks {
  // The one primary render path. Secondary renderers (e.g. the
  // teleprompter) must mirror this rendered response, never generate
  // independently.
  onResponse?: (response: EngineResponse) => void;
  onState?: (state: EngineState) => void;
}

let sessionCounter = 0;

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export class ResponseEngine {
  readonly sessionId: string;
  private provider: ResponseProvider;
  private callbacks: EngineCallbacks;
  private seq = 0;
  private closed = false;
  private lastAdmittedNormalized: string | null = null;
  private executions = new Map<string, Promise<EngineResponse>>();
  private latestRendered: EngineResponse | null = null;

  constructor(provider: ResponseProvider = deterministicProvider, callbacks: EngineCallbacks = {}) {
    sessionCounter += 1;
    this.sessionId = `session-${sessionCounter}-${Date.now().toString(36)}`;
    this.provider = provider;
    this.callbacks = callbacks;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  get currentResponse(): EngineResponse | null {
    return this.latestRendered;
  }

  // Admits one utterance/transcript delta. Returns the stable event, or
  // duplicate: true (and no new event) when the identical utterance was
  // just admitted — duplicate admissions never reach the provider.
  admit(text: string, sourceProvider: SourceProvider): AdmitResult {
    if (this.closed) return { event: null, duplicate: false };
    const trimmed = text.trim();
    if (!trimmed) return { event: null, duplicate: false };

    const normalized = normalize(trimmed);
    if (normalized === this.lastAdmittedNormalized) {
      return { event: null, duplicate: true };
    }
    this.lastAdmittedNormalized = normalized;
    this.seq += 1;
    const event: EngineEvent = {
      eventId: `${this.sessionId}-evt-${this.seq}`,
      sessionId: this.sessionId,
      seq: this.seq,
      text: trimmed,
      sourceProvider,
      admittedAt: new Date().toISOString()
    };
    return { event, duplicate: false };
  }

  // Executes exactly once per event ID; repeated calls return the same
  // promise (idempotency check happens before the provider is invoked).
  execute(event: EngineEvent): Promise<EngineResponse> {
    const existing = this.executions.get(event.eventId);
    if (existing) return existing;

    const run = this.runProvider(event);
    this.executions.set(event.eventId, run);
    return run;
  }

  admitAndExecute(text: string, sourceProvider: SourceProvider): Promise<EngineResponse | null> {
    const { event, duplicate } = this.admit(text, sourceProvider);
    if (!event || duplicate) return Promise.resolve(null);
    return this.execute(event);
  }

  private async runProvider(event: EngineEvent): Promise<EngineResponse> {
    this.callbacks.onState?.("thinking");
    let output: CompanionOutput;
    let receipt: AdmissionReceipt | null = null;
    let fallback = false;
    try {
      receipt = await this.provider({
        source_provider: event.sourceProvider,
        session_id: event.sessionId,
        text_chunk: event.text
      });
      output = receipt.output;
    } catch {
      fallback = true;
      output = { speak: FALLBACK_SPEAK, steer: FALLBACK_STEER };
    }

    // A newer admission supersedes this result: it is recorded but never
    // rendered as the current answer.
    const superseded = event.seq < this.seq || this.closed;
    const response: EngineResponse = {
      eventId: event.eventId,
      seq: event.seq,
      speak: output.speak,
      steer: output.steer,
      fallback,
      superseded,
      receipt
    };

    if (!superseded) {
      this.latestRendered = response;
      this.callbacks.onState?.(fallback ? "error" : "ready");
      this.callbacks.onResponse?.(response);
    }
    return response;
  }

  // Explicit clean close: nothing admitted or rendered afterwards. A new
  // activation constructs a new engine (new session ID).
  close(): void {
    this.closed = true;
    this.latestRendered = null;
  }
}
