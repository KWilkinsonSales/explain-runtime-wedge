import React from "react";
import "./productSelector.css";

// Root front door: an explicit choice between the product surfaces that
// share this deployment. Plain links — no state, no storage, no network.
//
// Card copy and status vocabulary are locked by the governing source
// (Notion: "2026-07-15 — Surface selector naming and status lock"). Do not
// change these strings, and do not promote a status past "Prototype" or to
// "Accepted foundation" without an explicit new canon lock — merged code
// alone does not authorize the upgrade.
export default function ProductSelector() {
  return (
    <main className="ps-shell">
      <h1>Choose a surface</h1>
      <nav aria-label="Products">
        <a className="ps-card" href="/teacher">
          <span className="ps-name">LDS Teacher Preparation</span>
          <span className="ps-desc">Prototype — curriculum workflow</span>
        </a>
        <a className="ps-card" href="/companion/prototype">
          <span className="ps-name">Companion</span>
          <span className="ps-desc">Prototype — live listening</span>
        </a>
        <a className="ps-card" href="/durin">
          <span className="ps-name">Durin Intake — Governed Multimodal Intake</span>
          <span className="ps-desc">Accepted foundation — Slice 0 complete</span>
        </a>
      </nav>
    </main>
  );
}
