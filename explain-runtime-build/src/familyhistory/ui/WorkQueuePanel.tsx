import React from "react";
import { buildWorkQueue, type WorkQueueKind } from "../insights";
import { DONNA_JEAN_PACKET } from "../fixtures";

// Work Queue: every open unit of research work, derived from the ledger.
// Completing an item always means a human records a disposition — the queue
// itself never changes the ledger.

const KIND_TEXT: Record<WorkQueueKind, string> = {
  source_only_claim: "Source-only claims",
  hold_candidate: "Hold candidates",
  rejected_guard: "Rejected false leads (guards)",
  merge_candidate: "Merge candidates",
  interview_follow_up: "Interview follow-ups",
  artifact_ocr: "Artifact OCR tasks",
};

const KIND_ORDER: WorkQueueKind[] = [
  "source_only_claim",
  "hold_candidate",
  "rejected_guard",
  "merge_candidate",
  "interview_follow_up",
  "artifact_ocr",
];

export default function WorkQueuePanel() {
  const queue = buildWorkQueue(DONNA_JEAN_PACKET);

  return (
    <section className="fhgi-panel" aria-labelledby="fhgi-h-queue">
      <h2 id="fhgi-h-queue">Work Queue</h2>
      <p className="fhgi-panel-note">
        Derived from the ledger. Items resolve only when a human records a new
        disposition — nothing here executes on its own.
      </p>
      {KIND_ORDER.map((kind) => {
        const items = queue.filter((item) => item.kind === kind);
        if (items.length === 0) return null;
        return (
          <div key={kind} className="fhgi-queue-group">
            <h3>{KIND_TEXT[kind]}</h3>
            <ul className="fhgi-list">
              {items.map((item) => (
                <li key={item.queueId}>
                  <strong>{item.label}</strong>
                  <br />
                  <span className="fhgi-muted">{item.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
