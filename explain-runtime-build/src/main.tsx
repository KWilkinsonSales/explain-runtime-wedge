import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import CompanionPrototypeRoute from "./prototype/CompanionPrototypeRoute";
import { COMPANION_PROTOTYPE_ENABLED } from "./prototype/featureFlag";
import ExplainItEntry from "./explainit/ExplainItEntry";
import ExplainItRoom from "./explainit/ExplainItRoom";
import { resolveExplainItRoute } from "./explainit/routes";

// The prototype only takes over this one path. Every other path, including
// "/companion" with no suffix, renders the unchanged production App.
const isPrototypeRoute = COMPANION_PROTOTYPE_ENABLED && window.location.pathname === "/companion/prototype";

// ExplainIT owns /explainit and /explainit/room/:roomId; unknown /explainit
// paths fall through to the production App like any other path.
const explainItRoute = resolveExplainItRoute(window.location.pathname);

function selectRoot(): React.ReactElement {
  if (isPrototypeRoute) return <CompanionPrototypeRoute />;
  if (explainItRoute?.kind === "entry") return <ExplainItEntry />;
  if (explainItRoute?.kind === "room") return <ExplainItRoom roomId={explainItRoute.roomId} />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{selectRoot()}</React.StrictMode>
);
