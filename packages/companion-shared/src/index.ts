// @adl/companion-shared — the explicit, shared surface between Companion
// (explain-runtime-build) and ExplainIT (explain-runtime-explainit). Neither
// product forks or reimplements what's exported here; each imports it from
// this one location. See each app's src/prototype (Companion) or
// src/explainit (ExplainIT) callers for how it's wired in.
export * from "./eventDetection.js";
export * from "./voiceCapability.js";
