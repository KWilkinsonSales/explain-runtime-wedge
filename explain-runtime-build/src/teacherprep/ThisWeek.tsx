import React from "react";
import type { ClassSnapshot, PrepDoc, WeeklyLesson } from "./types";
import { ILLUSTRATIVE_LABEL } from "./fixture";
import { FALLBACK_LABEL, type CurrentWeekResult } from "./currentWeek";

interface ThisWeekProps {
  lesson: WeeklyLesson;
  currentWeek: CurrentWeekResult | null;
  prep: PrepDoc | null;
  activeSnapshot: ClassSnapshot | null;
  onStartPreparation: () => void;
  onOpenTeach: () => void;
}

export default function ThisWeek({
  lesson,
  currentWeek,
  prep,
  activeSnapshot,
  onStartPreparation,
  onOpenTeach
}: ThisWeekProps) {
  const validated = currentWeek?.validated === true && !lesson.illustrative;

  return (
    <section className="tp-screen" aria-labelledby="tp-thisweek-heading">
      <h1 id="tp-thisweek-heading">This Week</h1>
      {!validated && (
        <p className="tp-illustrative">{currentWeek === null ? ILLUSTRATIVE_LABEL : FALLBACK_LABEL}</p>
      )}

      <article className="tp-lesson-card">
        <p className="tp-eyebrow">{lesson.weekLabel}</p>
        <h2>{lesson.title}</h2>
        {validated && currentWeek?.validated && (
          <p className="tp-anchors">
            {currentWeek.lesson.scriptureBlock} · <span className="tp-official-mark">Official source verified</span>
          </p>
        )}
        <p className="tp-core-truth">{lesson.coreTruth}</p>
        <p>{lesson.connectionToChrist}</p>

        <ul className="tp-source-chips" aria-label="Official sources">
          {lesson.officialSources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            </li>
          ))}
        </ul>

        <p className="tp-class-context">{lesson.classContext}</p>

        <div className="tp-actions">
          <button type="button" className="tp-primary" onClick={onStartPreparation}>
            {prep ? "Continue Preparation" : "Start Preparation"}
          </button>
          {activeSnapshot && (
            <button type="button" className="tp-secondary" onClick={onOpenTeach}>
              Open Teach
            </button>
          )}
        </div>
        {validated && currentWeek?.validated && (
          <p className="tp-hint">{currentWeek.lesson.sourceNote}</p>
        )}
      </article>
    </section>
  );
}
