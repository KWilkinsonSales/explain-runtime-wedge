import React, { useState } from "react";
import type { ClassSnapshot, PrepDoc, PrivateMaterial, WeeklyLesson } from "./types";
import { promotedBlocks } from "./prep";
import { EXPORT_PRESETS, buildExportHtml, openPrintWindow, type ExportPreset } from "./exportPdf";

// Review → Ready for Class. Making the snapshot confirms the teacher's
// chosen content only — the copy on this screen must never suggest the
// lesson is being judged.

interface ReadyReviewProps {
  lesson: WeeklyLesson;
  prep: PrepDoc;
  privateMaterial: PrivateMaterial;
  activeSnapshot: ClassSnapshot | null;
  onConfirmReady: () => void;
  onBackToPrepare: () => void;
  onOpenTeach: () => void;
}

export default function ReadyReview({
  lesson,
  prep,
  privateMaterial,
  activeSnapshot,
  onConfirmReady,
  onBackToPrepare,
  onOpenTeach
}: ReadyReviewProps) {
  const [includePrivateInPacket, setIncludePrivateInPacket] = useState(false);
  const blocks = promotedBlocks(prep);
  const snapshotIsCurrent = activeSnapshot !== null;

  function exportPreset(preset: ExportPreset) {
    if (!activeSnapshot) return;
    const includePrivateNotes =
      preset === "teacher-packet" && includePrivateInPacket ? privateMaterial.notes : undefined;
    const html = buildExportHtml(activeSnapshot, preset, {
      includePrivateNotes,
      illustrative: lesson.illustrative
    });
    if (!openPrintWindow(html)) {
      window.alert("The print window was blocked. Allow pop-ups for this page and try again.");
    }
  }

  return (
    <section className="tp-screen" aria-labelledby="tp-review-heading">
      <h1 id="tp-review-heading">Review</h1>
      <p className="tp-hint">This is what your class will see. Nothing else is included.</p>

      <p className="tp-eyebrow">{lesson.title}</p>
      <ul className="tp-review-list">
        {blocks.map((block) => (
          <li key={block.id}>
            <h3>
              {block.title}
              {block.fromPrivate && <span className="tp-from-private"> · shared from my notes</span>}
            </h3>
            <p>{block.body}</p>
            {block.scriptureRefs.length > 0 && <p className="tp-anchors">{block.scriptureRefs.join("; ")}</p>}
          </li>
        ))}
      </ul>

      <div className="tp-actions">
        <button type="button" className="tp-primary" onClick={onConfirmReady}>
          {activeSnapshot ? "Replace class snapshot" : "Ready for Class"}
        </button>
        <button type="button" className="tp-secondary" onClick={onBackToPrepare}>
          Back to Prepare
        </button>
        {snapshotIsCurrent && (
          <button type="button" className="tp-secondary" onClick={onOpenTeach}>
            Open Teach
          </button>
        )}
      </div>
      {activeSnapshot && (
        <p className="tp-hint">
          Teach is using the snapshot made {new Date(activeSnapshot.createdAt).toLocaleString()}. It only changes when
          you replace it here.
        </p>
      )}

      {activeSnapshot && (
        <section className="tp-export" aria-labelledby="tp-export-heading">
          <h2 id="tp-export-heading">Print / PDF</h2>
          <p className="tp-hint">Made from the current class snapshot. Private notes are left out unless you ask.</p>
          <div className="tp-actions">
            {EXPORT_PRESETS.map((preset) => (
              <button key={preset.id} type="button" className="tp-secondary" onClick={() => exportPreset(preset.id)}>
                {preset.label}
              </button>
            ))}
          </div>
          <label className="tp-export-optin">
            <input
              type="checkbox"
              checked={includePrivateInPacket}
              onChange={(event) => setIncludePrivateInPacket(event.target.checked)}
            />
            <span>Also print my private notes in the Teacher Packet (they stay off every other export)</span>
          </label>
        </section>
      )}
    </section>
  );
}
