import React from "react";
import { nodeForPerson, packetForPerson } from "../treeFixtures";
import { buildExportReceipt } from "../receipt";
import { LEAD_NOT_PROOF_LABEL } from "../fixtures";
import { EvidenceDesk } from "./FamilyHistoryApp";

// Person Workspace: everything known about one person, organized as
// expandable drawers so the cockpit stays scannable (secondary detail is
// hidden until opened). The Slice 0 Evidence Audit Desk is embedded whole —
// it is the proof spine every other drawer summarizes.

function Drawer({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="fhgi-drawer" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="fhgi-drawer-body">{children}</div>
    </details>
  );
}

export default function PersonWorkspacePanel({ personId }: { personId: string }) {
  const node = nodeForPerson(personId);
  const packet = packetForPerson(personId);

  if (!node) {
    return (
      <section className="fhgi-panel">
        <h2>Person Workspace</h2>
        <p>Unknown person. Pick someone from the Tree Overview.</p>
      </section>
    );
  }

  if (!packet) {
    return (
      <section className="fhgi-panel" aria-labelledby="fhgi-h-workspace">
        <h2 id="fhgi-h-workspace">Person Workspace — {node.displayName}</h2>
        <p className="fhgi-status">{HEALTH_STATUS[node.evidenceHealth]}</p>
        <p className="fhgi-panel-note">{node.lifespanNote}</p>
        <p>
          No evidence packet exists for this person yet. The workspace stays
          empty rather than filling with unsourced guesses.
        </p>
        <h3>Next safe action</h3>
        <p>{node.researchOpportunity}</p>
      </section>
    );
  }

  const conflicts = packet.claims.filter((c) => c.conflicts.length > 0);
  const sources = [...new Set(packet.claims.map((c) => c.sourcePlatform))];

  return (
    <section className="fhgi-panel" aria-labelledby="fhgi-h-workspace">
      <h2 id="fhgi-h-workspace">Person Workspace — {node.displayName}</h2>
      <p className="fhgi-status">{packet.status}</p>
      <p className="fhgi-panel-note">{packet.summary}</p>

      <Drawer title="Evidence Audit Desk (Slice 0 nucleus — full ledger)" defaultOpen>
        <EvidenceDesk embedded />
      </Drawer>

      <Drawer title="Timeline">
        <ul className="fhgi-list">
          <li>
            <strong>1955-04-01</strong> — born, St. Joseph's Hospital, Lewiston,
            Idaho (accepted anchor).
          </li>
          <li>
            <strong>Undated</strong> — two Nampa, Idaho address associations
            (HOLD; unsourced aggregator data).
          </li>
          <li>
            <strong>Present</strong> — status unknown. No death conclusion on the
            ledger; the timeline ends in an open question, not an assumption.
          </li>
        </ul>
      </Drawer>

      <Drawer title="Relationships">
        <ul className="fhgi-list">
          <li>Mother: Frances Elaine Reavis (parentage anchor, accepted)</li>
          <li>Father: Lester Carl Ellison (parentage anchor, accepted)</li>
          <li>Spouse: none resolved — married-name gap is an open mystery</li>
          <li>Children: none on ledger — interview prompt exists for rumors</li>
        </ul>
      </Drawer>

      <Drawer title="Sources">
        <ul className="fhgi-list">
          {sources.map((platform) => (
            <li key={platform}>
              {platform} —{" "}
              {packet.claims.filter((c) => c.sourcePlatform === platform).length}{" "}
              claim(s)
            </li>
          ))}
        </ul>
      </Drawer>

      <Drawer title="Extracted claims">
        <p>
          {packet.claims.length} claims on the ledger, each with exactly one
          disposition. The full matrix lives in the Evidence Audit Desk drawer
          above.
        </p>
      </Drawer>

      <Drawer title="Conflicts">
        <ul className="fhgi-list">
          {conflicts.map((claim) => (
            <li key={claim.claimId}>
              <strong>{claim.claimId}</strong>: {claim.conflicts.join("; ")}
            </li>
          ))}
        </ul>
      </Drawer>

      <Drawer title="Dedupe candidates">
        <p>
          The dedupe engine refuses to lie: similarity is a reason to
          investigate, never a reason to merge.
        </p>
        <ul className="fhgi-list">
          {packet.falseLeads.map((lead) => (
            <li key={lead.leadId}>
              <span className="fhgi-chip fhgi-chip-rejected">Rejected</span>{" "}
              {lead.label} — {lead.rejectionReason}
            </li>
          ))}
          {packet.candidates
            .filter((c) => c.label.includes("Joan"))
            .map((candidate) => (
              <li key={candidate.candidateId}>
                <span className="fhgi-chip fhgi-chip-hold">Hold</span>{" "}
                {candidate.label} — {candidate.requirement}
              </li>
            ))}
        </ul>
      </Drawer>

      <Drawer title="Artifacts">
        <p>
          Placeholder — no artifacts ingested yet. Uploads will land here and
          their extracted claims enter the ledger as HOLD.
        </p>
      </Drawer>

      <Drawer title="Guided interview prompts">
        <ul className="fhgi-list">
          {packet.interviewReceipts.flatMap((receipt) =>
            receipt.promptSet.map((prompt) => (
              <li key={prompt.promptId}>
                <strong>{prompt.artifactOrGap}</strong> — “{prompt.sayThis}”{" "}
                <span className="fhgi-lead-label">{LEAD_NOT_PROOF_LABEL}</span>
              </li>
            ))
          )}
        </ul>
      </Drawer>

      <Drawer title="Receipt / export">
        <pre className="fhgi-receipt">{buildExportReceipt(packet)}</pre>
      </Drawer>
    </section>
  );
}

const HEALTH_STATUS = {
  anchored: "ANCHORED",
  partial: "PARTIALLY SOURCED — OWN RECORDS NOT YET CAPTURED",
  unsourced: "UNSOURCED BRANCH — NOTHING CAPTURED YET",
} as const;
