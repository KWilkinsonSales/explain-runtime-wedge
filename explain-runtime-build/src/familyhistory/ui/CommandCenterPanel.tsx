import React from "react";
import { buildCommandCenter } from "../insights";
import { DONNA_JEAN_PACKET } from "../fixtures";

// Research Command Center: project health as counts and open questions.
// Numbers describe the ledger; they never score people or imply conclusions.
export default function CommandCenterPanel() {
  const summary = buildCommandCenter(DONNA_JEAN_PACKET);

  return (
    <section className="fhgi-panel" aria-labelledby="fhgi-h-command">
      <h2 id="fhgi-h-command">Research Command Center</h2>

      <div className="fhgi-tiles">
        <div className="fhgi-tile">
          <span className="fhgi-tile-number">{summary.claimCounts.total}</span>
          <span className="fhgi-tile-label">claims on ledger</span>
        </div>
        <div className="fhgi-tile">
          <span className="fhgi-tile-number">{summary.claimCounts.accepted}</span>
          <span className="fhgi-tile-label">accepted anchors</span>
        </div>
        <div className="fhgi-tile">
          <span className="fhgi-tile-number">{summary.claimCounts.hold}</span>
          <span className="fhgi-tile-label">on hold</span>
        </div>
        <div className="fhgi-tile">
          <span className="fhgi-tile-number">{summary.duplicateRisksGuarded}</span>
          <span className="fhgi-tile-label">duplicate risks guarded</span>
        </div>
        <div className="fhgi-tile">
          <span className="fhgi-tile-number">{summary.unsourcedBranches}</span>
          <span className="fhgi-tile-label">unsourced branches</span>
        </div>
      </div>

      <h3>Open mysteries</h3>
      <ul className="fhgi-list">
        {summary.openMysteries.map((mystery) => (
          <li key={mystery}>{mystery}</li>
        ))}
      </ul>

      <h3>Changed / rejected facts</h3>
      <ul className="fhgi-list">
        {summary.factChanges.map((change) => (
          <li key={change.changeId}>
            <span className={`fhgi-chip fhgi-chip-${change.kind === "claim_accepted" ? "accepted" : change.kind === "claim_rejected" ? "rejected" : "hold"}`}>
              {change.kind.replace(/_/g, " ")}
            </span>{" "}
            {change.description} <span className="fhgi-muted">({change.changedAt})</span>
          </li>
        ))}
      </ul>

      <h3>Next safe actions</h3>
      <ul className="fhgi-list">
        {summary.nextSafeActions.map((action) => (
          <li key={action}>{action}</li>
        ))}
      </ul>
    </section>
  );
}
