import React from "react";
import ReactDOM from "react-dom/client";
import CompanionPrototypeRoute from "./prototype/CompanionPrototypeRoute";

// Companion v1.1: this app is Companion, nothing else. Every path — "/",
// "/companion", "/companion/prototype" — renders the Companion ON
// teleprompter (or its display view via ?view=teleprompter). ExplainIT was
// quarantined out of this app entirely; see /quarantine/explainit.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CompanionPrototypeRoute />
  </React.StrictMode>
);
