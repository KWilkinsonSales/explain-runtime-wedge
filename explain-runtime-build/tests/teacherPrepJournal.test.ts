import { describe, expect, it } from "vitest";
import { ILLUSTRATIVE_LESSON } from "../src/teacherprep/fixture";
import { addJournalEntry, journalEntries, removeJournalEntry, updateJournalEntry } from "../src/teacherprep/journal";
import { PRIVATE_STORE_KEY, PrivateStore, SHARED_STORE_KEY, SharedStore, createMemoryBackend } from "../src/teacherprep/store";
import { createPrepDoc, setBlockPromoted, setIntent } from "../src/teacherprep/prep";
import { createSnapshot } from "../src/teacherprep/snapshot";
import { buildExportHtml } from "../src/teacherprep/exportPdf";
import type { PrivateMaterial } from "../src/teacherprep/types";

const IMPRESSION = "Sacred journal impression after class that must never leave this device.";

function materialWithJournal(): PrivateMaterial {
  let material: PrivateMaterial = { lessonId: ILLUSTRATIVE_LESSON.id, notes: [] };
  material = addJournalEntry(material, IMPRESSION, "after-teach");
  return material;
}

describe("journal helpers", () => {
  it("adds, updates, and deletes entries locally", () => {
    let material = materialWithJournal();
    const entry = journalEntries(material)[0];
    expect(entry.context).toBe("after-teach");
    material = updateJournalEntry(material, entry.id, "Revised.");
    expect(journalEntries(material)[0].text).toBe("Revised.");
    material = removeJournalEntry(material, entry.id);
    expect(journalEntries(material)).toEqual([]);
  });

  it("ignores empty text (nothing is stored)", () => {
    const material = addJournalEntry({ lessonId: "x", notes: [] }, "   ", "prepare");
    expect(journalEntries(material)).toEqual([]);
  });

  it("older private state without a journal field is safe", () => {
    expect(journalEntries({ lessonId: "x", notes: [] })).toEqual([]);
  });
});

describe("journal privacy boundary", () => {
  it("journal text lives only under the private key, never the shared payload", () => {
    const backend = createMemoryBackend();
    new PrivateStore(backend).save({ material: materialWithJournal() });

    let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    doc = setIntent(doc, "Intent.");
    doc = setBlockPromoted(doc, doc.blocks[1].id, true);
    const snapshot = createSnapshot(doc, ILLUSTRATIVE_LESSON);
    new SharedStore(backend).save({ prep: doc, activeSnapshot: snapshot, lesson: ILLUSTRATIVE_LESSON });

    expect(backend.getItem(SHARED_STORE_KEY)).not.toContain(IMPRESSION);
    expect(backend.getItem(PRIVATE_STORE_KEY)).toContain(IMPRESSION);
  });

  it("journal never appears in Teach cards", () => {
    let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    doc = setIntent(doc, "Intent.");
    doc = setBlockPromoted(doc, doc.blocks[1].id, true);
    const snapshot = createSnapshot(doc, ILLUSTRATIVE_LESSON);
    expect(JSON.stringify(snapshot)).not.toContain(IMPRESSION);
  });

  it("journal is excluded from every export by default", () => {
    let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    doc = setIntent(doc, "Intent.");
    doc = setBlockPromoted(doc, doc.blocks[1].id, true);
    const snapshot = createSnapshot(doc, ILLUSTRATIVE_LESSON);
    for (const preset of ["teacher-packet", "class-handout", "large-print"] as const) {
      expect(buildExportHtml(snapshot, preset)).not.toContain(IMPRESSION);
    }
  });

  it("journal reaches only the Teacher Packet, only by explicit inclusion", () => {
    let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    doc = setIntent(doc, "Intent.");
    doc = setBlockPromoted(doc, doc.blocks[1].id, true);
    const snapshot = createSnapshot(doc, ILLUSTRATIVE_LESSON);
    const journalNotes = journalEntries(materialWithJournal()).map((entry) => ({
      id: entry.id,
      label: "Journal (after class)",
      text: entry.text
    }));
    expect(buildExportHtml(snapshot, "teacher-packet", { includePrivateNotes: journalNotes })).toContain(IMPRESSION);
    expect(buildExportHtml(snapshot, "class-handout", { includePrivateNotes: journalNotes })).not.toContain(IMPRESSION);
    expect(buildExportHtml(snapshot, "large-print", { includePrivateNotes: journalNotes })).not.toContain(IMPRESSION);
  });
});
