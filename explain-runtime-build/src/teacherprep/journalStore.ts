import type { JournalEntry, PrivateMaterial } from "./types";

// Journal / reflections. Pure helpers over PrivateMaterial so the privacy
// tests can pin the boundary: entries live only in the private store,
// create no network payload, never appear in Teach, and are excluded from
// exports unless the teacher explicitly includes them in a private
// Teacher Packet.

let journalCounter = 0;

export function journalEntries(material: PrivateMaterial): JournalEntry[] {
  return material.journal ?? [];
}

export function addJournalEntry(
  material: PrivateMaterial,
  text: string,
  context: JournalEntry["context"],
  now: Date = new Date()
): PrivateMaterial {
  const trimmed = text.trim();
  if (!trimmed) return material;
  journalCounter += 1;
  const entry: JournalEntry = {
    id: `journal-${journalCounter}-${now.getTime().toString(36)}`,
    text: trimmed,
    createdAt: now.toISOString(),
    context
  };
  return { ...material, journal: [...journalEntries(material), entry] };
}

export function updateJournalEntry(material: PrivateMaterial, id: string, text: string): PrivateMaterial {
  return {
    ...material,
    journal: journalEntries(material).map((entry) => (entry.id === id ? { ...entry, text } : entry))
  };
}

export function removeJournalEntry(material: PrivateMaterial, id: string): PrivateMaterial {
  return {
    ...material,
    journal: journalEntries(material).filter((entry) => entry.id !== id)
  };
}
