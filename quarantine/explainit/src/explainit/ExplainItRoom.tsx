import React, { useEffect, useRef, useState } from "react";
import { findRoom } from "./roomRegistry";
import {
  askQuestion,
  closeRoom,
  createRoomSession,
  crossThreshold,
  gatesPassed,
  readinessChecks,
  type AskChannel,
  type RoomSession
} from "./roomSession";
import { speakAnswerAloud, startVoiceCapture, type VoiceCaptureHandle, type VoiceWindowLike } from "./voiceCapture";
import "./explainit.css";

type VoiceState = "idle" | "requesting" | "listening" | "unavailable";

export default function ExplainItRoom({ roomId }: { roomId: string }) {
  const room = findRoom(roomId);

  if (!room) {
    return (
      <div className="explainit-shell explainit-entry">
        <main className="entry-center">
          <p className="eyebrow">ExplainIT</p>
          <h1>No such room</h1>
          <p className="entry-lede">
            There is no governed room named “{roomId}”. Rooms only exist once their contract and sources are seeded.
          </p>
          <a className="room-link" href="/explainit">Back to the entry</a>
        </main>
      </div>
    );
  }

  return <GovernedRoom initialSession={createRoomSession(room)} />;
}

function GovernedRoom({ initialSession }: { initialSession: RoomSession }) {
  const [session, setSession] = useState<RoomSession>(initialSession);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const captureRef = useRef<VoiceCaptureHandle | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const room = session.room;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousTitle = document.title;
    document.title = `${room.name} · ExplainIT`;
    return () => {
      document.title = previousTitle;
    };
  }, [room.name]);

  useEffect(() => {
    return () => captureRef.current?.stop();
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [session.transcript.length]);

  // Both channels funnel into the one governed answer path in roomSession —
  // the UI never produces an answer on its own.
  function submitQuestion(text: string, channel: AskChannel) {
    setSession((current) => {
      const result = askQuestion(current, text, channel);
      if (result.answered && channel === "voice" && typeof window !== "undefined") {
        speakAnswerAloud(window, result.answerText);
      }
      if (result.refused && result.answerText) setVoiceNotice(result.answerText);
      return result.session;
    });
  }

  // Mic permission first, recognition second — see voiceCapture.ts.
  async function handleSpeak() {
    if (voiceState === "listening") {
      captureRef.current?.stop();
      return;
    }
    setVoiceNotice(null);
    setVoiceState("requesting");
    captureRef.current = await startVoiceCapture(navigator, window as unknown as VoiceWindowLike, {
      onTranscript: (text) => submitQuestion(text, "voice"),
      onUnavailable: (message, detail) => {
        setVoiceNotice(detail ? `${message} (${detail})` : message);
        setVoiceState("unavailable");
      },
      onEnd: () => setVoiceState((current) => (current === "unavailable" ? current : "idle"))
    });
    if (captureRef.current) setVoiceState("listening");
  }

  function handleSendText(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    submitQuestion(text, "text");
    setDraft("");
  }

  if (session.status === "THRESHOLD") {
    return <ThresholdOrientation session={session} onCross={() => setSession(crossThreshold)} />;
  }

  const readiness = readinessChecks(session);
  const readinessOk = readiness.filter((check) => check.ok).length;
  const lastCited = [...session.transcript].reverse().find((entry) => entry.citedSourceLabels.length > 0);

  return (
    <div className="explainit-shell explainit-room">
      <header className="room-header">
        <div>
          <p className="eyebrow">ExplainIT · Governed room</p>
          <h1>{room.name}</h1>
        </div>
        <div className="room-header-right">
          <span className={`room-status ${session.status === "OPEN" ? "open" : "closed"}`}>
            {session.status === "OPEN" ? "Room open · gates passed" : "Room closed"}
          </span>
          {session.status === "OPEN" && (
            <button className="quiet" onClick={() => setSession(closeRoom)}>Close room</button>
          )}
        </div>
      </header>

      <div className="room-body">
        <main className="room-conversation">
          <ol className="transcript" aria-label="Room transcript">
            {session.transcript.map((entry) => (
              <li key={entry.entryId} className={`turn ${entry.speaker}`}>
                <span className="turn-meta">
                  {entry.speaker === "room" ? room.name : "You"}
                  {entry.channel !== "system" && ` · ${entry.channel}`}
                </span>
                <p>{entry.text}</p>
                {entry.citedSourceLabels.length > 0 && (
                  <span className="turn-sources">From: {entry.citedSourceLabels.join(" · ")}</span>
                )}
              </li>
            ))}
            <div ref={transcriptEndRef} />
          </ol>

          {session.transcript.length <= 1 && session.status === "OPEN" && (
            <div className="starter-prompts">
              {room.starterPrompts.map((prompt) => (
                <button key={prompt} className="starter" onClick={() => submitQuestion(prompt, "text")}>
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {voiceNotice && <p className="voice-notice" role="status">{voiceNotice}</p>}

          {session.status === "OPEN" ? (
            <div className="ask-bar">
              <button
                className={`speak-button ${voiceState}`}
                onClick={handleSpeak}
                disabled={voiceState === "requesting"}
                aria-label={voiceState === "listening" ? "Stop listening" : "Speak a question"}
              >
                {voiceState === "listening" ? "Listening… tap to stop" : voiceState === "requesting" ? "Requesting mic…" : "Speak"}
              </button>
              <form className="text-fallback" onSubmit={handleSendText}>
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Or type your question…"
                  aria-label="Type a question"
                />
                <button type="submit" disabled={draft.trim().length === 0}>Ask</button>
              </form>
            </div>
          ) : (
            <p className="room-closed-note">This room is closed. Only its receipts remain.</p>
          )}

          <p className="room-disclaimer">{room.disclaimer}</p>
        </main>

        {/* Governance rails: compact and collapsible, never removable. */}
        <aside className="room-rails" aria-label="Governance rails">
          <details className="rail" open data-rail="evidence">
            <summary>Evidence · {room.admittedSources.length} admitted sources</summary>
            <ul>
              {room.admittedSources.map((source) => (
                <li key={source.sourceId} className={lastCited?.citedSourceLabels.includes(source.label) ? "cited" : ""}>
                  <strong>{source.label}</strong>
                  <span>{source.evidenceQuality}</span>
                </li>
              ))}
            </ul>
          </details>

          <details className="rail" open data-rail="receipts">
            <summary>Receipts · {session.receipts.length}</summary>
            <ul>
              {session.receipts.map((receipt) => (
                <li key={receipt.receiptId} className={receipt.humanReviewFlag ? "flagged" : ""}>
                  <strong>
                    {receipt.kind.replace(/_/g, " ")}
                    {receipt.humanReviewFlag && " · human review"}
                  </strong>
                  <span>{receipt.note}</span>
                </li>
              ))}
            </ul>
          </details>

          <details className="rail" open data-rail="readiness">
            <summary>Readiness · {readinessOk}/{readiness.length}</summary>
            <ul>
              {readiness.map((check) => (
                <li key={check.id} className={check.ok ? "ready" : "pending"}>
                  <strong>{check.ok ? "✓" : "…"} {check.label}</strong>
                </li>
              ))}
            </ul>
          </details>
        </aside>
      </div>
    </div>
  );
}

// The first thirty seconds: purpose, authority, admitted sources, boundaries,
// and what the room can and cannot do — acknowledged before anything else.
function ThresholdOrientation({ session, onCross }: { session: RoomSession; onCross: () => void }) {
  const room = session.room;
  return (
    <div className="explainit-shell explainit-threshold">
      <main className="threshold-panel">
        <p className="eyebrow">You are crossing into a governed room</p>
        <h1>{room.name}</h1>

        <section>
          <h2>Purpose</h2>
          <p>{room.purpose}</p>
        </section>

        <section>
          <h2>Authority</h2>
          <p>{room.authority}</p>
        </section>

        <section>
          <h2>Admitted sources</h2>
          <ul>
            {room.admittedSources.map((source) => (
              <li key={source.sourceId}>{source.label}</li>
            ))}
          </ul>
        </section>

        <div className="threshold-columns">
          <section>
            <h2>This room can</h2>
            <ul>
              {room.canDo.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2>This room cannot</h2>
            <ul>
              {room.cannotDo.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <section>
          <h2>Boundaries</h2>
          <ul>
            {room.boundaries.map((boundary) => (
              <li key={boundary}>{boundary}</li>
            ))}
          </ul>
        </section>

        <button className="enter-room" onClick={onCross} disabled={!session.gates.contractLoaded || !session.gates.sourcesAdmitted}>
          I understand — open the room
        </button>
        <p className="entry-footnote">{room.disclaimer}</p>
      </main>
    </div>
  );
}
