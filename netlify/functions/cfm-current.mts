// Resolves the current official Come, Follow Me week from the Church's own
// public study endpoint on churchofjesuschrist.org. Returns strictly
// validated public lesson metadata, or { validated: false, reason } so the
// client falls back to its clearly labeled fixture. Never fetches
// authenticated content, never stores anything, never infers a lesson.

import {
  extractCurrentManualUri,
  extractCurrentWeekFromManualHtml,
  parseWeekLabel
} from "../../explain-runtime-build/src/teacherprep/cfmExtract";

const OFFICIAL_HOST = "https://www.churchofjesuschrist.org";
const CFM_URI = "/study/come-follow-me";
const CFM_URL = `${OFFICIAL_HOST}${CFM_URI}?lang=eng`;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Public metadata; short cache keeps the official source un-hammered.
      "Cache-Control": "public, max-age=3600"
    }
  });
}

export default async function handler(): Promise<Response> {
  const now = new Date();
  try {
    const hubResponse = await fetch(CFM_URL, {
      headers: { accept: "text/html" }
    });
    if (!hubResponse.ok) {
      return json(200, { validated: false, reason: `official source responded ${hubResponse.status}` });
    }
    const manualUri = extractCurrentManualUri(await hubResponse.text(), now.getUTCFullYear());
    if (!manualUri) {
      return json(200, { validated: false, reason: "current-year manual not found on the official page" });
    }
    const manualResponse = await fetch(`${OFFICIAL_HOST}${manualUri}`, { headers: { accept: "text/html" } });
    if (!manualResponse.ok) {
      return json(200, { validated: false, reason: `official manual responded ${manualResponse.status}` });
    }
    const week = extractCurrentWeekFromManualHtml(await manualResponse.text(), now);
    if (!week) {
      return json(200, { validated: false, reason: "no current-week entry found in the official payload" });
    }
    const range = parseWeekLabel(week.weekLabel, now.getUTCFullYear());
    if (!range) {
      return json(200, { validated: false, reason: "current-week entry had an unparseable date label" });
    }
    return json(200, {
      validated: true,
      lesson: {
        weekLabel: week.weekLabel,
        dateStartIso: range.start.toISOString(),
        dateEndIso: range.end.toISOString(),
        title: week.title,
        scriptureBlock: week.scriptureBlock,
        officialUrl: `${OFFICIAL_HOST}${week.uri}`,
        sourceNote: `Fetched from the official public study pages (${CFM_URI}) at ${now.toISOString()}`
      }
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "official source fetch failed";
    return json(200, { validated: false, reason });
  }
}
