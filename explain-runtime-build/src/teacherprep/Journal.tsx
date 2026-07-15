import React, { useEffect, useRef, useState } from "react";
import type { JournalEntry, PrivateMaterial } from "./types";
import { PRIVATE_MICROCOPY } from "./fixture";
import { addJournalEntry, journalEntries, removeJournalEntry } from "./journalStore";

// Device-local journal / reflections. Auto-saves as the teacher types
// (debounced into the private store), deletes locally, and never leaves the
// device — the persistent microcopy states the boundary every time.

interface JournalProps {
  material: PrivateMaterial;
  context: JournalEntry["context"];
  onUpdate: (next: PrivateMaterial) => void;
}

export default function Journal({ material, context, onUpdate }: JournalProps) {
  const [draft, setDraft] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  // The entry id created by this editing session, so continued typing
  // updates the same entry instead of stacking new ones.
  const draftEntryId = useRef<string | null>(null);
  const materialRef = useRef(material);
  materialRef.current = material;

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  function scheduleAutoSave(text: string) {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const current = materialRef.current;
      const trimmed = text.trim();
      if (!trimmed) return;
      let next: PrivateMaterial;
      if (draftEntryId.current) {
        next = {
          ...current,
          journal: journalEntries(current).map((entry) =>
            entry.id === draftEntryId.current ? { ...entry, text: trimmed } : entry
          )
        };
      } else {
        next = addJournalEntry(current, trimmed, context);
        draftEntryId.current = journalEntries(next)[journalEntries(next).length - 1].id;
      }
      onUpdate(next);
      setSavedAt(new Date().toLocaleTimeString());
    }, 600);
  }

  function handleChange(text: string) {
    setDraft(text);
    scheduleAutoSave(text);
  }

  function deleteEntry(id: string) {
    if (draftEntryId.current === id) {
      draftEntryId.current = null;
      setDraft("");
    }
    onUpdate(removeJournalEntry(material, id));
  }

  const entries = journalEntries(material).filter((entry) => entry.context === context);

  return (
    <div className="tp-journal">
      <p className="tp-private-microcopy">{PRIVATE_MICROCOPY}</p>
      <textarea
        aria-label={context === "prepare" ? "Journal while preparing" : "Reflections after class"}
        rows={3}
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={
          context === "prepare"
            ? "Impressions while you prepare — saved automatically on this device."
            : "How did it go? What would you tell yourself for next time? Saved on this device."
        }
      />
      {savedAt && (
        <p className="tp-hint" role="status">
          Saved on this device at {savedAt}.
        </p>
      )}
      {entries.length > 0 && (
        <ul className="tp-private-notes">
          {entries.map((entry) => (
            <li key={entry.id}>
              <p>{entry.text}</p>
              <div className="tp-note-actions">
                <span className="tp-hint">{new Date(entry.createdAt).toLocaleString()}</span>
                <button type="button" className="tp-secondary" onClick={() => deleteEntry(entry.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
