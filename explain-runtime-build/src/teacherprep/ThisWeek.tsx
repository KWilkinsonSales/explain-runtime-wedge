import React from "react";
import type { ClassSnapshot, PrepDoc, WeeklyLesson } from "./types";
import { ILLUSTRATIVE_LABEL } from "./fixture";

interface ThisWeekProps {
  lesson: WeeklyLesson;
  prep: PrepDoc | null;
  activeSnapshot: ClassSnapshot | null;
  onStartPreparation: () => void;
  onOpenTeach: () => void;
}

export default function ThisWeek({ lesson, prep, activeSnapshot, onStartPreparation, onOpenTeach }: ThisWeekProps) {
  return (
    <section className="tp-screen" aria-labelledby="tp-thisweek-heading">
      <h1 id="tp-thisweek-heading">This Week</h1>
      {lesson.illustrative && <p className="tp-illustrative">{ILLUSTRATIVE_LABEL}</p>}

      <article className="tp-lesson-card">
        <p className="tp-eyebrow">{lesson.weekLabel}</p>
        <h2>{lesson.title}</h2>
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
      </article>
    </section>
  );
}
