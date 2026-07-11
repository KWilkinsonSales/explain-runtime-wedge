import type { BlockKind, ClassSnapshot, PrepDoc, TeachCard, TeachCardKind, WeeklyLesson } from "./types";
import { promotedBlocks } from "./prep";

// Ready for Class boundary. A snapshot is a deep copy of the promoted
// classroom content, frozen at creation. Teach renders snapshots and nothing
// else, so later Prepare edits cannot leak into the classroom until the
// teacher deliberately replaces the snapshot with a new one.
//
// Creating a snapshot confirms the teacher's chosen content only. It says
// nothing about lesson quality or the teacher — there is deliberately no
// notion of "good enough" anywhere in this module.

export class SnapshotIntentRequiredError extends Error {
  constructor() {
    super("A lesson intent sentence is required before Ready for Class.");
    this.name = "SnapshotIntentRequiredError";
  }
}

export class SnapshotNeedsPromotedContentError extends Error {
  constructor() {
    super("Promote at least one item before Ready for Class.");
    this.name = "SnapshotNeedsPromotedContentError";
  }
}

const CARD_KIND_BY_BLOCK: Record<BlockKind, TeachCardKind> = {
  opening: "prompt",
  scripture: "scripture",
  discussion: "question",
  explanation: "prompt",
  application: "application",
  "testimony-bridge": "prompt"
};

let snapshotCounter = 0;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export function createSnapshot(doc: PrepDoc, lesson: WeeklyLesson, now: Date = new Date()): ClassSnapshot {
  if (!doc.intent.trim()) throw new SnapshotIntentRequiredError();
  const blocks = promotedBlocks(doc);
  if (blocks.length === 0) throw new SnapshotNeedsPromotedContentError();

  snapshotCounter += 1;
  const cards: TeachCard[] = [
    {
      id: `card-title-${snapshotCounter}`,
      kind: "title",
      heading: lesson.title,
      body: lesson.coreTruth,
      reference: lesson.scriptureAnchors.join(" · ")
    },
    ...blocks.map((block, index): TeachCard => ({
      id: `card-${snapshotCounter}-${index}`,
      kind: CARD_KIND_BY_BLOCK[block.kind],
      heading: block.title,
      body: block.body,
      reference: block.scriptureRefs.length ? block.scriptureRefs.join("; ") : undefined,
      quietClassBackup: block.quietClassBackup
    }))
  ];

  // Deep copy via JSON round-trip, then freeze: the snapshot shares no
  // object identity with the live PrepDoc and cannot be mutated in place.
  const snapshot: ClassSnapshot = JSON.parse(
    JSON.stringify({
      id: `snapshot-${snapshotCounter}-${now.getTime().toString(36)}`,
      createdAt: now.toISOString(),
      lessonId: doc.lessonId,
      lessonTitle: lesson.title,
      intent: doc.intent,
      cards
    })
  );
  return deepFreeze(snapshot);
}
