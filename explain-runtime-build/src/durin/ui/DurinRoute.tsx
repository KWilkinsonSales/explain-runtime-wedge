import React from "react";
import DurinIntakeApp from "./DurinIntakeApp";
import "./durin.css";

// /durin — Durin Multimodal Theme Intake, Slice 0. Device-local only:
// the spine persists to window.localStorage through the same KV idiom as
// Teacher Prep; there is no network code anywhere under src/durin.
export default function DurinRoute() {
  return <DurinIntakeApp />;
}
