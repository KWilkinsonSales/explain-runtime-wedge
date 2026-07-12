import React, { useEffect, useMemo, useState } from "react";
import type { PrepDoc, PrivateMaterial, WeeklyLesson } from "./types";
import { DISCLAIMER, ILLUSTRATIVE_LESSON } from "./fixture";
import { PrivateStore, SharedStore } from "./store";
import { createPrepDoc } from "./prep";
import { createSnapshot } from "./snapshot";
import { lessonFromCurrentWeek, resolveCurrentWeek, type CurrentWeekResult } from "./currentWeek";
import ThisWeek from "./ThisWeek";
import Prepare from "./Prepare";
import ReadyReview from "./ReadyReview";
import Teach from "./Teach";
import Journal from "./Journal";
import "./teacherprep.css";

type View = "this-week" | "prepare" | "review" | "teach" | "reflect";

export default function TeacherPrepApp() {
  const sharedStore = useMemo(() => new SharedStore(), []);
  const privateStore = useMemo(() => new PrivateStore(), []);
  const [shared, setShared] = useState(() => sharedStore.load());
  const [privateState, setPrivateState] = useState(() => privateStore.load());
  const [view, setView] = useState<View>("this-week");
  const [currentWeek, setCurrentWeek] = useState<CurrentWeekResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveCurrentWeek().then((result) => {
      if (!cancelled) setCurrentWeek(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // This Week shows the validated current lesson when the official source
  // verified, and the labeled fixture otherwise. Once preparation starts, the
  // lesson is pinned into the shared store so Prepare/Teach never shift
  // underneath the teacher.
  const resolvedLesson: WeeklyLesson =
    currentWeek?.validated === true ? lessonFromCurrentWeek(currentWeek.lesson) : ILLUSTRATIVE_LESSON;
  const lesson: WeeklyLesson = shared.prep ? (shared.lesson ?? ILLUSTRATIVE_LESSON) : resolvedLesson;

  const privateMaterial: PrivateMaterial = privateState.material ?? { lessonId: lesson.id, notes: [] };

  function saveShared(next: typeof shared) {
    setShared(next);
    sharedStore.save(next);
  }

  function savePrivate(material: PrivateMaterial) {
    const next = { material };
    setPrivateState(next);
    privateStore.save(next);
  }

  function startPreparation() {
    if (!shared.prep) saveShared({ ...shared, prep: createPrepDoc(resolvedLesson), lesson: resolvedLesson });
    setView("prepare");
  }

  function updatePrep(updater: (current: PrepDoc) => PrepDoc) {
    setShared((current) => {
      if (!current.prep) return current;
      const next = { ...current, prep: updater(current.prep) };
      sharedStore.save(next);
      return next;
    });
  }

  function confirmReady() {
    if (!shared.prep) return;
    const snapshot = createSnapshot(shared.prep, lesson);
    saveShared({ ...shared, activeSnapshot: snapshot });
    setView("teach");
  }

  const teachAvailable = shared.activeSnapshot !== null;

  return (
    <div className={view === "teach" ? "tp-shell tp-shell-teach" : "tp-shell"}>
      {view !== "teach" && (
        <nav className="tp-nav" aria-label="Teacher states">
          <button
            type="button"
            aria-current={view === "this-week" ? "page" : undefined}
            onClick={() => setView("this-week")}
          >
            This Week
          </button>
          <button
            type="button"
            aria-current={view === "prepare" || view === "review" ? "page" : undefined}
            onClick={() => (shared.prep ? setView("prepare") : startPreparation())}
          >
            Prepare
          </button>
          <button
            type="button"
            aria-current={undefined}
            disabled={!teachAvailable}
            onClick={() => setView("teach")}
          >
            Teach
          </button>
        </nav>
      )}

      {view === "this-week" && (
        <ThisWeek
          lesson={lesson}
          currentWeek={currentWeek}
          prep={shared.prep}
          activeSnapshot={shared.activeSnapshot}
          onStartPreparation={startPreparation}
          onOpenTeach={() => setView("teach")}
        />
      )}

      {view === "prepare" && shared.prep && (
        <Prepare
          lesson={lesson}
          prep={shared.prep}
          privateMaterial={privateMaterial}
          onUpdatePrep={updatePrep}
          onUpdatePrivate={savePrivate}
          onReview={() => setView("review")}
        />
      )}

      {view === "review" && shared.prep && (
        <ReadyReview
          lesson={lesson}
          prep={shared.prep}
          privateMaterial={privateMaterial}
          activeSnapshot={shared.activeSnapshot}
          onConfirmReady={confirmReady}
          onBackToPrepare={() => setView("prepare")}
          onOpenTeach={() => setView("teach")}
        />
      )}

      {view === "teach" && shared.activeSnapshot && (
        <Teach snapshot={shared.activeSnapshot} onEndLesson={() => setView("reflect")} />
      )}
      {view === "teach" && !shared.activeSnapshot && (
        <section className="tp-screen">
          <p>No class snapshot yet. Prepare your lesson, then choose Review → Ready for Class.</p>
          <button type="button" className="tp-primary" onClick={() => setView("this-week")}>
            Back to This Week
          </button>
        </section>
      )}

      {view === "reflect" && (
        <section className="tp-screen" aria-labelledby="tp-reflect-heading">
          <h1 id="tp-reflect-heading">After class</h1>
          <p className="tp-hint">Entirely optional. A quiet moment for your own reflections.</p>
          <section className="tp-private">
            <Journal material={privateMaterial} context="after-teach" onUpdate={savePrivate} />
          </section>
          <div className="tp-actions">
            <button type="button" className="tp-primary" onClick={() => setView("this-week")}>
              Done
            </button>
          </div>
        </section>
      )}

      {view !== "teach" && <footer className="tp-disclaimer">{DISCLAIMER}</footer>}
    </div>
  );
}
