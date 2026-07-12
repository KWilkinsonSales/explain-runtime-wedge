import { describe, expect, it } from "vitest";
import { ILLUSTRATIVE_LESSON } from "../src/teacherprep/fixture";
import {
  EXTERNAL_CONTEXT_NOTE,
  SOURCE_STANDING_LABEL,
  insightNoteFromSource,
  sourcesForLesson,
  type ApprovedSource
} from "../src/teacherprep/sources";
import {
  SourcePromotionNotConfirmedError,
  createPrepDoc,
  promoteSourceToClass,
  promotedBlocks,
  removeBlock,
  setBlockPromoted,
  setIntent
} from "../src/teacherprep/prep";
import { createSnapshot } from "../src/teacherprep/snapshot";

const EXTERNAL: ApprovedSource = {
  id: "x1",
  standing: "external",
  title: "Historical context",
  relevanceNote: "Background reading.",
  url: "https://example.org/history",
  origin: "General reference (external)"
};

describe("approved source registry", () => {
  const sources = sourcesForLesson(ILLUSTRATIVE_LESSON);

  it("official sources come first", () => {
    const firstNonOfficial = sources.findIndex((source) => source.standing !== "official");
    for (let i = 0; i < firstNonOfficial; i += 1) {
      expect(sources[i].standing).toBe("official");
    }
    expect(sources[0].url).toBe(ILLUSTRATIVE_LESSON.officialSources[0].url);
  });

  it("covers all three source classes with fixed standing labels", () => {
    const standings = new Set(sources.map((source) => source.standing));
    expect(standings).toEqual(new Set(["official", "associated", "external"]));
    expect(SOURCE_STANDING_LABEL.official).toBe("Official");
    expect(SOURCE_STANDING_LABEL.associated).toBe("Associated context");
    expect(SOURCE_STANDING_LABEL.external).toBe("Labeled external context");
  });

  it("every item has standing, title, relevance note, and link", () => {
    for (const source of sources) {
      expect(source.title.length).toBeGreaterThan(0);
      expect(source.relevanceNote.length).toBeGreaterThan(0);
      expect(source.url).toMatch(/^https:\/\//);
    }
  });

  it("external items carry the context-only note (clarify, never define doctrine)", () => {
    for (const source of sources.filter((item) => item.standing === "external")) {
      expect(source.relevanceNote).toContain(EXTERNAL_CONTEXT_NOTE);
    }
  });
});

describe("source promotion boundary", () => {
  it("associated/external promotion requires explicit confirmation", () => {
    const doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    expect(() => promoteSourceToClass(doc, EXTERNAL)).toThrow(SourcePromotionNotConfirmedError);
    expect(() => promoteSourceToClass(doc, EXTERNAL, { confirmed: false })).toThrow(SourcePromotionNotConfirmedError);
  });

  it("a confirmed promotion is visible, labeled with standing, and reversible", () => {
    let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    doc = promoteSourceToClass(doc, EXTERNAL, { confirmed: true });
    const block = doc.blocks.find((item) => item.sourceStanding === "external")!;
    expect(block.promoted).toBe(true);
    expect(block.title).toContain("Labeled external context");
    const demoted = setBlockPromoted(doc, block.id, false);
    expect(promotedBlocks(demoted).some((item) => item.id === block.id)).toBe(false);
    const removed = removeBlock(doc, block.id);
    expect(removed.blocks.some((item) => item.id === block.id)).toBe(false);
  });

  it("no outside source enters Teach without promotion", () => {
    let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    doc = setIntent(doc, "Intent.");
    doc = setBlockPromoted(doc, doc.blocks[1].id, true);
    // Sources merely explored (never promoted) leave zero trace in the snapshot.
    const snapshot = createSnapshot(doc, ILLUSTRATIVE_LESSON);
    expect(JSON.stringify(snapshot)).not.toContain("Labeled external context");
    expect(JSON.stringify(snapshot)).not.toContain("Associated context");
  });

  it("promoted source content flows into the snapshot only after deliberate promotion", () => {
    let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    doc = setIntent(doc, "Intent.");
    doc = promoteSourceToClass(doc, EXTERNAL, { confirmed: true });
    const snapshot = createSnapshot(doc, ILLUSTRATIVE_LESSON);
    expect(JSON.stringify(snapshot)).toContain("Historical context");
  });
});

describe("insights from sources", () => {
  it("land as private notes with provenance, not class content", () => {
    const note = insightNoteFromSource(EXTERNAL, "The trade routes matter here.");
    expect(note.text).toBe("The trade routes matter here.");
    expect(note.label).toContain("Historical context");
    expect(note.label).toContain("Labeled external context");
  });
});
