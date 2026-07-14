import React from "react";
import ReactDOM from "react-dom/client";
import CompanionPrototypeRoute from "./prototype/CompanionPrototypeRoute";
import TeacherPrepRoute from "./teacherprep/TeacherPrepRoute";
import DurinRoute from "./durin/ui/DurinRoute";
import ProductSelector from "./ProductSelector";
import { TEACHER_PREP_ENABLED } from "./teacherprep/featureFlag";
import { DURIN_INTAKE_ENABLED } from "./durin/featureFlag";
import { resolveSurface } from "./routeGate";

// Four surfaces share this deployment (see routeGate.ts):
// "/teacher" → LDS Teacher Preparation, "/durin" → Durin Intake Slice 0,
// "/" → product selector, everything else — including /companion/prototype
// and ?view=teleprompter — renders Companion v1.1 unchanged. ExplainIT
// stays quarantined; see /quarantine/explainit.
const surface = resolveSurface(window.location.pathname, TEACHER_PREP_ENABLED, DURIN_INTAKE_ENABLED);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {surface === "teacher" ? (
      <TeacherPrepRoute />
    ) : surface === "durin" ? (
      <DurinRoute />
    ) : surface === "selector" ? (
      <ProductSelector />
    ) : (
      <CompanionPrototypeRoute />
    )}
  </React.StrictMode>
);
