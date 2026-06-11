export interface Env {
  DB: D1Database;
  OPENAI_API_KEY: string;
  OPENAI_REALTIME_MODEL?: string;
  ALLOWED_ORIGIN?: string;
}

type Json = Record<string, unknown>;
const json = (body: Json, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });

function cors(env: Env): HeadersInit {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN ?? "*",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  };
}

function token(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(env) });
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);

    try {
      if (request.method === "POST" && url.pathname === "/api/invites") {
        const body = await request.json<Record<string, unknown>>();
        const inviteToken = token();
        const ttlSeconds = Number(body.ttlSeconds ?? 604800);
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
        await env.DB.prepare(`INSERT INTO invitations
          (token, mission_type, mission_version, recipient_display_name, role_or_context, approved_context, status, created_at, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, 'WAITING', datetime('now'), ?)`)
          .bind(
            inviteToken,
            body.missionType ?? "explain_adl",
            body.missionVersion ?? "0.1.0",
            body.recipientDisplayName ?? null,
            body.roleOrContext ?? null,
            body.approvedContext ?? null,
            expiresAt
          ).run();
        return json({ token: inviteToken, inviteUrl: `${url.origin}/invite/${inviteToken}` }, 201, cors(env));
      }

      if (request.method === "GET" && parts[0] === "api" && parts[1] === "invites" && parts[2]) {
        const row = await env.DB.prepare("SELECT * FROM invitations WHERE token = ?").bind(parts[2]).first();
        if (!row) return json({ error: "not_found" }, 404, cors(env));
        return json({ invitation: row, closed: row.status === "CLOSED" }, 200, cors(env));
      }

      if (request.method === "POST" && url.pathname === "/api/realtime/session") {
        const inviteToken = url.searchParams.get("token");
        if (!inviteToken) return json({ error: "missing_token" }, 400, cors(env));
        const invite = await env.DB.prepare("SELECT * FROM invitations WHERE token = ?").bind(inviteToken).first();
        if (!invite) return json({ error: "invalid_token" }, 404, cors(env));
        if (invite.status === "CLOSED") return json({ error: "mission_closed" }, 409, cors(env));
        const model = env.OPENAI_REALTIME_MODEL ?? "gpt-realtime";
        const upstream = await fetch("https://api.openai.com/v1/realtime/sessions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ model, modalities: ["audio", "text"] })
        });
        const payload = await upstream.json<Json>();
        if (!upstream.ok) return json({ error: "realtime_session_failed", detail: payload }, 502, cors(env));
        await env.DB.prepare("UPDATE invitations SET status = 'RUNNING', opened_at = COALESCE(opened_at, datetime('now')) WHERE token = ? AND status = 'WAITING'")
          .bind(inviteToken).run();
        return json({ ...payload, model }, 200, cors(env));
      }

      if (request.method === "POST" && parts[0] === "api" && parts[1] === "missions" && parts[2] && parts[3] === "state") {
        const missionToken = parts[2];
        const current = await env.DB.prepare("SELECT status FROM invitations WHERE token = ?").bind(missionToken).first<{status:string}>();
        if (!current) return json({ error: "not_found" }, 404, cors(env));
        if (current.status === "CLOSED") return json({ status: "CLOSED", terminal: true }, 200, cors(env));
        const body = await request.json<Json>();
        await env.DB.prepare("INSERT INTO mission_events (token, event_type, payload, created_at) VALUES (?, ?, ?, datetime('now'))")
          .bind(missionToken, body.eventType ?? "state.patch", JSON.stringify(body.payload ?? body)).run();
        return json({ ok: true }, 202, cors(env));
      }

      if (request.method === "POST" && parts[0] === "api" && parts[1] === "missions" && parts[2] && parts[3] === "receipt") {
        const missionToken = parts[2];
        const body = await request.json<{receipt?: Json; state?: Json}>();
        const receiptPayload = JSON.stringify(body.receipt ?? {});
        await env.DB.prepare(`INSERT INTO receipts (token, receipt_json, created_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(token) DO NOTHING`).bind(missionToken, receiptPayload).run();
        await env.DB.batch([
          env.DB.prepare("UPDATE invitations SET status = 'CLOSED', closed_at = COALESCE(closed_at, datetime('now')), approved_context = NULL, role_or_context = NULL WHERE token = ?").bind(missionToken),
          env.DB.prepare("DELETE FROM mission_events WHERE token = ?").bind(missionToken)
        ]);
        const receipt = await env.DB.prepare("SELECT receipt_json, created_at FROM receipts WHERE token = ?").bind(missionToken).first();
        return json({ receipt: receipt ? JSON.parse(String(receipt.receipt_json)) : null, closed: true }, 200, cors(env));
      }

      if (request.method === "GET" && parts[0] === "api" && parts[1] === "missions" && parts[2] && parts[3] === "receipt") {
        const receipt = await env.DB.prepare("SELECT receipt_json, created_at FROM receipts WHERE token = ?").bind(parts[2]).first();
        if (!receipt) return json({ error: "not_found" }, 404, cors(env));
        return json({ receipt: JSON.parse(String(receipt.receipt_json)), createdAt: receipt.created_at }, 200, cors(env));
      }

      if (request.method === "GET" && parts[0] === "api" && parts[1] === "acceptance" && parts[2]) {
        const invite = await env.DB.prepare("SELECT status, opened_at, closed_at, approved_context, role_or_context FROM invitations WHERE token = ?").bind(parts[2]).first();
        const receiptCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM receipts WHERE token = ?").bind(parts[2]).first<{count:number}>();
        const eventCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM mission_events WHERE token = ?").bind(parts[2]).first<{count:number}>();
        return json({
          invitationOpened: Boolean(invite?.opened_at),
          missionClosed: invite?.status === "CLOSED",
          receiptWrittenOnce: Number(receiptCount?.count ?? 0) === 1,
          stateDisposed: Number(eventCount?.count ?? 0) === 0 && invite?.approved_context == null && invite?.role_or_context == null,
          reopenShowsClosedOnly: invite?.status === "CLOSED"
        }, 200, cors(env));
      }

      return json({ error: "not_found" }, 404, cors(env));
    } catch (error) {
      return json({ error: "internal_error", detail: error instanceof Error ? error.message : String(error) }, 500, cors(env));
    }
  }
};
