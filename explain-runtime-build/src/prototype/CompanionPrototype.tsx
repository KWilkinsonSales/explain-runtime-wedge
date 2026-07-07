import React, { useMemo, useState } from "react";
import { INTENTS, findIntent, type IntentId } from "./intents";
import { publishTeleprompter } from "./teleprompterSync";
import { usePrototypeHeadTags } from "./usePrototypeHeadTags";
import "./prototype.css";

export default function CompanionPrototype() {
  usePrototypeHeadTags();

  const sessionId = useMemo(() => `proto-${Math.random().toString(36).slice(2, 8)}`, []);
  const startedAt = useMemo(() => new Date(), []);
  const [listening, setListening] = useState(false);
  const [activeIntentId, setActiveIntentId] = useState<IntentId | null>(null);
  const [manualLine, setManualLine] = useState("");
  const [broadcastedAt, setBroadcastedAt] = useState<string | null>(null);

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
        <div className={`state-badge ${listening ? "listening" : "provisional"}`} aria-live="polite">
          <span className="state-dot" />
          {listening ? "Listening" : "Provisional"}
        </div>
        <div>
          <button
            className={`listen-toggle ${listening ? "is-listening" : ""}`}
            onClick={() => setListening((value) => !value)}
          >
            {listening ? "Stop listening (proof)" : "Start listening (proof)"}
          </button>
        </div>
      </header>

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
            <dd>{listening ? "Listening" : "Provisional"}</dd>
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
      </section>

      <footer className="companion-footer">
        Proof mode · No autonomous decisions taken · Nothing here is production truth
      </footer>
    </div>
  );
}
