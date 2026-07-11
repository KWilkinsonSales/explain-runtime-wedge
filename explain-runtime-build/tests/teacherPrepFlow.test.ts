import { describe, expect, it } from "vitest";
import { ILLUSTRATIVE_LESSON, ILLUSTRATIVE_LABEL } from "../src/teacherprep/fixture";
import {
  MAX_NON_OPENING_BLOCKS,
  countNonOpeningBlocks,
  createPrepDoc,
  promotedBlocks,
  setBlockPromoted,
  setIntent
} from "../src/teacherprep/prep";
import {
  SnapshotIntentRequiredError,
  SnapshotNeedsPromotedContentError,
  createSnapshot
} from "../src/teacherprep/snapshot";
import { TEACHER_PREP_ENABLED } from "../src/teacherprep/featureFlag";

describe("sixty-second path (logic level)", () => {
  it("This Week fixture is deterministic and labeled illustrative", () => {
    expect(ILLUSTRATIVE_LESSON.illustrative).toBe(true);
    expect(ILLUSTRATIVE_LABEL).toBe("Illustrative — not current official lesson");
    expect(ILLUSTRATIVE_LESSON.officialSources.length).toBeGreaterThan(0);
    for (const source of ILLUSTRATIVE_LESSON.officialSources) {
      expect(source.url).toMatch(/^https:\/\/www\.churchofjesuschrist\.org\//);
    }
  });

  it("fixture respects one opening plus at most five lesson blocks", () => {
    const doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    const openings = doc.blocks.filter((block) => block.kind === "opening");
    expect(openings.length).toBe(1);
    expect(countNonOpeningBlocks(doc)).toBeLessThanOrEqual(MAX_NON_OPENING_BLOCKS);
  });

  it("intent → promote one item → Ready for Class → Teach cards", () => {
    let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    doc = setIntent(doc, "My class needs to feel that change of heart is possible.");
    doc = setBlockPromoted(doc, doc.blocks[1].id, true);

    const snapshot = createSnapshot(doc, ILLUSTRATIVE_LESSON);
    // Title card plus exactly the one promoted item — nothing unpromoted.
    expect(snapshot.cards.length).toBe(2);
    expect(snapshot.cards[0].kind).toBe("title");
    expect(snapshot.cards[1].body).toBe(doc.blocks[1].body);
    expect(snapshot.intent).toBe(doc.intent);
  });

  it("Ready for Class requires the intent sentence", () => {
    let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    doc = setBlockPromoted(doc, doc.blocks[0].id, true);
    expect(() => createSnapshot(doc, ILLUSTRATIVE_LESSON)).toThrow(SnapshotIntentRequiredError);
  });

  it("Ready for Class requires at least one promoted item", () => {
    let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    doc = setIntent(doc, "Intent.");
    expect(() => createSnapshot(doc, ILLUSTRATIVE_LESSON)).toThrow(SnapshotNeedsPromotedContentError);
  });

  it("promotion is per item and reversible", () => {
    let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    const [first, second] = doc.blocks;
    doc = setBlockPromoted(doc, first.id, true);
    doc = setBlockPromoted(doc, second.id, true);
    expect(promotedBlocks(doc).map((block) => block.id)).toEqual([first.id, second.id]);
    doc = setBlockPromoted(doc, first.id, false);
    expect(promotedBlocks(doc).map((block) => block.id)).toEqual([second.id]);
  });

  it("feature flag is a boolean the router can gate on", () => {
    expect(typeof TEACHER_PREP_ENABLED).toBe("boolean");
  });
});
