import React, { useState } from "react";
import type { ClassSnapshot } from "./types";

// Teach renders the active Ready for Class snapshot and nothing else.
// It never reads the prep document or private material.

interface TeachProps {
  snapshot: ClassSnapshot;
  onEndLesson: () => void;
}

export default function Teach({ snapshot, onEndLesson }: TeachProps) {
  const [index, setIndex] = useState(0);
  const [neutral, setNeutral] = useState(false);
  const [quietClass, setQuietClass] = useState(false);

  const cards = snapshot.cards;
  const card = cards[Math.min(index, cards.length - 1)];

  if (neutral) {
    return (
      <section className="tp-teach tp-neutral" aria-label="Neutral screen">
        <button type="button" className="tp-teach-control tp-neutral-resume" onClick={() => setNeutral(false)}>
          Resume lesson
        </button>
      </section>
    );
  }

  const showBackup = quietClass && card.quietClassBackup;

  return (
    <section className="tp-teach" aria-labelledby="tp-teach-card-heading">
      <div className="tp-teach-card">
        <p className="tp-teach-kind">{card.heading}</p>
        <p id="tp-teach-card-heading" className="tp-teach-body">
          {showBackup ? card.quietClassBackup : card.body}
        </p>
        {card.reference && !showBackup && <p className="tp-teach-ref">{card.reference}</p>}
      </div>

      <div className="tp-teach-controls" role="group" aria-label="Presentation controls">
        <button
          type="button"
          className="tp-teach-control"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={index === 0}
        >
          Previous
        </button>
        <button
          type="button"
          className="tp-teach-control"
          onClick={() => setIndex((current) => Math.min(cards.length - 1, current + 1))}
          disabled={index >= cards.length - 1}
        >
          Next
        </button>
        <button type="button" className="tp-teach-control tp-neutral-button" onClick={() => setNeutral(true)}>
          Neutral Screen
        </button>
        {card.quietClassBackup && (
          <button
            type="button"
            className="tp-teach-control"
            aria-pressed={quietClass}
            onClick={() => setQuietClass((current) => !current)}
          >
            {quietClass ? "Back to main prompt" : "Quiet class"}
          </button>
        )}
        <label className="tp-teach-jump">
          <span>Go to</span>
          <select
            value={index}
            onChange={(event) => {
              setIndex(Number(event.target.value));
              setQuietClass(false);
            }}
            aria-label="Jump to a section"
          >
            {cards.map((item, itemIndex) => (
              <option key={item.id} value={itemIndex}>
                {item.heading}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="tp-teach-control tp-end" onClick={onEndLesson}>
          End Lesson
        </button>
      </div>
    </section>
  );
}
