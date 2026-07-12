import React, { useEffect, useMemo, useRef, useState } from "react";
import { INTENTS, findIntent, type IntentId } from "./intents";
import { publishTeleprompter } from "./teleprompterSync";
import { usePrototypeHeadTags } from "./usePrototypeHeadTags";
import {
  classifyMicrophoneError,
  describeMicrophoneError,
  isGetUserMediaSupported,
  isSpeechRecognitionSupported,
  VOICE_UNAVAILABLE_MESSAGES,
  type CompanionRuntimeState,
  type MicPermissionStatus,
  type SpeechRecognitionWindowLike,
  type VoiceUnavailableReason
} from "./companionRuntime";
import { ResponseEngine, type EngineResponse, type EngineState } from "./responseEngine";
import {
  appendSegment,
  createTranscriptBuffer,
  isTranscriptReceiving,
  startLiveTranscription,
  transcriptBufferText,
  type LiveDiagnostics,
  type LiveHandle,
  type LiveStatus,
  type TranscriptBuffer
} from "./liveTranscription";
import "./prototype.css";

const STATE_LABEL: Record<CompanionRuntimeState, string> = {
  IDLE: "Companion OFF",
  REQUESTING_PERMISSION: "Requesting mic access",
  LISTENING: "Listening",
  TEXT_MODE: "Text Mode",
  VOICE_UNAVAILABLE: "Voice unavailable",
  ERROR: "Error"
};

const STATE_BADGE_CLASS: Record<CompanionRuntimeState, string> = {
  IDLE: "pending",
  REQUESTING_PERMISSION: "pending",
  LISTENING: "listening",
  TEXT_MODE: "text-mode",
  VOICE_UNAVAILABLE: "unavailable",
  ERROR: "unavailable"
};

const ENGINE_STATE_LABEL: Record<EngineState, string> = {
  ready: "Ready",
  thinking: "Thinking…",
  error: "Error — fallback shown"
};

const IDLE_DIAGNOSTICS: LiveDiagnostics = {
  provider: "none",
  providerConnected: false,
  transcriptReceiving: false,
  fallbackMode: false,
  lastSegmentAt: null,
  lastError: null
};

