// Companion v1.1 live transcription rail.
//
// Provider-agnostic live input: Deepgram Streaming is the primary provider;
// browser Web Speech remains a diagnostic fallback only; typed text (Text
// Mode) remains the manual admission fallback. The UI never manages
// providers — it calls startLiveTranscription(stream, callbacks) and renders
// whatever status/segments come back.

export type LiveProviderId = "deepgram" | "webspeech" | "none";

export type LiveStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "reconnecting"
  | "stopped"
  | "error";

export interface LiveSegment {
  text: string;
  isFinal: boolean;
  confidence: number | null;
  receivedAt: string;
  provider: LiveProviderId;
}

export interface LiveDiagnostics {
  provider: LiveProviderId;
  providerConnected: boolean;
  transcriptReceiving: boolean;
  fallbackMode: boolean;
  lastSegmentAt: string | null;
  lastError: string | null;
}

export interface LiveCallbacks {
  onSegment: (segment: LiveSegment) => void;
  onDiagnostics: (diagnostics: LiveDiagnostics) => void;
  onStatus: (status: LiveStatus, detail?: string) => void;
}

export interface LiveHandle {
  provider: LiveProviderId;
  stop: () => void;
}

export const DEEPGRAM_TOKEN_ENDPOINT = "/.netlify/functions/deepgram-token";

// --- Pure, unit-testable pieces -------------------------------------------

export function deepgramSocketUrl(base = "wss://api.deepgram.com/v1/listen"): string {
  const params = new URLSearchParams({
    model: "nova-2",
    interim_results: "true",
    smart_format: "true",
    punctuate: "true",
    vad_events: "true",
  });
  return `${base}?${params.toString()}`;
}

// Deepgram streaming results arrive as JSON text frames. Anything that is
// not a Results frame with a non-empty transcript is ignored (KeepAlive
// echoes, Metadata, UtteranceEnd, SpeechStarted...).
export function parseDeepgramMessage(raw: string): Omit<LiveSegment, "receivedAt" | "provider"> | null {
  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof message !== "object" || message === null) return null;

  const frame = message as {
    type?: string;
    is_final?: boolean;
    channel?: { alternatives?: Array<{ transcript?: string; confidence?: number }> };
  };
  if (frame.type !== "Results") return null;

  const alternative = frame.channel?.alternatives?.[0];
  const text = alternative?.transcript?.trim() ?? "";
  if (!text) return null;

  return {
    text,
    isFinal: frame.is_final === true,
    confidence: typeof alternative?.confidence === "number" ? alternative.confidence : null,
  };
}

// MediaRecorder container support differs by browser: Chrome/Android speak
// webm/opus, iOS Safari records mp4/AAC. Deepgram auto-detects both
// containers, so the first supported type wins.
export const RECORDER_MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"] as const;

export function pickRecorderMimeType(isSupported: (mime: string) => boolean): string | null {
  return RECORDER_MIME_CANDIDATES.find((mime) => isSupported(mime)) ?? null;
}

// Rolling transcript buffer: finals accumulate, the (single) trailing interim
// is replaced by each newer interim, and the whole buffer is capped so a long
// session cannot grow without bound.
export interface TranscriptBuffer {
  finals: string[];
  interim: string;
}

export function createTranscriptBuffer(): TranscriptBuffer {
  return { finals: [], interim: "" };
}

export function appendSegment(
  buffer: TranscriptBuffer,
  segment: Pick<LiveSegment, "text" | "isFinal">,
  maxFinals = 200,
): TranscriptBuffer {
  if (!segment.text.trim()) return buffer;

  if (!segment.isFinal) {
    return { ...buffer, interim: segment.text };
  }

  const finals = [...buffer.finals, segment.text];
  return {
    finals: finals.length > maxFinals ? finals.slice(finals.length - maxFinals) : finals,
    interim: "",
  };
}

