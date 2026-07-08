import React from "react";
import { listRooms, PLAINTIFF_INTELLIGENCE_ROOM_ID } from "./roomRegistry";
import { roomPath } from "./routes";
import "./explainit.css";

// The calm entry surface: one primary action. Navigation is a real URL change
// so the room route works on its own, matching the app's pathname routing.
export default function ExplainItEntry() {
  const room = listRooms().find((candidate) => candidate.roomId === PLAINTIFF_INTELLIGENCE_ROOM_ID) ?? listRooms()[0];

  function enterRoom() {
    if (typeof window !== "undefined" && room) {
      window.location.assign(roomPath(room.roomId));
    }
  }

  return (
    <div className="explainit-shell explainit-entry">
      <main className="entry-center">
        <p className="eyebrow">ExplainIT</p>
        <h1>A governed room is waiting.</h1>
        <p className="entry-lede">
          Rooms here are bounded places, not dashboards. Each one knows only what it has admitted,
          answers only within its authority, and leaves a receipt for everything it says.
        </p>
        {room && (
          <>
            <button className="enter-room" onClick={enterRoom}>
              Enter Room
            </button>
            <p className="entry-room-name">{room.name}</p>
          </>
        )}
        <p className="entry-footnote">Understanding only · Admitted sources only · Every exchange receipted</p>
      </main>
    </div>
  );
}
