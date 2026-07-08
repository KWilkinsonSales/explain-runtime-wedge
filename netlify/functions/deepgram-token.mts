// Mints a short-lived Deepgram API key so the browser can open a streaming
// WebSocket without ever seeing the master key. Requires DEEPGRAM_API_KEY in
// the Netlify environment (and optionally DEEPGRAM_PROJECT_ID; when absent,
// the first project on the account is used).

const DEEPGRAM_API = "https://api.deepgram.com/v1";
const TOKEN_TTL_SECONDS = 120;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return json(405, { error: "POST only." });
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return json(503, { error: "Live transcription is not configured (DEEPGRAM_API_KEY missing)." });
  }

  const auth = { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" };

  let projectId = process.env.DEEPGRAM_PROJECT_ID;
  if (!projectId) {
    const projectsResponse = await fetch(`${DEEPGRAM_API}/projects`, { headers: auth });
    if (!projectsResponse.ok) {
      return json(502, { error: `Deepgram projects lookup failed (${projectsResponse.status}).` });
    }
    const projects = (await projectsResponse.json()) as { projects?: Array<{ project_id?: string }> };
    projectId = projects.projects?.[0]?.project_id;
    if (!projectId) {
      return json(502, { error: "No Deepgram project found for this API key." });
    }
  }

  const keyResponse = await fetch(`${DEEPGRAM_API}/projects/${projectId}/keys`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      comment: "companion-v1.1 ephemeral streaming key",
      scopes: ["usage:write"],
      time_to_live_in_seconds: TOKEN_TTL_SECONDS,
    }),
  });
  if (!keyResponse.ok) {
    return json(502, { error: `Deepgram key mint failed (${keyResponse.status}).` });
  }

  const minted = (await keyResponse.json()) as { key?: string };
  if (!minted.key) {
    return json(502, { error: "Deepgram did not return a key." });
  }

  return json(200, { key: minted.key, expires_in: TOKEN_TTL_SECONDS });
};