export function transcriptBufferText(buffer: TranscriptBuffer): string {
  return [buffer.finals.join(" "), buffer.interim].filter(Boolean).join(" ").trim();
}

// A segment is "receiving" if one arrived within the freshness window.
export function isTranscriptReceiving(lastSegmentAt: string | null, now: Date, freshMs = 15000): boolean {
  if (!lastSegmentAt) return false;
  const last = Date.parse(lastSegmentAt);
  if (Number.isNaN(last)) return false;
  return now.getTime() - last < freshMs;
}

// --- Deepgram streaming provider -------------------------------------------

interface DeepgramTokenResponse {
  key?: string;
  access_token?: string;
  token_type?: "bearer" | "token";
  error?: string;
}

interface DeepgramCredential {
  value: string;
  tokenType: "bearer" | "token";
}

export function deepgramSocketProtocols(credential: DeepgramCredential): string[] {
  return [credential.tokenType, credential.value];
}

async function fetchDeepgramToken(): Promise<DeepgramCredential> {
  const response = await fetch(DEEPGRAM_TOKEN_ENDPOINT, { method: "POST" });
  const body = (await response.json().catch(() => ({}))) as DeepgramTokenResponse;
  const value = body.access_token ?? body.key;
  if (!response.ok || !value) {
    throw new Error(body.error ?? `Token endpoint returned ${response.status}.`);
  }
  return { value, tokenType: body.token_type === "bearer" ? "bearer" : "token" };
}

const KEEPALIVE_MS = 8000;
const RECORDER_TIMESLICE_MS = 250;

function startDeepgram(stream: MediaStream, callbacks: LiveCallbacks): Promise<LiveHandle> {
  return new Promise((resolve, reject) => {
    const diagnostics: LiveDiagnostics = {
      provider: "deepgram",
      providerConnected: false,
      transcriptReceiving: false,
      fallbackMode: false,
      lastSegmentAt: null,
      lastError: null,
    };
    const pushDiagnostics = () => callbacks.onDiagnostics({ ...diagnostics });

    callbacks.onStatus("connecting", "Fetching Deepgram session token…");
    pushDiagnostics();

    fetchDeepgramToken()
      .then((credential) => {
        const socket = new WebSocket(deepgramSocketUrl(), deepgramSocketProtocols(credential));
        let recorder: MediaRecorder | null = null;
        let keepalive: ReturnType<typeof setInterval> | null = null;
        let settled = false;

        const cleanup = () => {
          if (keepalive) clearInterval(keepalive);
          keepalive = null;
          if (recorder && recorder.state !== "inactive") recorder.stop();
          recorder = null;
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "CloseStream" }));
          }
          socket.close();
        };

        socket.onopen = () => {
          const mimeType = pickRecorderMimeType((mime) =>
            typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime),
          );
          if (!mimeType) {
            diagnostics.lastError = "MediaRecorder has no supported audio container here.";
            pushDiagnostics();
            cleanup();
            if (!settled) {
              settled = true;
              reject(new Error(diagnostics.lastError));
            }
            return;
          }

          recorder = new MediaRecorder(stream, { mimeType });
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
              socket.send(event.data);
            }
          };
          recorder.start(RECORDER_TIMESLICE_MS);

          keepalive = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: "KeepAlive" }));
            }
          }, KEEPALIVE_MS);

          diagnostics.providerConnected = true;
          pushDiagnostics();
          callbacks.onStatus("listening", "Deepgram streaming connected.");

          if (!settled) {
            settled = true;
            resolve({
              provider: "deepgram",
              stop: () => {
                cleanup();
                callbacks.onStatus("stopped");
                diagnostics.providerConnected = false;
                pushDiagnostics();
              },
            });
          }
        };

        socket.onmessage = (event) => {
          if (typeof event.data !== "string") return;
          const parsed = parseDeepgramMessage(event.data);
          if (!parsed) return;
          const segment: LiveSegment = {
            ...parsed,
            receivedAt: new Date().toISOString(),
            provider: "deepgram",
          };
          diagnostics.lastSegmentAt = segment.receivedAt;
          diagnostics.transcriptReceiving = true;
          pushDiagnostics();
          callbacks.onSegment(segment);
        };

        socket.onerror = () => {
          diagnostics.lastError = "Deepgram WebSocket error.";
          diagnostics.providerConnected = false;
          pushDiagnostics();
          if (!settled) {
            settled = true;
            cleanup();
            reject(new Error(diagnostics.lastError));
          }
        };

        socket.onclose = (event) => {
          diagnostics.providerConnected = false;
          pushDiagnostics();
          if (!settled) {
            settled = true;
            reject(new Error(`Deepgram socket closed before connecting (code ${event.code}).`));
          } else {
            callbacks.onStatus("stopped", `Deepgram socket closed (code ${event.code}).`);
          }
        };
      })
      .catch((error) => {
        diagnostics.lastError = error instanceof Error ? error.message : String(error);
        pushDiagnostics();
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
}

// --- Web Speech diagnostic fallback ----------------------------------------

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: { isFinal: boolean; [index: number]: { transcript: string; confidence?: number } };
  };
}

