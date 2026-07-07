import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import CompanionPrototypeRoute from "./prototype/CompanionPrototypeRoute";
import { COMPANION_PROTOTYPE_ENABLED } from "./prototype/featureFlag";

// The prototype only takes over this one path. Every other path, including
// "/companion" with no suffix, renders the unchanged production App.
const isPrototypeRoute = COMPANION_PROTOTYPE_ENABLED && window.location.pathname === "/companion/prototype";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{isPrototypeRoute ? <CompanionPrototypeRoute /> : <App />}</React.StrictMode>
);
