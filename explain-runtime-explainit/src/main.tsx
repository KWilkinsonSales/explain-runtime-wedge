import React from "react";
import ReactDOM from "react-dom/client";
import ExplainItEntry from "./explainit/ExplainItEntry";
import ExplainItRoom from "./explainit/ExplainItRoom";
import { resolveExplainItRoute } from "./explainit/routes";
import "./app.css";

function NotFound() {
  return (
    <div className="explainit-shell explainit-entry">
      <main className="entry-center">
        <p className="eyebrow">ExplainIT</p>
        <h1>No room at this address</h1>
        <a className="room-link" href="/explainit">Back to the entry</a>
      </main>
    </div>
  );
}

function Root() {
  const route = resolveExplainItRoute(window.location.pathname);
  if (route?.kind === "entry") return <ExplainItEntry />;
  if (route?.kind === "room") return <ExplainItRoom roomId={route.roomId} />;
  return <NotFound />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
