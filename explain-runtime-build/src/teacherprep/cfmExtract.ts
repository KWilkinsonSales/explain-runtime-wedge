// Pure extraction/parsing helpers for the current-week Come, Follow Me
// adapter. Shared by the Netlify function (server-side fetch of the official
// public source) and unit tests. Nothing here guesses lesson content — it
// only extracts what the official payload actually says, and returns null
// whenever the payload does not clearly identify a current week.

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
};

export interface DateRange {
  start: Date;
  end: Date;
}

// Parses official week labels like "July 13–19", "June 29–July 5", or
// "December 29–January 4" (year rollover) into a concrete date range.
// Returns null for anything it cannot parse unambiguously.
export function parseWeekLabel(label: string, year: number): DateRange | null {
  const cleaned = label.replace(/–|—/g, "–").trim();
  const match = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2})\s*–\s*(?:([A-Za-z]+)\s+)?(\d{1,2})$/);
  if (!match) return null;

  const startMonth = MONTHS[match[1].toLowerCase()];
  if (startMonth === undefined) return null;
  const endMonthName = match[3]?.toLowerCase();
  const endMonth = endMonthName === undefined ? startMonth : MONTHS[endMonthName];
  if (endMonth === undefined) return null;

  const startDay = Number(match[2]);
  const endDay = Number(match[4]);
  if (!Number.isInteger(startDay) || !Number.isInteger(endDay)) return null;

  const start = new Date(Date.UTC(year, startMonth, startDay));
  // A week that ends in an earlier month than it starts wraps into the next year.
  const endYear = endMonth < startMonth ? year + 1 : year;
  const end = new Date(Date.UTC(endYear, endMonth, endDay, 23, 59, 59));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return { start, end };
}

export function rangeCovers(range: DateRange, now: Date): boolean {
  const time = now.getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

export interface ExtractedWeek {
  weekLabel: string;
  title: string;
  scriptureBlock: string;
  uri: string;
}

interface CandidateEntry {
  weekLabel?: string;
  title?: string;
  subtitle?: string;
  uri?: string;
  [key: string]: unknown;
}

// Walks an arbitrary JSON payload from the official study endpoint and
// collects entries that carry a Come, Follow Me study URI plus enough text
// to identify a week. Deliberately conservative: an entry missing any
// required signal is skipped rather than repaired.
export function collectCfmCandidates(payload: unknown): CandidateEntry[] {
  const found: CandidateEntry[] = [];
  const seen = new Set<unknown>();

  function walk(node: unknown): void {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    const record = node as Record<string, unknown>;
    const uri = typeof record.uri === "string" ? record.uri : undefined;
    if (uri && uri.includes("/come-follow-me")) {
      found.push(record as CandidateEntry);
    }
    for (const value of Object.values(record)) walk(value);
  }

  walk(payload);
  return found;
}

function textField(entry: CandidateEntry, keys: string[]): string | null {
  for (const key of keys) {
    const value = entry[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

// From all candidates, returns the one whose week label covers `now`.
// Returns null when no candidate clearly covers the current date.
export function extractCurrentWeek(payload: unknown, now: Date): ExtractedWeek | null {
  for (const entry of collectCfmCandidates(payload)) {
    const uri = typeof entry.uri === "string" ? entry.uri : null;
    const title = textField(entry, ["title", "label", "name"]);
    if (!uri || !title) continue;

    const labelCandidates = [
      textField(entry, ["weekLabel", "subtitle", "dateRange", "eyebrow", "kicker"]),
      title
    ].filter((value): value is string => value !== null);

    for (const label of labelCandidates) {
      const range = parseWeekLabel(label, now.getUTCFullYear());
      if (range && rangeCovers(range, now)) {
        // The scripture block is usually the title itself ("Alma 5–7") with
        // the week label carried separately; when the label parsed from the
        // title, look for a separate scripture text field.
        const scripture =
          label === title ? textField(entry, ["scripture", "subtitle", "description"]) ?? title : title;
        return { weekLabel: label, title, scriptureBlock: scripture, uri };
      }
    }
  }
  return null;
}
