import React from "react";
import "./productSelector.css";

// Root front door: an explicit choice between the two product surfaces that
// share this deployment. Plain links — no state, no storage, no network.
export default function ProductSelector() {
  return (
    <main className="ps-shell">
      <h1>Choose a surface</h1>
      <nav aria-label="Products">
        <a className="ps-card" href="/teacher">
          <span className="ps-name">LDS Teacher Preparation</span>
          <span className="ps-desc">This Week · Prepare · Teach</span>
        </a>
        <a className="ps-card" href="/companion/prototype">
          <span className="ps-name">Companion</span>
          <span className="ps-desc">Live listening prototype</span>
        </a>
      </nav>
    </main>
  );
}
