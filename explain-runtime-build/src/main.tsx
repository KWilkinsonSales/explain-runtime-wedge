import React from "react";
import ReactDOM from "react-dom/client";
import CompanionPrototypeRoute from "./prototype/CompanionPrototypeRoute";
import TeacherPrepRoute from "./teacherprep/TeacherPrepRoute";
import DurinRoute from "./durin/ui/DurinRoute";
import CouncilRoute from "./council/ui/CouncilRoute";
import ProductSelector from "./ProductSelector";
import { TEACHER_PREP_ENABLED } from "./teacherprep/featureFlag";
import { DURIN_INTAKE_ENABLED } from "./durin/featureFlag";
import { COUNCIL_ENABLED } from "./council/featureFlag";
import { resolveSurface } from "./routeGate";

// Five surfaces share this deployment (see routeGate.ts):
// "/teacher" → LDS Teacher Preparation, "/durin" → Durin Intake Slice 0,
// "/council" → Council deterministic fixture prototype, "/" → product
// selector, everything else — including /companion/prototype and
// ?view=teleprompter — renders Companion v1.1 unchanged. ExplainIT stays
// quarantined; see /quarantine/explainit.
const surface = resolveSurface(
  window.location.pathname,
  TEACHER_PREP_ENABLED,
  DURIN_INTAKE_ENABLED,
  COUNCIL_ENABLED
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {surface === "teacher" ? (
      <TeacherPrepRoute />
    ) : surface === "durin" ? (
      <DurinRoute />
    ) : surface === "council" ? (
      <CouncilRoute />
    ) : surface === "selector" ? (
      <ProductSelector />
    ) : (
      <CompanionPrototypeRoute />
    )}
  </React.StrictMode>
);