export default function CompanionPrototype() {
  usePrototypeHeadTags();

  const startedAt = useMemo(() => new Date(), []);
  const getUserMediaSupported = useMemo(() => isGetUserMediaSupported(navigator), []);
  const speechRecognitionSupported = useMemo(
    () => isSpeechRecognitionSupported(window as unknown as SpeechRecognitionWindowLike),
    []
  );

  const [runtimeState, setRuntimeState] = useState<CompanionRuntimeState>("IDLE");
  const [micPermission, setMicPermission] = useState<MicPermissionStatus>("unknown");
  const [voiceUnavailableReason, setVoiceUnavailableReason] = useState<VoiceUnavailableReason | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastMicError, setLastMicError] = useState<string | null>(null);

  const [liveStatus, setLiveStatus] = useState<LiveStatus>("idle");
  const [liveStatusDetail, setLiveStatusDetail] = useState<string | null>(null);
  const [liveDiagnostics, setLiveDiagnostics] = useState<LiveDiagnostics>(IDLE_DIAGNOSTICS);
  const [transcriptBuffer, setTranscriptBuffer] = useState<TranscriptBuffer>(() => createTranscriptBuffer());

  // One governed response loop: current rendered answer + engine state.
  const engineRef = useRef<ResponseEngine | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [engineState, setEngineState] = useState<EngineState>("ready");
  const [currentResponse, setCurrentResponse] = useState<EngineResponse | null>(null);
  const [holding, setHolding] = useState(false);
  const holdingRef = useRef(false);
  const [copiedAt, setCopiedAt] = useState<string | null>(null);

  const [activeIntentId, setActiveIntentId] = useState<IntentId | null>(null);
  const [manualLine, setManualLine] = useState("");
  const [broadcastedAt, setBroadcastedAt] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [sentResponses, setSentResponses] = useState<EngineResponse[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const liveHandleRef = useRef<LiveHandle | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);

  // One session per activation; a new activation gets a new engine.
  function ensureEngine(): ResponseEngine {
    if (engineRef.current && !engineRef.current.isClosed) return engineRef.current;
    const engine = new ResponseEngine(undefined, {
      onState: (state) => setEngineState(state),
      onResponse: (response) => {
        setCurrentResponse(response);
        // Secondary renderer mirrors the same governed output.
        publishTeleprompter({
          text: response.speak,
          intentId: null,
          updatedAt: new Date().toISOString()
        });
      }
    });
    engineRef.current = engine;
    setSessionId(engine.sessionId);
    return engine;
  }

  function stopLiveRail() {
    liveHandleRef.current?.stop();
    liveHandleRef.current = null;
  }

  function handleLiveSegment(segmentText: string, isFinal: boolean) {
    setTranscriptBuffer((buffer) => appendSegment(buffer, { text: segmentText, isFinal }));
    if (!isFinal) return;
    // Hold pauses guidance without stopping listening or transcript evidence.
    if (holdingRef.current) return;
    void ensureEngine().admitAndExecute(segmentText, "browser_mic");
  }

  async function startLiveRail(stream: MediaStream) {
    stopLiveRail();
    const handle = await startLiveTranscription(stream, {
      onSegment: (segment) => handleLiveSegment(segment.text, segment.isFinal),
      onDiagnostics: (diagnostics) => setLiveDiagnostics(diagnostics),
      onStatus: (status, detail) => {
        setLiveStatus(status);
        setLiveStatusDetail(detail ?? null);
      }
    });
    liveHandleRef.current = handle;
  }

  // Must be invoked directly from a user tap (never from an effect on mount) —
  // iOS Safari will not reliably surface the native mic permission prompt
  // unless getUserMedia is called synchronously within a user gesture handler.
  async function requestMicrophoneAccess() {
    setRuntimeState("REQUESTING_PERMISSION");
    setErrorMessage(null);

    if (!getUserMediaSupported) {
      setLastMicError("getUserMedia is not defined on navigator.mediaDevices in this browser.");
      setVoiceUnavailableReason("unsupported");
      setRuntimeState("VOICE_UNAVAILABLE");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission("granted");
      setLastMicError(null);
      ensureEngine();
      setRuntimeState("LISTENING");
      // Live transcription starts after the mic is granted; failure here never
      // revokes the Listening state — it degrades to fallback/Text Mode.
      void startLiveRail(stream);
    } catch (error) {
      const reason = classifyMicrophoneError(error);
      setMicPermission(reason === "permission-denied" ? "denied" : "unknown");
      setVoiceUnavailableReason(reason);
      setLastMicError(describeMicrophoneError(error));
      setRuntimeState("VOICE_UNAVAILABLE");
    }
  }

  useEffect(() => {
    return () => {
      liveHandleRef.current?.stop();
      liveHandleRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      engineRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (runtimeState === "TEXT_MODE") {
      textInputRef.current?.focus();
    }
  }, [runtimeState]);

  function enterTextMode() {
    stopLiveRail();
    ensureEngine();
    setRuntimeState("TEXT_MODE");
  }

  function backToVoice() {
    if (streamRef.current) {
      setRuntimeState("LISTENING");
      void startLiveRail(streamRef.current);
      return;
    }
    requestMicrophoneAccess();
  }

  // Explicit clean close: mic released, engine closed, transcript cleared.
  // The next activation starts a fresh session.
  function endSession() {
    stopLiveRail();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    engineRef.current?.close();
    engineRef.current = null;
    setSessionId(null);
    setCurrentResponse(null);
    setSentResponses([]);
    setTranscriptBuffer(createTranscriptBuffer());
    setLiveDiagnostics(IDLE_DIAGNOSTICS);
    setLiveStatus("idle");
    setLiveStatusDetail(null);
    setEngineState("ready");
    setHolding(false);
    holdingRef.current = false;
    setActiveIntentId(null);
    setRuntimeState("IDLE");
  }

  function toggleHold() {
    holdingRef.current = !holdingRef.current;
    setHolding(holdingRef.current);
  }

  async function copySpeak() {
    if (!speakLine) return;
    try {
      await navigator.clipboard.writeText(speakLine);
      setCopiedAt(new Date().toLocaleTimeString());
    } catch {
      setCopiedAt(null);
    }
  }

  function repeatSpeak() {
    publishTeleprompter({
      text: speakLine,
      intentId: activeIntentId,
      updatedAt: new Date().toISOString()
    });
    setBroadcastedAt(new Date().toLocaleTimeString());
  }

  async function sendTextMessage() {
    const message = textDraft.trim();
    if (!message) return;
    setTextDraft("");
    const response = await ensureEngine().admitAndExecute(message, "paste_text");
    if (response) setSentResponses((responses) => [...responses, response]);
  }

  function handleTextDraftKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendTextMessage();
    }
  }

  const activeIntent = findIntent(activeIntentId);
  const speakLine =
    manualLine.trim().length > 0
      ? manualLine
      : currentResponse?.speak ??
        activeIntent?.speak ??
        "Speak normally — live guidance appears here as Companion hears you.";
  const steerLine =
    currentResponse?.steer ?? activeIntent?.steer ?? "Waiting for live transcript before offering direction.";

  const liveTranscriptText = transcriptBufferText(transcriptBuffer);
  const liveTranscriptTail =
    liveTranscriptText.length > 240 ? `…${liveTranscriptText.slice(-240)}` : liveTranscriptText;

  const transcriptReceivingNow = isTranscriptReceiving(liveDiagnostics.lastSegmentAt, new Date());

  function broadcastToTeleprompter() {
    publishTeleprompter({
      text: speakLine,
      intentId: activeIntentId,
      updatedAt: new Date().toISOString()
    });
    setBroadcastedAt(new Date().toLocaleTimeString());
  }

  return (
    <div className="companion-shell">
      <div className="companion-banner">COMPANION v1.2 · GOVERNED ASSIST — HUMAN REMAINS FINAL AUTHORITY</div>

      <header className="companion-header">
        <p className="eyebrow">Companion ON</p>
        <h1>Companion</h1>
        <div className={`state-badge ${STATE_BADGE_CLASS[runtimeState]}`} aria-live="polite">
          <span className="state-dot" />
          {STATE_LABEL[runtimeState]}
          {runtimeState === "LISTENING" && holding && <>&nbsp;· On hold</>}
          {(runtimeState === "LISTENING" || runtimeState === "TEXT_MODE") && (
            <>&nbsp;· {ENGINE_STATE_LABEL[engineState]}</>
          )}
        </div>
      </header>

      {runtimeState === "IDLE" && (
        <section className="status-panel">
          <p>Tap below to turn Companion on and grant microphone access.</p>
          <div className="status-panel-actions">
            <button className="start-companion" onClick={requestMicrophoneAccess}>
              Start Companion ON
            </button>
            <button className="secondary" onClick={enterTextMode}>Enter Text Mode</button>
          </div>
        </section>
      )}

      {runtimeState === "REQUESTING_PERMISSION" && (
        <section className="status-panel">
          <p>Requesting microphone access…</p>
          <small>Your browser should show a native microphone permission prompt now.</small>
          <div className="status-panel-actions">
            <button className="secondary" onClick={enterTextMode}>Enter Text Mode instead</button>
          </div>
        </section>
      )}

      {(runtimeState === "VOICE_UNAVAILABLE" || runtimeState === "ERROR") && (
        <section className="status-panel status-panel--unavailable">
          <p>
            {runtimeState === "ERROR"
              ? errorMessage ?? "The Companion runtime failed to initialize."
              : VOICE_UNAVAILABLE_MESSAGES[voiceUnavailableReason ?? "runtime-failure"]}
          </p>
          {lastMicError && (
            <pre className="raw-error">{lastMicError}</pre>
          )}
          <div className="status-panel-actions">
            {getUserMediaSupported && (
              <button className="secondary" onClick={requestMicrophoneAccess}>
                Try microphone access again
              </button>
            )}
            <button onClick={enterTextMode}>Enter Text Mode</button>
          </div>
        </section>
      )}

      {runtimeState === "LISTENING" && (
        <>
          <nav className="intent-row" aria-label="Companion intent commands">
            {INTENTS.map((intent) => (
              <button
                key={intent.id}
                className={`intent-button ${activeIntentId === intent.id ? "active" : ""}`}
                onClick={() => setActiveIntentId(intent.id)}
                aria-pressed={activeIntentId === intent.id}
              >
                <strong>{intent.word}</strong>
                <span>{intent.label}</span>
              </button>
            ))}
          </nav>

          <section className="card-stack">
            <article className="companion-card speak-card">
              <h2>Speak</h2>
              <p>{speakLine}</p>
              {currentResponse?.fallback && (
                <small className="live-status-detail">Fallback line — the provider failed for this utterance.</small>
              )}
            </article>

            <details className="steer-details">
              <summary>Steer</summary>
              <p>{steerLine}</p>
            </details>

            <div className="companion-controls" role="group" aria-label="Response controls">
              <button className="secondary" onClick={copySpeak}>Copy</button>
              <button className="secondary" onClick={repeatSpeak}>Repeat</button>
              <button className="secondary" aria-pressed={holding} onClick={toggleHold}>
                {holding ? "Resume" : "Hold"}
              </button>
              <button className="secondary" onClick={enterTextMode}>Text Mode</button>
              <button className="end-session" onClick={endSession}>End</button>
            </div>
            {copiedAt && <small className="live-status-detail">Copied at {copiedAt}.</small>}

            <article className="companion-card">
              <h2>Live transcript</h2>
              <p>{liveTranscriptTail || "Nothing heard yet."}</p>
              {liveStatusDetail && <small className="live-status-detail">{liveStatusDetail}</small>}
            </article>

            <details className="diagnostics-disclosure">
              <summary>Details &amp; diagnostics</summary>

              <article className="companion-card">
                <h2>Situation</h2>
                <dl className="situation-grid">
                  <dt>Session</dt>
                  <dd>{sessionId ?? "—"}</dd>
                  <dt>State</dt>
                  <dd>{STATE_LABEL[runtimeState]}</dd>
                  <dt>Intent</dt>
                  <dd>{activeIntent ? `${activeIntent.word} — ${activeIntent.label}` : "None selected"}</dd>
                  <dt>Started</dt>
                  <dd>{startedAt.toLocaleTimeString()}</dd>
                  <dt>Last event</dt>
                  <dd>{currentResponse?.eventId ?? "None yet"}</dd>
                </dl>
              </article>

              <article className="companion-card teleprompter-panel">
                <h2>Mac teleprompter sync</h2>
                <p>Live SPEAK lines broadcast automatically. Override below if needed.</p>
                <textarea
                  value={manualLine}
                  onChange={(event) => setManualLine(event.target.value)}
                  placeholder="Type a line to send to the teleprompter…"
                />
                <button onClick={broadcastToTeleprompter}>Broadcast to teleprompter</button>
                {broadcastedAt && <small>Broadcast at {broadcastedAt}.</small>}
                <small>
                  Open <a href="/?view=teleprompter" target="_blank" rel="noreferrer">
                    this address with ?view=teleprompter
                  </a>{" "}
                  in another tab or window on the same browser to see it sync live.
                </small>
              </article>

              <footer className="diagnostics-footer">
                <div>
                  <span>Mic Permission</span>
                  <strong>{micPermission === "unknown" ? "Unknown" : micPermission === "granted" ? "Granted" : "Denied"}</strong>
                </div>
                <div>
                  <span>Provider</span>
                  <strong>
                    {liveDiagnostics.provider === "none" ? "None" : liveDiagnostics.provider}
                    {liveDiagnostics.providerConnected ? " · connected" : ""}
                  </strong>
                </div>
                <div>
                  <span>Transcript Receiving</span>
                  <strong>{transcriptReceivingNow ? "Yes" : "No"}</strong>
                </div>
                <div>
                  <span>Fallback Mode</span>
                  <strong>{liveDiagnostics.fallbackMode ? "Yes" : "No"}</strong>
                </div>
                <div>
                  <span>Last Segment</span>
                  <strong>{liveDiagnostics.lastSegmentAt ? new Date(liveDiagnostics.lastSegmentAt).toLocaleTimeString() : "None"}</strong>
                </div>
                <div>
                  <span>Live Status</span>
                  <strong>{liveStatus}</strong>
                </div>
                <div>
                  <span>getUserMedia</span>
                  <strong>{getUserMediaSupported ? "Supported" : "Unsupported"}</strong>
                </div>
                <div>
                  <span>SpeechRecognition (diagnostic fallback)</span>
                  <strong>{speechRecognitionSupported ? "Supported" : "Unsupported"}</strong>
                </div>
                <div>
                  <span>Current State</span>
                  <strong>{runtimeState}</strong>
                </div>
                <div className="diagnostics-footer-wide">
                  <span>Last Mic Error</span>
                  <strong>{lastMicError ?? liveDiagnostics.lastError ?? "None"}</strong>
                </div>
              </footer>
            </details>
          </section>
        </>
      )}

      {runtimeState === "TEXT_MODE" && (
        <section className="card-stack">
          <article className="companion-card text-mode-panel">
            <h2>Text Mode</h2>
            <p>Manual admission fallback. Type a message instead of speaking.</p>
            <textarea
              ref={textInputRef}
              value={textDraft}
              onChange={(event) => setTextDraft(event.target.value)}
              onKeyDown={handleTextDraftKeyDown}
              placeholder="Type a message… (Enter to send, Shift+Enter for a new line)"
              rows={4}
              autoFocus
            />
            <div className="text-mode-actions">
              <button onClick={() => void sendTextMessage()} disabled={textDraft.trim().length === 0}>Send</button>
              <button className="secondary" onClick={backToVoice}>Back to Voice</button>
              <button className="end-session" onClick={endSession}>End</button>
            </div>
            {sentResponses.length > 0 && (
              <ul className="text-mode-transcript">
                {sentResponses.map((response) => (
                  <li key={response.eventId} className="admission-receipt">
                    <div className="admission-receipt-input">
                      <span className={`event-type-tag ${response.receipt?.event.event_type ?? "statement"}`}>
                        {response.receipt?.event.event_type ?? "fallback"}
                      </span>
                      <span>{response.receipt?.event.text_chunk ?? ""}</span>
                    </div>
                    <div className="admission-receipt-output">
                      <p><strong>Speak</strong> {response.speak}</p>
                      <p><strong>Steer</strong> {response.steer}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      )}

      <footer className="companion-footer">
        No autonomous decisions taken · Human remains final authority
      </footer>
    </div>
  );
}
