import { describe, expect, it } from "vitest";
import { collectCfmCandidates, extractCurrentWeek, parseWeekLabel, rangeCovers } from "../src/teacherprep/cfmExtract";
import {
  FALLBACK_LABEL,
  CURRENT_WEEK_CACHE_KEY,
  lessonFromCurrentWeek,
  resolveCurrentWeek,
  validateCurrentWeekPayload,
  type CurrentWeekLesson
} from "../src/teacherprep/currentWeek";
import { createMemoryBackend } from "../src/teacherprep/store";

const NOW = new Date("2026-07-15T12:00:00Z");

const VALID_LESSON: CurrentWeekLesson = {
  weekLabel: "July 13–19",
  dateStartIso: "2026-07-13T00:00:00.000Z",
  dateEndIso: "2026-07-19T23:59:59.000Z",
  title: "Alma 30–31",
  scriptureBlock: "Alma 30–31",
  officialUrl: "https://www.churchofjesuschrist.org/study/come-follow-me/week-29",
  sourceNote: "Fetched from the official public study endpoint"
};

describe("week label parsing", () => {
  it("parses a same-month range", () => {
    const range = parseWeekLabel("July 13–19", 2026)!;
    expect(range.start.toISOString()).toContain("2026-07-13");
    expect(range.end.toISOString()).toContain("2026-07-19");
  });

  it("parses a cross-month range", () => {
    const range = parseWeekLabel("June 29–July 5", 2026)!;
    expect(range.start.toISOString()).toContain("2026-06-29");
    expect(range.end.toISOString()).toContain("2026-07-05");
  });

  it("parses a year-rollover range", () => {
    const range = parseWeekLabel("December 29–January 4", 2026)!;
    expect(range.end.toISOString()).toContain("2027-01-04");
  });

  it("rejects labels it cannot parse unambiguously", () => {
    expect(parseWeekLabel("Sometime soon", 2026)).toBeNull();
    expect(parseWeekLabel("Julember 1–2", 2026)).toBeNull();
  });

  it("rangeCovers checks inclusive bounds", () => {
    const range = parseWeekLabel("July 13–19", 2026)!;
    expect(rangeCovers(range, NOW)).toBe(true);
    expect(rangeCovers(range, new Date("2026-07-20T12:00:00Z"))).toBe(false);
  });
});

describe("official payload extraction", () => {
  const officialPayload = {
    content: {
      items: [
        { uri: "/study/come-follow-me/week-28", title: "Alma 23–29", subtitle: "July 6–12" },
        { uri: "/study/come-follow-me/week-29", title: "Alma 30–31", subtitle: "July 13–19" },
        { uri: "/study/other/unrelated", title: "Not a lesson" }
      ]
    }
  };

  it("collects only come-follow-me candidates", () => {
    expect(collectCfmCandidates(officialPayload).length).toBe(2);
  });

  it("extracts exactly the week covering today", () => {
    const week = extractCurrentWeek(officialPayload, NOW)!;
    expect(week.title).toBe("Alma 30–31");
    expect(week.weekLabel).toBe("July 13–19");
    expect(week.uri).toBe("/study/come-follow-me/week-29");
  });

  it("returns null when no entry covers today (falls back, never guesses)", () => {
    expect(extractCurrentWeek(officialPayload, new Date("2026-09-01T00:00:00Z"))).toBeNull();
    expect(extractCurrentWeek({ nothing: true }, NOW)).toBeNull();
  });
});

describe("client validation contract", () => {
  it("accepts a fully valid payload covering today", () => {
    const result = validateCurrentWeekPayload({ validated: true, lesson: VALID_LESSON }, NOW);
    expect(result.validated).toBe(true);
  });

  it("rejects payloads with missing fields, wrong host, or stale dates", () => {
    for (const bad of [
      { validated: true, lesson: { ...VALID_LESSON, title: "" } },
      { validated: true, lesson: { ...VALID_LESSON, officialUrl: "https://example.com/lesson" } },
      { validated: true, lesson: { ...VALID_LESSON, dateEndIso: "2026-07-01T00:00:00.000Z", dateStartIso: "2026-06-25T00:00:00.000Z" } },
      { validated: false, reason: "official source responded 503" },
      null,
      "text"
    ]) {
      expect(validateCurrentWeekPayload(bad, NOW).validated).toBe(false);
    }
  });
});

describe("resolveCurrentWeek", () => {
  it("returns validated lesson from the endpoint and caches public metadata", async () => {
    const backend = createMemoryBackend();
    const result = await resolveCurrentWeek({
      backend,
      now: NOW,
      fetchImpl: async () => ({ ok: true, json: async () => ({ validated: true, lesson: VALID_LESSON }) })
    });
    expect(result.validated).toBe(true);
    expect(backend.getItem(CURRENT_WEEK_CACHE_KEY)).toContain("Alma 30–31");

    // Second resolve is served from cache without any fetch.
    const cached = await resolveCurrentWeek({
      backend,
      now: NOW,
      fetchImpl: async () => {
        throw new Error("must not fetch when cache covers today");
      }
    });
    expect(cached.validated).toBe(true);
  });

  it("falls back with a reason when the service fails or payload is invalid", async () => {
    const failing = await resolveCurrentWeek({
      backend: createMemoryBackend(),
      now: NOW,
      fetchImpl: async () => ({ ok: false, json: async () => ({}) })
    });
    expect(failing.validated).toBe(false);

    const invalid = await resolveCurrentWeek({
      backend: createMemoryBackend(),
      now: NOW,
      fetchImpl: async () => ({ ok: true, json: async () => ({ validated: true, lesson: { title: "x" } }) })
    });
    expect(invalid.validated).toBe(false);
  });

  it("ignores a cache whose week no longer covers today", async () => {
    const backend = createMemoryBackend();
    backend.setItem(CURRENT_WEEK_CACHE_KEY, JSON.stringify({ validated: true, lesson: VALID_LESSON }));
    const later = await resolveCurrentWeek({
      backend,
      now: new Date("2026-08-01T00:00:00Z"),
      fetchImpl: async () => ({ ok: false, json: async () => ({}) })
    });
    expect(later.validated).toBe(false);
  });
});

describe("lesson built from validated metadata", () => {
  it("uses only official metadata and neutral scaffolding", () => {
    const lesson = lessonFromCurrentWeek(VALID_LESSON);
    expect(lesson.illustrative).toBe(false);
    expect(lesson.title).toBe("Alma 30–31");
    expect(lesson.weekLabel).toBe("July 13–19");
    expect(lesson.scriptureAnchors).toEqual(["Alma 30–31"]);
    expect(lesson.officialSources[0].url).toBe(VALID_LESSON.officialUrl);
    // Structure stays neutral: no invented doctrine or commentary.
    for (const block of lesson.suggestedBlocks) {
      expect(block.body.length).toBeGreaterThan(0);
    }
  });

  it("the required fallback label is exact", () => {
    expect(FALLBACK_LABEL).toBe("Illustrative — official current lesson could not be verified.");
  });
});
