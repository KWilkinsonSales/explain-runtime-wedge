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
import { runAdmissionRail, runPasteTextRail, type AdmissionReceipt } from "./admissionSourceAdapter";
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

  const sessionId = useMemo(() => `proto-${Math.random().toString(36).slice(2, 8)}`, []);
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
  const [liveReceipt, setLiveReceipt] = useState<AdmissionReceipt | null>(null);

  const [activeIntentId, setActiveIntentId] = useState<IntentId | null>(null);
  const [manualLine, setManualLine] = useState("");
  const [broadcastedAt, setBroadcastedAt] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [sentMessages, setSentMessages] = useState<AdmissionReceipt[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const liveHandleRef = useRef<LiveHandle | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);

  function stopLiveRail() {
    liveHandleRef.current?.stop();
    liveHandleRef.current = null;
  }

  function handleLiveSegment(segmentText: string, isFinal: boolean) {
    setTranscriptBuffer((buffer) => appendSegment(buffer, { text: segmentText, isFinal }));

    if (!isFinal) return;

    const receipt = runAdmissionRail({
      source_provider: "browser_mic",
      session_id: sessionId,
      text_chunk: segmentText
    });
    setLiveReceipt(receipt);
    publishTeleprompter({
      text: receipt.output.speak,
      intentId: null,
      updatedAt: new Date().toISOString()
    });
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
    };
  }, []);

  useEffect(() => {
    if (runtimeState === "TEXT_MODE") {
      textInputRef.current?.focus();
    }
  }, [runtimeState]);

  function enterTextMode() {
    stopLiveRail();
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

  function sendTextMessage() {
    const message = textDraft.trim();
    if (!message) return;
    const receipt = runPasteTextRail({ session_id: sessionId, text_chunk: message });
    setSentMessages((messages) => [...messages, receipt]);
    setTextDraft("");
  }

  function handleTextDraftKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendTextMessage();
    }
  }

  const activeIntent = findIntent(activeIntentId);
  const speakLine =
    manualLine.trim().length > 0
      ? manualLine
      : liveReceipt?.output.speak ??
        activeIntent?.speak ??
        "Speak normally — live guidance appears here as Companion hears you.";
  const steerLine =
    liveReceipt?.output.steer ?? activeIntent?.steer ?? "Waiting for live transcript before offering direction.";

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
      <div className="companion-banner">COMPANION v1.1 · GOVERNED ASSIST — HUMAN REMAINS FINAL AUTHORITY</div>

      <header className="companion-header">
        <p className="eyebrow">Companion ON</p>
        <h1>Companion</h1>
        <div className={`state-badge ${STATE_BADGE_CLASS[runtimeState]}`} aria-live="polite">
          <span className="state-dot" />
          {STATE_LABEL[runtimeState]}
          {runtimeState === "LISTENING" && liveDiagnostics.provider !== "none" && (
            <>&nbsp;· {liveDiagnostics.provider === "deepgram" ? "Deepgram live" : "Web Speech fallback"}</>
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
            <article className="companion-card">
              <h2>Speak</h2>
              <p>{speakLine}</p>
            </article>

            <article className="companion-card">
              <h2>Steer</h2>
              <p>{steerLine}</p>
            </article>

            <article className="companion-card">
              <h2>Live transcript</h2>
              <p>{liveTranscriptTail || "Nothing heard yet."}</p>
              {liveStatusDetail && <small className="live-status-detail">{liveStatusDetail}</small>}
            </article>

            <article className="companion-card">
              <h2>Situation</h2>
              <dl className="situation-grid">
                <dt>Session</dt>
                <dd>{sessionId}</dd>
                <dt>State</dt>
                <dd>{STATE_LABEL[runtimeState]}</dd>
                <dt>Intent</dt>
                <dd>{activeIntent ? `${activeIntent.word} — ${activeIntent.label}` : "None selected"}</dd>
                <dt>Started</dt>
                <dd>{startedAt.toLocaleTimeString()}</dd>
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

            <article className="companion-card">
              <button className="secondary" onClick={enterTextMode}>Enter Text Mode</button>
            </article>
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
              <button onClick={sendTextMessage} disabled={textDraft.trim().length === 0}>Send</button>
              <button className="secondary" onClick={backToVoice}>Back to Voice</button>
            </div>
            {sentMessages.length > 0 && (
              <ul className="text-mode-transcript">
                {sentMessages.map((receipt, index) => (
                  <li key={index} className="admission-receipt">
                    <div className="admission-receipt-input">
                      <span className={`event-type-tag ${receipt.event.event_type}`}>{receipt.event.event_type}</span>
                      <span>{receipt.event.text_chunk}</span>
                    </div>
                    <div className="admission-receipt-output">
                      <p><strong>Speak</strong> {receipt.output.speak}</p>
                      <p><strong>Steer</strong> {receipt.output.steer}</p>
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
    </div>
  );
}
