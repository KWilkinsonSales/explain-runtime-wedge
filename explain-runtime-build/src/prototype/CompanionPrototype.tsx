import React, { useEffect, useMemo, useRef, useState } from "react";
import { INTENTS, findIntent, type IntentId } from "./intents";
import { publishTeleprompter } from "./teleprompterSync";
import { usePrototypeHeadTags } from "./usePrototypeHeadTags";
import {
  classifyMicrophoneError,
  isGetUserMediaSupported,
  isSpeechRecognitionSupported,
  VOICE_UNAVAILABLE_MESSAGES,
  type CompanionRuntimeState,
  type MicPermissionStatus,
  type VoiceUnavailableReason
} from "./companionRuntime";
import "./prototype.css";

const STATE_LABEL: Record<CompanionRuntimeState, string> = {
  INITIALIZING: "Initializing",
  REQUESTING_PERMISSION: "Requesting mic access",
  LISTENING: "Listening",
  TEXT_MODE: "Text Mode",
  VOICE_UNAVAILABLE: "Voice unavailable",
  ERROR: "Error"
};

const STATE_BADGE_CLASS: Record<CompanionRuntimeState, string> = {
  INITIALIZING: "pending",
  REQUESTING_PERMISSION: "pending",
  LISTENING: "listening",
  TEXT_MODE: "text-mode",
  VOICE_UNAVAILABLE: "unavailable",
  ERROR: "unavailable"
};

export default function CompanionPrototype() {
  usePrototypeHeadTags();

  const sessionId = useMemo(() => `proto-${Math.random().toString(36).slice(2, 8)}`, []);
  const startedAt = useMemo(() => new Date(), []);
  const getUserMediaSupported = useMemo(() => isGetUserMediaSupported(navigator), []);
  const speechRecognitionSupported = useMemo(() => isSpeechRecognitionSupported(window), []);

  const [runtimeState, setRuntimeState] = useState<CompanionRuntimeState>("INITIALIZING");
  const [micPermission, setMicPermission] = useState<MicPermissionStatus>("unknown");
  const [voiceUnavailableReason, setVoiceUnavailableReason] = useState<VoiceUnavailableReason | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeIntentId, setActiveIntentId] = useState<IntentId | null>(null);
  const [manualLine, setManualLine] = useState("");
  const [broadcastedAt, setBroadcastedAt] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [sentMessages, setSentMessages] = useState<string[]>([]);

  const streamRef = useRef<MediaStream | null>(null);

  async function requestMicrophoneAccess() {
    setRuntimeState("REQUESTING_PERMISSION");

    if (!getUserMediaSupported) {
      setVoiceUnavailableReason("unsupported");
      setRuntimeState("VOICE_UNAVAILABLE");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission("granted");
      setRuntimeState("LISTENING");
    } catch (error) {
      const reason = classifyMicrophoneError(error);
      setMicPermission(reason === "permission-denied" ? "denied" : "unknown");
      setVoiceUnavailableReason(reason);
      setRuntimeState("VOICE_UNAVAILABLE");
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await requestMicrophoneAccess();
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Unknown runtime failure.");
        setRuntimeState("ERROR");
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enterTextMode() {
    setRuntimeState("TEXT_MODE");
  }

  function backToVoice() {
    if (streamRef.current) {
      setRuntimeState("LISTENING");
      return;
    }
    requestMicrophoneAccess();
  }

  function sendTextMessage() {
    const message = textDraft.trim();
    if (!message) return;
    setSentMessages((messages) => [...messages, message]);
    setTextDraft("");
  }

  const activeIntent = findIntent(activeIntentId);
  const speakLine = manualLine.trim().length > 0
    ? manualLine
    : activeIntent?.speak ?? "Select an intent to preview what Companion would say.";
  const steerLine = activeIntent?.steer ?? "Waiting for an intent before offering direction.";

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
      <div className="companion-banner">PROTOTYPE · PRIVATE PROOF BUILD — not the production Companion</div>

      <header className="companion-header">
        <p className="eyebrow">Companion ON</p>
        <h1>Companion</h1>
        <div className={`state-badge ${STATE_BADGE_CLASS[runtimeState]}`} aria-live="polite">
          <span className="state-dot" />
          {STATE_LABEL[runtimeState]}
        </div>
      </header>

      {(runtimeState === "INITIALIZING" || runtimeState === "REQUESTING_PERMISSION") && (
        <section className="status-panel">
          <p>{runtimeState === "INITIALIZING" ? "Initializing…" : "Requesting microphone access…"}</p>
          <small>iOS should show a native microphone permission prompt now.</small>
        </section>
      )}

      {(runtimeState === "VOICE_UNAVAILABLE" || runtimeState === "ERROR") && (
        <section className="status-panel status-panel--unavailable">
          <p>
            {runtimeState === "ERROR"
              ? errorMessage ?? "The Companion runtime failed to initialize."
              : VOICE_UNAVAILABLE_MESSAGES[voiceUnavailableReason ?? "runtime-failure"]}
          </p>
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
              <h2>Mac teleprompter sync (proof)</h2>
              <p>Override the Speak line, then broadcast it to the teleprompter view.</p>
              <textarea
                value={manualLine}
                onChange={(event) => setManualLine(event.target.value)}
                placeholder="Type a line to send to the teleprompter…"
              />
              <button onClick={broadcastToTeleprompter}>Broadcast to teleprompter</button>
              {broadcastedAt && <small>Broadcast at {broadcastedAt}.</small>}
              <small>
                Open <a href="/companion/prototype?view=teleprompter" target="_blank" rel="noreferrer">
                  this address with ?view=teleprompter
                </a>{" "}
                in another tab or window on the same browser to see it sync live. This proof syncs across
                tabs on one browser only — a real phone-to-Mac relay would need a deployed backend, which is
                out of scope for this build-first pass.
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
            <p>Voice may be unavailable or paused. Type a message instead.</p>
            <textarea
              value={textDraft}
              onChange={(event) => setTextDraft(event.target.value)}
              placeholder="Type a message…"
              rows={4}
            />
            <div className="text-mode-actions">
              <button onClick={sendTextMessage}>Send</button>
              <button className="secondary" onClick={backToVoice}>Back to Voice</button>
            </div>
            {sentMessages.length > 0 && (
              <ul className="text-mode-transcript">
                {sentMessages.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            )}
          </article>
        </section>
      )}

      <footer className="companion-footer">
        Proof mode · No autonomous decisions taken · Nothing here is production truth
      </footer>

      <footer className="diagnostics-footer">
        <div>
          <span>Mic Permission</span>
          <strong>{micPermission === "unknown" ? "Unknown" : micPermission === "granted" ? "Granted" : "Denied"}</strong>
        </div>
        <div>
          <span>getUserMedia</span>
          <strong>{getUserMediaSupported ? "Supported" : "Unsupported"}</strong>
        </div>
        <div>
          <span>SpeechRecognition</span>
          <strong>{speechRecognitionSupported ? "Supported" : "Unsupported"}</strong>
        </div>
        <div>
          <span>Current State</span>
          <strong>{runtimeState}</strong>
        </div>
      </footer>
    </div>
  );
}
