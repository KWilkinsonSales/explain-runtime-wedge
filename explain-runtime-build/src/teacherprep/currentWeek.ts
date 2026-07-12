import type { WeeklyLesson } from "./types";
import type { KeyValueBackend } from "./store";

// Client side of the current-week Come, Follow Me adapter.
//
// The only trusted source is the server function that fetched the official
// public Church endpoint; this module never infers the current lesson from
// model memory or unofficial calendars. Every payload is re-validated here,
// and anything short of a fully validated current week falls back to the
// deterministic fixture with the required label.

export const CURRENT_WEEK_ENDPOINT = "/.netlify/functions/cfm-current";
export const CURRENT_WEEK_CACHE_KEY = "teacherprep.currentweek.v1";
export const FALLBACK_LABEL = "Illustrative — official current lesson could not be verified.";

const OFFICIAL_HOST = "https://www.churchofjesuschrist.org";

export interface CurrentWeekLesson {
  weekLabel: string;
  dateStartIso: string;
  dateEndIso: string;
  title: string;
  scriptureBlock: string;
  officialUrl: string;
  sourceNote: string;
}

export type CurrentWeekResult =
  | { validated: true; lesson: CurrentWeekLesson; fetchedAt: string }
  | { validated: false; reason: string };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// Strict validation contract. A payload passes only when every field is
// present, the link is on the official host, and the date range covers `now`.
export function validateCurrentWeekPayload(raw: unknown, now: Date): CurrentWeekResult {
  if (!raw || typeof raw !== "object") {
    return { validated: false, reason: "payload was not an object" };
  }
  const record = raw as Record<string, unknown>;
  if (record.validated !== true) {
    const reason = isNonEmptyString(record.reason) ? record.reason : "source reported not validated";
    return { validated: false, reason };
  }
  const lesson = record.lesson as Record<string, unknown> | undefined;
  if (!lesson || typeof lesson !== "object") {
    return { validated: false, reason: "payload had no lesson" };
  }
  for (const field of ["weekLabel", "dateStartIso", "dateEndIso", "title", "scriptureBlock", "officialUrl", "sourceNote"]) {
    if (!isNonEmptyString(lesson[field])) {
      return { validated: false, reason: `lesson field "${field}" missing or empty` };
    }
  }
  const officialUrl = lesson.officialUrl as string;
  if (!officialUrl.startsWith(`${OFFICIAL_HOST}/`)) {
    return { validated: false, reason: "official link was not on churchofjesuschrist.org" };
  }
  const start = Date.parse(lesson.dateStartIso as string);
  const end = Date.parse(lesson.dateEndIso as string);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return { validated: false, reason: "lesson date range was not parseable" };
  }
  if (now.getTime() < start || now.getTime() > end) {
    return { validated: false, reason: "lesson date range does not cover today" };
  }
  return {
    validated: true,
    lesson: lesson as unknown as CurrentWeekLesson,
    fetchedAt: new Date().toISOString()
  };
}

export interface ResolveOptions {
  fetchImpl?: (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;
  backend?: KeyValueBackend | null;
  now?: Date;
}

// Cache holds only the public lesson metadata already shown on screen —
// never anything personal — and is reused only while its own date range
// still covers today.
function readCache(backend: KeyValueBackend | null | undefined, now: Date): CurrentWeekResult | null {
  if (!backend) return null;
  const raw = backend.getItem(CURRENT_WEEK_CACHE_KEY);
  if (!raw) return null;
  try {
    const cached = validateCurrentWeekPayload(JSON.parse(raw), now);
    return cached.validated ? cached : null;
  } catch {
    return null;
  }
}

export async function resolveCurrentWeek(options: ResolveOptions = {}): Promise<CurrentWeekResult> {
  const now = options.now ?? new Date();
  const backend =
    options.backend !== undefined
      ? options.backend
      : typeof window !== "undefined"
        ? window.localStorage
        : null;

  const cached = readCache(backend, now);
  if (cached) return cached;

  const fetchImpl = options.fetchImpl ?? (typeof fetch !== "undefined" ? fetch.bind(globalThis) : null);
  if (!fetchImpl) return { validated: false, reason: "no fetch available" };

  try {
    const response = await fetchImpl(CURRENT_WEEK_ENDPOINT);
    if (!response.ok) {
      return { validated: false, reason: "current-week service unavailable" };
    }
    const payload = await response.json();
    const result = validateCurrentWeekPayload(payload, now);
    if (result.validated && backend) {
      backend.setItem(CURRENT_WEEK_CACHE_KEY, JSON.stringify({ validated: true, lesson: result.lesson }));
    }
    return result;
  } catch (error) {
    return { validated: false, reason: error instanceof Error ? error.message : "fetch failed" };
  }
}

// Builds a WeeklyLesson from validated official metadata. Structure only —
// the editable block scaffolding stays neutral and never invents doctrine,
// commentary, or lesson interpretation for a lesson we have not read.
export function lessonFromCurrentWeek(current: CurrentWeekLesson): WeeklyLesson {
  return {
    id: `cfm-${current.dateStartIso.slice(0, 10)}`,
    illustrative: false,
    title: current.title,
    weekLabel: current.weekLabel,
    coreTruth: "Center the lesson on Jesus Christ.",
    connectionToChrist:
      "Read the official lesson and scripture block, and note where they point your class to the Savior.",
    classContext: "Sunday class · about 40 minutes · mixed ages and backgrounds",
    officialSources: [
      { label: `${current.title} — Come, Follow Me (official lesson)`, url: current.officialUrl },
      { label: "Come, Follow Me — churchofjesuschrist.org", url: `${OFFICIAL_HOST}/study/come-follow-me` }
    ],
    scriptureAnchors: [current.scriptureBlock],
    suggestedBlocks: [
      {
        kind: "opening",
        title: "Opening thought",
        body: "Invite the class into this week's scriptures with one welcoming question of your own.",
        scriptureRefs: []
      },
      {
        kind: "scripture",
        title: "Scripture anchor",
        body: `Read a passage your class needs from ${current.scriptureBlock}.`,
        scriptureRefs: [current.scriptureBlock]
      },
      {
        kind: "discussion",
        title: "Discussion",
        body: "Write one question that invites the class to share what these chapters mean to them.",
        scriptureRefs: [current.scriptureBlock],
        quietClassBackup: "Invite silent reading of one verse, then ask for a single word or phrase that stood out."
      },
      {
        kind: "application",
        title: "Application invitation",
        body: "Invite one small act this week drawn from what the class discovers together.",
        scriptureRefs: []
      },
      {
        kind: "testimony-bridge",
        title: "Testimony bridge (structure only)",
        body: "Space for the teacher's own words about Jesus Christ, if moved to share. Nothing is written for you.",
        scriptureRefs: []
      }
    ],
    learnMore: [
      {
        label: "Come, Follow Me — this week's official lesson",
        url: current.officialUrl,
        origin: "Official lesson (churchofjesuschrist.org)"
      }
    ]
  };
}
