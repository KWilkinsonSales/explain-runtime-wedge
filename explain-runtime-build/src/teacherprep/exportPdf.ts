import type { ClassSnapshot, PrivateNote } from "./types";
import { DISCLAIMER, ILLUSTRATIVE_LABEL } from "./fixture";

// Print/PDF export. Builders are pure (snapshot in, HTML string out) so the
// exclusion of private material is provable in node tests. Private notes are
// excluded from every preset by default; the Teacher Packet alone accepts an
// explicit opt-in, and the caller must hand the notes over deliberately —
// no builder reaches into any store.

export type ExportPreset = "teacher-packet" | "class-handout" | "large-print";

export const EXPORT_PRESETS: { id: ExportPreset; label: string; description: string }[] = [
  { id: "teacher-packet", label: "Teacher Packet", description: "Everything in the snapshot, for the teacher's own use." },
  { id: "class-handout", label: "Class Handout", description: "Compact one-page handout of the class content." },
  { id: "large-print", label: "Large Print / Presentation Backup", description: "One card per page, very large text." }
];

export interface ExportOptions {
  // Teacher Packet only. Default: absent — private material never included.
  includePrivateNotes?: PrivateNote[];
  illustrative?: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BASE_CSS = `
  @page { margin: 1.6cm; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1c1c1c; margin: 2rem; }
  h1 { font-size: 1.6rem; margin: 0 0 0.25rem; }
  h2 { font-size: 1.15rem; margin: 1.2rem 0 0.3rem; }
  p { font-size: 1.05rem; line-height: 1.5; margin: 0.2rem 0; }
  .meta { color: #444; font-size: 0.95rem; }
  .ref { color: #444; font-style: italic; font-size: 0.95rem; }
  .card { page-break-inside: avoid; margin-bottom: 1rem; }
  .disclaimer { margin-top: 2rem; border-top: 1px solid #999; padding-top: 0.6rem; color: #555; font-size: 0.85rem; }
  .illustrative { border: 1px solid #999; padding: 0.4rem 0.6rem; font-size: 0.9rem; color: #555; margin-bottom: 1rem; }
`;

const LARGE_PRINT_CSS = `
  @page { margin: 1.6cm; }
  body { font-family: Georgia, "Times New Roman", serif; color: #111; margin: 2rem; }
  .card { page-break-after: always; display: flex; flex-direction: column; justify-content: center; min-height: 80vh; }
  h1 { font-size: 2.4rem; }
  h2 { font-size: 2rem; margin-bottom: 0.5rem; }
  p { font-size: 2.2rem; line-height: 1.4; }
  .ref { font-size: 1.4rem; color: #333; margin-top: 0.8rem; }
  .meta { font-size: 1.1rem; color: #444; }
  .disclaimer { margin-top: 2rem; color: #555; font-size: 0.9rem; page-break-before: avoid; }
  .illustrative { font-size: 1rem; color: #555; margin-bottom: 1rem; }
`;

function cardsHtml(snapshot: ClassSnapshot, compact: boolean): string {
  return snapshot.cards
    .map((card) => {
      const ref = card.reference ? `<p class="ref">${escapeHtml(card.reference)}</p>` : "";
      const heading = card.kind === "title" ? `<h1>${escapeHtml(card.heading)}</h1>` : `<h2>${escapeHtml(card.heading)}</h2>`;
      const body = compact && card.kind === "title" ? "" : `<p>${escapeHtml(card.body)}</p>`;
      return `<section class="card">${heading}${body}${ref}</section>`;
    })
    .join("\n");
}

export function buildExportHtml(
  snapshot: ClassSnapshot,
  preset: ExportPreset,
  options: ExportOptions = {}
): string {
  const css = preset === "large-print" ? LARGE_PRINT_CSS : BASE_CSS;
  const illustrativeBanner = options.illustrative
    ? `<div class="illustrative">${escapeHtml(ILLUSTRATIVE_LABEL)}</div>`
    : "";

  let privateSection = "";
  if (preset === "teacher-packet" && options.includePrivateNotes && options.includePrivateNotes.length > 0) {
    const notes = options.includePrivateNotes
      .map((note) => `<section class="card"><h2>${escapeHtml(note.label)}</h2><p>${escapeHtml(note.text)}</p></section>`)
      .join("\n");
    privateSection = `<h2>My notes (printed at my request — not part of the class content)</h2>${notes}`;
  }

  const intent =
    preset === "teacher-packet"
      ? `<p class="meta">This week my class needs: ${escapeHtml(snapshot.intent)}</p>`
      : "";

  return [
    `<!doctype html><html lang="en"><head><meta charset="utf-8" />`,
    `<title>${escapeHtml(snapshot.lessonTitle)}</title>`,
    `<style>${css}</style></head><body>`,
    illustrativeBanner,
    intent,
    cardsHtml(snapshot, preset === "class-handout"),
    privateSection,
    `<footer class="disclaimer">${escapeHtml(DISCLAIMER)}</footer>`,
    `</body></html>`
  ].join("\n");
}

// Opens the built HTML in a new window and asks the browser to print it —
// the user lands in the native print dialog, where "Save as PDF" produces
// the downloadable artifact.
export function openPrintWindow(html: string): boolean {
  const printWindow = window.open("", "_blank", "noopener=false");
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
}
