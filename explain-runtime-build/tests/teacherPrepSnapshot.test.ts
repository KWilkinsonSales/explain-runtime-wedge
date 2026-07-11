import { describe, expect, it } from "vitest";
import { ILLUSTRATIVE_LESSON } from "../src/teacherprep/fixture";
import { createPrepDoc, editBlockBody, setBlockPromoted, setIntent } from "../src/teacherprep/prep";
import { createSnapshot } from "../src/teacherprep/snapshot";

function readyDoc() {
  let doc = createPrepDoc(ILLUSTRATIVE_LESSON);
  doc = setIntent(doc, "Original intent.");
  doc = setBlockPromoted(doc, doc.blocks[1].id, true);
  return doc;
}

describe("Ready for Class snapshot stability", () => {
  it("Teach content comes from the snapshot, not the live prep doc", () => {
    const doc = readyDoc();
    const snapshot = createSnapshot(doc, ILLUSTRATIVE_LESSON);
    const teachBodies = snapshot.cards.map((card) => card.body);
    expect(teachBodies).toContain(doc.blocks[1].body);
  });

  it("editing Prepare after snapshot creation does not alter the snapshot", () => {
    let doc = readyDoc();
    const snapshot = createSnapshot(doc, ILLUSTRATIVE_LESSON);
    const cardBodyBefore = snapshot.cards[1].body;

    doc = editBlockBody(doc, doc.blocks[1].id, "A completely rewritten block after Ready for Class.");
    doc = setIntent(doc, "A new intent.");
    doc = setBlockPromoted(doc, doc.blocks[2].id, true);

    expect(snapshot.cards[1].body).toBe(cardBodyBefore);
    expect(snapshot.cards.length).toBe(2);
    expect(snapshot.intent).toBe("Original intent.");
  });

  it("the snapshot is deeply frozen — in-place mutation cannot succeed", () => {
    const snapshot = createSnapshot(readyDoc(), ILLUSTRATIVE_LESSON);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.cards)).toBe(true);
    expect(Object.isFrozen(snapshot.cards[0])).toBe(true);
    expect(() => {
      (snapshot.cards[0] as { body: string }).body = "tampered";
    }).toThrow(TypeError);
  });

  it("replacing the snapshot is deliberate: a new snapshot with new identity and content", () => {
    let doc = readyDoc();
    const first = createSnapshot(doc, ILLUSTRATIVE_LESSON);

    doc = editBlockBody(doc, doc.blocks[1].id, "Revised for the second snapshot.");
    const second = createSnapshot(doc, ILLUSTRATIVE_LESSON);

    expect(second.id).not.toBe(first.id);
    expect(second.cards[1].body).toBe("Revised for the second snapshot.");
    // The first snapshot is untouched by the replacement.
    expect(first.cards[1].body).not.toBe("Revised for the second snapshot.");
  });

  it("shares no object identity with the prep doc", () => {
    const doc = readyDoc();
    const snapshot = createSnapshot(doc, ILLUSTRATIVE_LESSON);
    for (const card of snapshot.cards) {
      for (const block of doc.blocks) {
        expect(card as unknown).not.toBe(block);
        expect(card.id).not.toBe(block.id);
      }
    }
  });
});
