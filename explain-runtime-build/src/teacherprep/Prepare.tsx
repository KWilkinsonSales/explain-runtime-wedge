import React, { useEffect, useRef, useState } from "react";
import type { PrepDoc, PrivateMaterial, PrivateNote, WeeklyLesson } from "./types";
import { PRIVATE_MICROCOPY } from "./fixture";
import { editBlockBody, promotePrivateNote, promotedBlocks, setBlockPromoted, setIntent } from "./prep";

interface PrepareProps {
  lesson: WeeklyLesson;
  prep: PrepDoc;
  privateMaterial: PrivateMaterial;
  onUpdatePrep: (updater: (current: PrepDoc) => PrepDoc) => void;
  onUpdatePrivate: (next: PrivateMaterial) => void;
  onReview: () => void;
}

interface UndoToast {
  message: string;
  undo: () => void;
}

let noteCounter = 0;

export default function Prepare({ lesson, prep, privateMaterial, onUpdatePrep, onUpdatePrivate, onReview }: PrepareProps) {
  const [toast, setToast] = useState<UndoToast | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [confirmingNoteId, setConfirmingNoteId] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState("");

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(next: UndoToast) {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  }

  function togglePromoted(blockId: string, promoted: boolean) {
    onUpdatePrep((current) => setBlockPromoted(current, blockId, promoted));
    showToast({
      message: promoted ? "Added to class content." : "Removed from class content.",
      undo: () => {
        onUpdatePrep((current) => setBlockPromoted(current, blockId, !promoted));
        setToast(null);
      }
    });
  }

  function addPrivateNote() {
    const text = newNoteText.trim();
    if (!text) return;
    noteCounter += 1;
    const note: PrivateNote = { id: `note-${noteCounter}-${Date.now().toString(36)}`, label: "My note", text };
    onUpdatePrivate({ ...privateMaterial, notes: [...privateMaterial.notes, note] });
    setNewNoteText("");
  }

  function removePrivateNote(noteId: string) {
    onUpdatePrivate({ ...privateMaterial, notes: privateMaterial.notes.filter((note) => note.id !== noteId) });
  }

  function confirmShareNote(note: PrivateNote) {
    onUpdatePrep((current) => promotePrivateNote(current, note, { confirmed: true }));
    setConfirmingNoteId(null);
    showToast({
      message: "Your note is now part of the class content. You can remove it below at any time.",
      undo: () => setToast(null)
    });
  }

  const promotedCount = promotedBlocks(prep).length;
  const intentReady = prep.intent.trim().length > 0;

  return (
    <section className="tp-screen tp-prepare" aria-labelledby="tp-prepare-heading">
      <h1 id="tp-prepare-heading">Prepare</h1>
      <p className="tp-eyebrow">{lesson.title}</p>

      <div className="tp-field">
        <label htmlFor="tp-intent">
          <strong>What does your class need this week?</strong>
        </label>
        <textarea
          id="tp-intent"
          value={prep.intent}
          onChange={(event) => onUpdatePrep((current) => setIntent(current, event.target.value))}
          rows={2}
          placeholder="One sentence is enough."
        />
      </div>

      <div className="tp-core">
        <h2>Core truth</h2>
        <p>{lesson.coreTruth}</p>
        <p>{lesson.connectionToChrist}</p>
        <p className="tp-anchors" aria-label="Scripture anchors">
          {lesson.scriptureAnchors.join(" · ")}
        </p>
      </div>

      <h2>Lesson blocks</h2>
      <p className="tp-hint">Everything below is editable and optional. Tap “Use in class” to choose what your class will see.</p>
      <ul className="tp-blocks">
        {prep.blocks.map((block) => (
          <li key={block.id} className={block.promoted ? "tp-block tp-block-promoted" : "tp-block"}>
            <div className="tp-block-head">
              <h3>
                {block.title}
                {block.fromPrivate && <span className="tp-from-private"> · shared from my notes</span>}
              </h3>
              <button
                type="button"
                className={block.promoted ? "tp-promote tp-promote-on" : "tp-promote"}
                aria-pressed={block.promoted}
                onClick={() => togglePromoted(block.id, !block.promoted)}
              >
                {block.promoted ? "In class ✓" : "Use in class"}
              </button>
            </div>
            <textarea
              aria-label={`${block.title} text`}
              value={block.body}
              rows={3}
              onChange={(event) => onUpdatePrep((current) => editBlockBody(current, block.id, event.target.value))}
            />
            {block.scriptureRefs.length > 0 && <p className="tp-anchors">{block.scriptureRefs.join("; ")}</p>}
            {block.quietClassBackup && (
              <p className="tp-quiet-backup">If the class is quiet: {block.quietClassBackup}</p>
            )}
          </li>
        ))}
      </ul>

      <details className="tp-drawer">
        <summary>Learn More</summary>
        <ul>
          {lesson.learnMore.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.label}
              </a>
              <span className="tp-source-origin"> — {source.origin}</span>
            </li>
          ))}
        </ul>
        <p className="tp-hint">Contextual material. Official sources on This Week come first.</p>
      </details>

      <section className="tp-private" aria-labelledby="tp-private-heading">
        <h2 id="tp-private-heading">My notes</h2>
        <p className="tp-private-microcopy">{PRIVATE_MICROCOPY}</p>
        <ul className="tp-private-notes">
          {privateMaterial.notes.map((note) => (
            <li key={note.id}>
              <p>{note.text}</p>
              <div className="tp-note-actions">
                {confirmingNoteId === note.id ? (
                  <>
                    <span className="tp-confirm-copy">Share this private note with the class?</span>
                    <button type="button" className="tp-primary" onClick={() => confirmShareNote(note)}>
                      Yes, share it
                    </button>
                    <button type="button" className="tp-secondary" onClick={() => setConfirmingNoteId(null)}>
                      Keep private
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="tp-secondary" onClick={() => setConfirmingNoteId(note.id)}>
                      Share with class…
                    </button>
                    <button type="button" className="tp-secondary" onClick={() => removePrivateNote(note.id)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="tp-field">
          <label htmlFor="tp-new-note">Add a note (optional)</label>
          <textarea
            id="tp-new-note"
            rows={2}
            value={newNoteText}
            onChange={(event) => setNewNoteText(event.target.value)}
            placeholder="Impressions, questions, thoughts — stays on this device."
          />
          <button type="button" className="tp-secondary" onClick={addPrivateNote}>
            Save note on this device
          </button>
        </div>
      </section>

      <div className="tp-review-bar">
        <p className="tp-hint">
          {promotedCount === 0
            ? "Choose at least one item for class."
            : `${promotedCount} item${promotedCount === 1 ? "" : "s"} chosen for class.`}
          {!intentReady && " Add your one-sentence intent above."}
        </p>
        <button type="button" className="tp-primary" disabled={!intentReady || promotedCount === 0} onClick={onReview}>
          Review → Ready for Class
        </button>
      </div>

      {toast && (
        <div className="tp-toast" role="status">
          <span>{toast.message}</span>
          <button type="button" onClick={toast.undo}>
            Undo
          </button>
        </div>
      )}
    </section>
  );
}