function startWebSpeech(callbacks: LiveCallbacks): LiveHandle | null {
  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  if (!Ctor) return null;

  const diagnostics: LiveDiagnostics = {
    provider: "webspeech",
    providerConnected: false,
    transcriptReceiving: false,
    fallbackMode: true,
    lastSegmentAt: null,
    lastError: null,
  };
  const pushDiagnostics = () => callbacks.onDiagnostics({ ...diagnostics });

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.onresult = (event) => {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result[0]?.transcript?.trim() ?? "";
      if (!transcript) continue;
      const segment: LiveSegment = {
        text: transcript,
        isFinal: result.isFinal,
        confidence: typeof result[0]?.confidence === "number" ? result[0].confidence : null,
        receivedAt: new Date().toISOString(),
        provider: "webspeech",
      };
      diagnostics.lastSegmentAt = segment.receivedAt;
      diagnostics.transcriptReceiving = true;
      pushDiagnostics();
      callbacks.onSegment(segment);
    }
  };
  recognition.onerror = () => {
    diagnostics.lastError = "Web Speech recognition error.";
    pushDiagnostics();
  };
  recognition.onend = () => {
    diagnostics.providerConnected = false;
    pushDiagnostics();
  };

  try {
    recognition.start();
  } catch {
    return null;
  }

  diagnostics.providerConnected = true;
  pushDiagnostics();
  callbacks.onStatus("listening", "Web Speech fallback active (diagnostic only).");

  return {
    provider: "webspeech",
    stop: () => {
      recognition.stop();
      diagnostics.providerConnected = false;
      pushDiagnostics();
      callbacks.onStatus("stopped");
    },
  };
}

// --- Entry point ------------------------------------------------------------

// Deepgram first; if it cannot start (no token endpoint, egress blocked,
// socket refused), fall back to Web Speech where supported. Returns null when
// no live provider is available — the caller stays in mic-granted state and
// Text Mode remains the manual admission path.
export async function startLiveTranscription(
  stream: MediaStream,
  callbacks: LiveCallbacks,
): Promise<LiveHandle | null> {
  try {
    return await startDeepgram(stream, callbacks);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    callbacks.onStatus("reconnecting", `Deepgram unavailable (${detail}); trying Web Speech fallback.`);
  }

  const fallback = startWebSpeech(callbacks);
  if (fallback) return fallback;

  callbacks.onDiagnostics({
    provider: "none",
    providerConnected: false,
    transcriptReceiving: false,
    fallbackMode: true,
    lastSegmentAt: null,
    lastError: "No live transcription provider available. Use Text Mode.",
  });
  callbacks.onStatus("error", "No live transcription provider available. Use Text Mode.");
  return null;
}
