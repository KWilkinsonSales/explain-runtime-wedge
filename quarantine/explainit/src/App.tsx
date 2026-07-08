import React, { useMemo, useRef, useState } from "react";
import { createInitialState, explainAdlMission } from "./mission";
import { canStartVoiceMission, evaluateCompletion, voiceOperationalReport } from "./runtime";
import { connectRealtimeVoice, type RealtimeConnection } from "./realtime";
import "./styles.css";

function getToken(): string {
  const pathToken = window.location.pathname.split("/").filter(Boolean).at(-1);
  return new URLSearchParams(window.location.search).get("token") ?? pathToken ?? "demo";
}

export default function App() {
  const token = useMemo(getToken, []);
  const stateRef = useRef(createInitialState());
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const [status, setStatus] = useState("Ready");
  const [detail, setDetail] = useState("A short voice experience built around your world—not a chatbot, not a pitch.");
  const [textMode, setTextMode] = useState(false);

  async function start() {
    setStatus("Connecting voice…");
    setDetail("Verifying the neural realtime voice path. The Mission will not start on a fallback voice.");
    try {
      connectionRef.current = await connectRealtimeVoice(
        token,
        stateRef.current,
        (event) => console.debug("realtime", event),
        () => setDetail("The Founder Envoy is speaking.")
      );

      if (!canStartVoiceMission(stateRef.current)) throw new Error("Voice verification gate failed.");
      stateRef.current.mission.status = "RUNNING";
      stateRef.current.progress.openingEstablished = true;
      setStatus("Kellen’s Explain It");

      connectionRef.current.events.send(JSON.stringify({
        type: "session.update",
        session: {
          modalities: ["audio", "text"],
          instructions: buildInstructions(),
          turn_detection: {
            type: "server_vad",
            create_response: true,
            interrupt_response: true
          }
        }
      }));
      connectionRef.current.events.send(JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["audio", "text"],
          instructions: `Begin now. Say: ${explainAdlMission.script.firstLine} Then continue naturally with the bounded opening and ask the discovery question.`
        }
      }));
    } catch (error) {
      stateRef.current.endedReason = `technical:${error instanceof Error ? error.message : "voice-failure"}`;
      setStatus("Voice unavailable");
      setDetail("The verified neural voice path is unavailable. This voice Mission did not start. You may enter explicitly labeled Text Mode.");
    }
  }

  function buildInstructions(): string {
    return `You are Kellen's Founder Envoy for one bounded Explain ADL Mission.
Authority: understanding only. Never sell, negotiate, schedule, promise, decide, or provide consulting.
Lead the conversation. Use short conversational turns and natural contractions. Never read headings or numbered lists. Avoid customer-service language and announcer cadence.
When interrupted, stop immediately and listen. When the recipient is skeptical, become concrete. When they recognize the implication, slow down and let it land.
Mission path: establish bounded purpose; ask '${explainAdlMission.script.discoveryQuestion}'; reflect the visible decision, hidden pressures, roles, missing context, and forming consequence; deliver '${explainAdlMission.script.revealLine}'; explain '${explainAdlMission.script.adlDistinction}'; offer the tiny demo with '${explainAdlMission.script.demoPrompt}'; ask relevance; check for a question or message to Kellen; close explicitly.
Do not claim completion unless the lifecycle evidence exists. Do not continue after close.`;
  }

  async function closeMission() {
    const state = stateRef.current;
    state.progress.closedExplicitly = true;
    const receipt = {
      recipient: state.recipient.displayName,
      missionStatus: state.endedReason ? "Technical Failure" : "Incomplete",
      decisionEnvironment: state.evidence.decision,
      hoverSignalObserved: state.progress.hoverSignalObserved,
      primaryQuestion: state.evidence.questionOrObjection,
      demonstrationTopic: state.evidence.demonstrationTopic,
      handoffType: state.evidence.handoffType,
      messageForKellen: state.evidence.messageForKellen
    };
    const response = await fetch(`/api/missions/${encodeURIComponent(token)}/receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": token },
      body: JSON.stringify({ receipt, state })
    });
    if (response.ok) state.progress.receiptWritten = true;
    connectionRef.current?.stop();
    state.progress.disposed = true;
    state.mission.status = "CLOSED";
    setStatus("Explanation complete");
    setDetail("This Mission is closed. Only its minimal receipt remains.");
    console.info("acceptance-report", {
      completion: evaluateCompletion(state),
      voiceAcceptance: voiceOperationalReport(state)
    });
  }

  return (
    <main className="shell">
      <section className="presence" aria-live="polite">
        <div className={`orb ${status.includes("Explain") ? "active" : ""}`} />
        <p className="eyebrow">A governed explanation from Kellen</p>
        <h1>{status}</h1>
        <p className="detail">{detail}</p>
        {status === "Ready" && <button onClick={start}>Start the explanation</button>}
        {status === "Voice unavailable" && (
          <button className="secondary" onClick={() => setTextMode(true)}>Enter Text Mode</button>
        )}
        {status === "Kellen’s Explain It" && <button className="secondary" onClick={closeMission}>End explanation</button>}
        {textMode && <div className="text-mode"><strong>Text Mode</strong><p>Voice is unavailable. No fallback voice is being used.</p></div>}
        <p className="boundary">Understanding only · No autonomous decisions · Single-use Mission</p>
      </section>
    </main>
  );
}
