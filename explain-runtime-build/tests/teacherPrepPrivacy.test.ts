import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { ILLUSTRATIVE_LESSON, PRIVATE_MICROCOPY } from "../src/teacherprep/fixture";
import {
  PRIVATE_STORE_KEY,
  PrivateStore,
  SHARED_STORE_KEY,
  SharedStore,
  createMemoryBackend,
  serializeSharedPayload
} from "../src/teacherprep/store";
import {
  PrivatePromotionNotConfirmedError,
  createPrepDoc,
  promotePrivateNote,
  removeBlock,
  setBlockPromoted,
  setIntent
} from "../src/teacherprep/prep";
import { createSnapshot } from "../src/teacherprep/snapshot";
import { buildExportHtml } from "../src/teacherprep/exportPdf";
import type { PrivateNote } from "../src/teacherprep/types";

const SACRED = "A sacred private impression that must never leave this device.";
const NOTE: PrivateNote = { id: "note-1", label: "My note", text: SACRED };

const TEACHERPREP_DIR = fileURLToPath(new URL("../src/teacherprep", import.meta.url));

function readAllSources(): { file: string; text: string }[] {
  return readdirSync(TEACHERPREP_DIR)
    .filter((file) => /\.(ts|tsx|css)$/.test(file))
    .map((file) => ({ file, text: readFileSync(join(TEACHERPREP_DIR, file), "utf8") }));
}

describe("device-local privacy boundary", () => {
  it("private material lives under its own key and never enters the shared payload", () => {
    const backend = createMemoryBackend();
    const sharedStore = new SharedStore(backend);
    const privateStore = new PrivateStore(backend);

    privateStore.save({ material: { lessonId: ILLUSTRATIVE_LESSON.id, notes: [NOTE] } });

    let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    doc = setIntent(doc, "Intent.");
    doc = setBlockPromoted(doc, doc.blocks[1].id, true);
    const snapshot = createSnapshot(doc, ILLUSTRATIVE_LESSON);
    sharedStore.save({ prep: doc, activeSnapshot: snapshot });

    const sharedPayload = backend.getItem(SHARED_STORE_KEY)!;
    expect(sharedPayload).not.toContain(SACRED);
    expect(serializeSharedPayload({ prep: doc, activeSnapshot: snapshot })).not.toContain(SACRED);

    // The private text exists — only under the private key.
    expect(backend.getItem(PRIVATE_STORE_KEY)).toContain(SACRED);
    expect(PRIVATE_STORE_KEY).not.toBe(SHARED_STORE_KEY);
  });

  it("Teach cards never contain unpromoted private material", () => {
    let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    doc = setIntent(doc, "Intent.");
    doc = setBlockPromoted(doc, doc.blocks[1].id, true);
    const snapshot = createSnapshot(doc, ILLUSTRATIVE_LESSON);
    expect(JSON.stringify(snapshot)).not.toContain(SACRED);
  });

  it("promoting private material requires explicit confirmation", () => {
    const doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    expect(() => promotePrivateNote(doc, NOTE, { confirmed: false })).toThrow(
      PrivatePromotionNotConfirmedError
    );
  });

  it("confirmed private promotion is visible, labeled, and reversible", () => {
    let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    doc = promotePrivateNote(doc, NOTE, { confirmed: true });
    const promoted = doc.blocks.find((block) => block.fromPrivate);
    expect(promoted).toBeDefined();
    expect(promoted!.body).toBe(SACRED);
    expect(promoted!.promoted).toBe(true);

    // Reversible two ways: demote, or remove entirely.
    const demoted = setBlockPromoted(doc, promoted!.id, false);
    expect(demoted.blocks.find((block) => block.id === promoted!.id)!.promoted).toBe(false);
    const removed = removeBlock(doc, promoted!.id);
    expect(removed.blocks.some((block) => block.id === promoted!.id)).toBe(false);
  });

  it("exports exclude private material by default, on every preset", () => {
    let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    doc = setIntent(doc, "Intent.");
    doc = setBlockPromoted(doc, doc.blocks[1].id, true);
    const snapshot = createSnapshot(doc, ILLUSTRATIVE_LESSON);

    for (const preset of ["teacher-packet", "class-handout", "large-print"] as const) {
      expect(buildExportHtml(snapshot, preset)).not.toContain(SACRED);
    }
  });

  it("only the Teacher Packet can include private notes, and only by explicit opt-in", () => {
    let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
    doc = setIntent(doc, "Intent.");
    doc = setBlockPromoted(doc, doc.blocks[1].id, true);
    const snapshot = createSnapshot(doc, ILLUSTRATIVE_LESSON);

    expect(buildExportHtml(snapshot, "teacher-packet", { includePrivateNotes: [NOTE] })).toContain(SACRED);
    // Other presets ignore the option even if a caller passes it.
    expect(buildExportHtml(snapshot, "class-handout", { includePrivateNotes: [NOTE] })).not.toContain(SACRED);
    expect(buildExportHtml(snapshot, "large-print", { includePrivateNotes: [NOTE] })).not.toContain(SACRED);
  });

  it("the teacherprep module contains no network primitives at all", () => {
    const banned = [/\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /\bWebSocket\b/, /EventSource/, /navigator\.serviceWorker/];
    for (const { file, text } of readAllSources()) {
      for (const pattern of banned) {
        expect(pattern.test(text), `${file} must not match ${pattern}`).toBe(false);
      }
    }
  });

  it("the persistent private microcopy is exactly the required line", () => {
    expect(PRIVATE_MICROCOPY).toBe("Private · stays on this device · not uploaded or shared");
  });
});
