import React, { useState } from "react";
import type { WeeklyLesson } from "./types";
import {
  SOURCE_STANDING_LABEL,
  insightNoteFromSource,
  sourcesForLesson,
  type ApprovedSource,
  type SourceStanding
} from "./sources";

// Explore Approved Sources — a calm, optional drawer inside Prepare.
// Official sources lead by default; associated and external context stay
// clearly labeled and subordinate. Two deliberate exits: an insight into the
// teacher's private notes, or a confirmed promotion into class content.

interface ExploreSourcesProps {
  lesson: WeeklyLesson;
  onAddInsight: (source: ApprovedSource, insight: string) => void;
  onPromote: (source: ApprovedSource) => void;
}

const STANDINGS: SourceStanding[] = ["official", "associated", "external"];

export default function ExploreSources({ lesson, onAddInsight, onPromote }: ExploreSourcesProps) {
  const [enabled, setEnabled] = useState<Record<SourceStanding, boolean>>({
    official: true,
    associated: false,
    external: false
  });
  const [insightForId, setInsightForId] = useState<string | null>(null);
  const [insightDraft, setInsightDraft] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const sources = sourcesForLesson(lesson).filter((source) => enabled[source.standing]);

  function toggle(standing: SourceStanding) {
    setEnabled((current) => ({ ...current, [standing]: !current[standing] }));
  }

  function saveInsight(source: ApprovedSource) {
    const text = insightDraft.trim();
    if (!text) return;
    onAddInsight(source, text);
    setInsightDraft("");
    setInsightForId(null);
  }

  function promote(source: ApprovedSource) {
    if (source.standing === "official") {
      onPromote(source);
      return;
    }
    setConfirmingId(source.id);
  }

  return (
    <details className="tp-drawer">
      <summary>Explore Approved Sources</summary>
      <div className="tp-source-filters" role="group" aria-label="Source classes">
        {STANDINGS.map((standing) => (
          <button
            key={standing}
            type="button"
            className={enabled[standing] ? "tp-filter tp-filter-on" : "tp-filter"}
            aria-pressed={enabled[standing]}
            onClick={() => toggle(standing)}
          >
            {SOURCE_STANDING_LABEL[standing]}
          </button>
        ))}
      </div>
      <p className="tp-hint">
        Official sources come first. Associated and external material is context — it may clarify, it never defines
        doctrine, and nothing joins your class content unless you deliberately promote it.
      </p>
      <ul className="tp-source-list">
        {sources.map((source) => (
          <li key={source.id} className={`tp-source tp-source-${source.standing}`}>
            <p className="tp-source-standing">{SOURCE_STANDING_LABEL[source.standing]}</p>
            <h3>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </a>
            </h3>
            <p className="tp-source-note">{source.relevanceNote}</p>
            <div className="tp-note-actions">
              {insightForId === source.id ? (
                <>
                  <textarea
                    aria-label={`Insight from ${source.title}`}
                    rows={2}
                    value={insightDraft}
                    onChange={(event) => setInsightDraft(event.target.value)}
                    placeholder="What stood out? Saved to your private notes on this device."
                  />
                  <button type="button" className="tp-primary" onClick={() => saveInsight(source)}>
                    Save insight privately
                  </button>
                  <button type="button" className="tp-secondary" onClick={() => setInsightForId(null)}>
                    Cancel
                  </button>
                </>
              ) : confirmingId === source.id ? (
                <>
                  <span className="tp-confirm-copy">
                    Add this {SOURCE_STANDING_LABEL[source.standing].toLowerCase()} item to your class content?
                  </span>
                  <button
                    type="button"
                    className="tp-primary"
                    onClick={() => {
                      onPromote(source);
                      setConfirmingId(null);
                    }}
                  >
                    Yes, add it
                  </button>
                  <button type="button" className="tp-secondary" onClick={() => setConfirmingId(null)}>
                    Keep it out
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="tp-secondary" onClick={() => setInsightForId(source.id)}>
                    Add insight to my preparation
                  </button>
                  <button type="button" className="tp-secondary" onClick={() => promote(source)}>
                    Promote to Class…
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
