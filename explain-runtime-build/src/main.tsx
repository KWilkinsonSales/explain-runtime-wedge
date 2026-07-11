import React from "react";
import ReactDOM from "react-dom/client";
import CompanionPrototypeRoute from "./prototype/CompanionPrototypeRoute";
import TeacherPrepRoute from "./teacherprep/TeacherPrepRoute";
import { TEACHER_PREP_ENABLED } from "./teacherprep/featureFlag";

// Companion v1.1 remains the app everywhere ("/", "/companion",
// "/companion/prototype", ?view=teleprompter) with one isolated exception:
// the LDS Teacher Preparation surface at exactly "/teacher" (and subpaths),
// gated by TEACHER_PREP_ENABLED. ExplainIT stays quarantined; see
// /quarantine/explainit.
const path = window.location.pathname;
const isTeacherPrep = TEACHER_PREP_ENABLED && (path === "/teacher" || path.startsWith("/teacher/"));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{isTeacherPrep ? <TeacherPrepRoute /> : <CompanionPrototypeRoute />}</React.StrictMode>
);
