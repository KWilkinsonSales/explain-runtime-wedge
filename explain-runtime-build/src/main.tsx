import React from "react";
import ReactDOM from "react-dom/client";
import CompanionPrototypeRoute from "./prototype/CompanionPrototypeRoute";
import TeacherPrepRoute from "./teacherprep/TeacherPrepRoute";
import ProductSelector from "./ProductSelector";
import { TEACHER_PREP_ENABLED } from "./teacherprep/featureFlag";
import { resolveSurface } from "./routeGate";

// Three surfaces share this deployment (see routeGate.ts):
// "/teacher" → LDS Teacher Preparation, "/" → product selector, everything
// else — including /companion/prototype and ?view=teleprompter — renders
// Companion v1.1 unchanged. ExplainIT stays quarantined; see
// /quarantine/explainit.
const surface = resolveSurface(window.location.pathname, TEACHER_PREP_ENABLED);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {surface === "teacher" ? (
      <TeacherPrepRoute />
    ) : surface === "selector" ? (
      <ProductSelector />
    ) : (
      <CompanionPrototypeRoute />
    )}
  </React.StrictMode>
);
