import type { PrivateNote, WeeklyLesson } from "./types";

// Explore Approved Sources registry. Three source classes with fixed
// standing labels; official sources always come first. Associated and
// external material is context only — it may clarify but never defines
// doctrine, and nothing here reaches the classroom without the teacher's
// deliberate promotion in Prepare.

export type SourceStanding = "official" | "associated" | "external";

export const SOURCE_STANDING_LABEL: Record<SourceStanding, string> = {
  official: "Official",
  associated: "Associated context",
  external: "Labeled external context"
};

export const EXTERNAL_CONTEXT_NOTE =
  "Context only — external material may clarify background but never defines doctrine.";

export interface ApprovedSource {
  id: string;
  standing: SourceStanding;
  title: string;
  relevanceNote: string;
  url: string;
  origin: string;
}

const OFFICIAL_HOST = "https://www.churchofjesuschrist.org";

const BASE_OFFICIAL: ApprovedSource[] = [
  {
    id: "official-scriptures",
    standing: "official",
    title: "Scriptures",
    relevanceNote: "Read this week's scripture block in the official text.",
    url: `${OFFICIAL_HOST}/study/scriptures`,
    origin: "churchofjesuschrist.org"
  },
  {
    id: "official-cfm",
    standing: "official",
    title: "Come, Follow Me",
    relevanceNote: "The official weekly lesson and study helps.",
    url: `${OFFICIAL_HOST}/study/come-follow-me`,
    origin: "churchofjesuschrist.org"
  },
  {
    id: "official-conference",
    standing: "official",
    title: "General Conference",
    relevanceNote: "Recent prophetic and apostolic teaching related to this week's themes.",
    url: `${OFFICIAL_HOST}/study/general-conference`,
    origin: "churchofjesuschrist.org"
  },
  {
    id: "official-manuals",
    standing: "official",
    title: "Official manuals",
    relevanceNote: "Institute and seminary manuals for scripture background.",
    url: `${OFFICIAL_HOST}/study/manual`,
    origin: "churchofjesuschrist.org"
  },
  {
    id: "official-gospel-topics",
    standing: "official",
    title: "Gospel Topics",
    relevanceNote: "Short official topic pages, including Gospel Topics essays.",
    url: `${OFFICIAL_HOST}/study/manual/gospel-topics`,
    origin: "churchofjesuschrist.org"
  },
  {
    id: "official-handbook",
    standing: "official",
    title: "General Handbook (public)",
    relevanceNote: "Public guidance on teaching in the Savior's way and class settings.",
    url: `${OFFICIAL_HOST}/study/manual/general-handbook`,
    origin: "churchofjesuschrist.org"
  }
];

const BASE_ASSOCIATED: ApprovedSource[] = [
  {
    id: "associated-byu-speeches",
    standing: "associated",
    title: "BYU Speeches",
    relevanceNote: "Devotional addresses from Church-owned universities; secondary to official sources.",
    url: "https://speeches.byu.edu",
    origin: "BYU (Church-owned institution)"
  },
  {
    id: "associated-rsc",
    standing: "associated",
    title: "Religious Studies Center",
    relevanceNote: "Scholarly gospel studies published at BYU; secondary to official sources.",
    url: "https://rsc.byu.edu",
    origin: "BYU Religious Studies Center"
  },
  {
    id: "associated-byu-scriptures",
    standing: "associated",
    title: "BYU Scripture Citation Index",
    relevanceNote: "Where General Conference speakers have cited this week's chapters.",
    url: "https://scriptures.byu.edu",
    origin: "BYU (Church-owned institution)"
  }
];

const BASE_EXTERNAL: ApprovedSource[] = [
  {
    id: "external-historical",
    standing: "external",
    title: "Historical context",
    relevanceNote: "Period history that can situate the chapters. " + EXTERNAL_CONTEXT_NOTE,
    url: "https://en.wikipedia.org/wiki/Book_of_Mormon",
    origin: "General reference (external)"
  },
  {
    id: "external-geographic",
    standing: "external",
    title: "Geography and maps",
    relevanceNote: "Maps and geography discussions. " + EXTERNAL_CONTEXT_NOTE,
    url: "https://en.wikipedia.org/wiki/Book_of_Mormon_geography",
    origin: "General reference (external)"
  },
  {
    id: "external-linguistic",
    standing: "external",
    title: "Language and translation",
    relevanceNote: "Linguistic and translation background. " + EXTERNAL_CONTEXT_NOTE,
    url: "https://en.wikipedia.org/wiki/Book_of_Mormon#Translation",
    origin: "General reference (external)"
  },
  {
    id: "external-pedagogical",
    standing: "external",
    title: "Teaching methods",
    relevanceNote: "General classroom facilitation and discussion technique. " + EXTERNAL_CONTEXT_NOTE,
    url: "https://en.wikipedia.org/wiki/Discussion_group",
    origin: "General reference (external)"
  }
];

// Official first, always; lesson-specific official links (this week's actual
// lesson and scripture chapters) lead the list.
export function sourcesForLesson(lesson: WeeklyLesson): ApprovedSource[] {
  const lessonOfficial: ApprovedSource[] = lesson.officialSources.map((source, index) => ({
    id: `lesson-official-${index}`,
    standing: "official",
    title: source.label,
    relevanceNote: "This week's lesson material.",
    url: source.url,
    origin: "churchofjesuschrist.org"
  }));
  const lessonAssociated: ApprovedSource[] = lesson.learnMore.map((source, index) => ({
    id: `lesson-associated-${index}`,
    standing: source.url.startsWith(OFFICIAL_HOST) ? "official" : "associated",
    title: source.label,
    relevanceNote: source.origin,
    url: source.url,
    origin: source.origin
  }));
  return [...lessonOfficial, ...BASE_OFFICIAL, ...lessonAssociated, ...BASE_ASSOCIATED, ...BASE_EXTERNAL];
}

let insightCounter = 0;

// "Add insight to my preparation" — lands in the teacher's device-local
// private notes with its provenance, never directly in class content.
export function insightNoteFromSource(source: ApprovedSource, insight: string): PrivateNote {
  insightCounter += 1;
  return {
    id: `insight-${insightCounter}-${Date.now().toString(36)}`,
    label: `Insight from ${source.title} (${SOURCE_STANDING_LABEL[source.standing]})`,
    text: insight
  };
}
