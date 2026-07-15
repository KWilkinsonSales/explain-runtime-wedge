// ExplainIT route resolution, kept pure so main.tsx stays a thin switch and
// the routing table is unit-testable without a browser.

import { PLAINTIFF_INTELLIGENCE_ROOM_ID } from "./roomRegistry";

export type ExplainItRoute =
  | { readonly kind: "entry" }
  | { readonly kind: "room"; readonly roomId: string }
  | null;

export function resolveExplainItRoute(pathname: string): ExplainItRoute {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "explainit") return null;

  if (segments.length === 1) return { kind: "entry" };

  if (segments[1] === "room" && segments.length === 3 && segments[2]) {
    return { kind: "room", roomId: segments[2] };
  }

  // Convenience route: /explainit/plaintiff-intelligence maps cleanly onto
  // the seeded room's canonical /explainit/room/:roomId address.
  if (segments.length === 2 && segments[1] === PLAINTIFF_INTELLIGENCE_ROOM_ID) {
    return { kind: "room", roomId: PLAINTIFF_INTELLIGENCE_ROOM_ID };
  }

  return null;
}

export function roomPath(roomId: string): string {
  return `/explainit/room/${roomId}`;
}
