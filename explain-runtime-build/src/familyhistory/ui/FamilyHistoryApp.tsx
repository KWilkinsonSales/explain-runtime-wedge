import React from "react";
import {
  BOUNDARY_TEXT,
  DONNA_JEAN_PACKET,
  FUTURE_ARTIFACT_CLASSES,
  LEAD_NOT_PROOF_LABEL,
  RECONSTRUCTION_WARNING,
} from "../fixtures";
import { buildExportReceipt } from "../receipt";
import type { Disposition, ReconstructionLabel } from "../types";
import "./familyHistory.css";

// Evidence Audit Desk — Slice 0. Everything renders from the deterministic
// Donna Jean fixture; there is no network, no upload, and no editing yet.

const DISPOSITION_TEXT: Record<Disposition, string> = {
  accepted: "Accepted",
  rejected: "Rejected",
  duplicate_candidate: "Duplicate?",
  conflict: "Conflict",
  hold: "Hold",
  private: "Private",
  rd_only: "R&D only",
  source_only: "Source only",
};

const RECONSTRUCTION_TEXT: Record<ReconstructionLabel, string> = {
  observed_fact: "Observed Fact",
  likely: "Likely",
  possible_narrative_fill: "Possible / Narrative Fill",
  unknown: "Unknown",
};

function DispositionChip({ disposition }: { disposition: Disposition }) {
  return (
    <span className={`fhgi-chip fhgi-chip-${disposition}`}>
      {DISPOSITION_TEXT[disposition]}
    </span>
  );
}

function ReconLabelChip({ label }: { label: ReconstructionLabel }) {
  return (
    <span className={`fhgi-recon fhgi-recon-${label}`}>{RECONSTRUCTION_TEXT[label]}</span>
  );
}

// The Slice 0 nucleus, extracted so Slice 1 can embed it inside the Person
// Workspace without duplicating it. `embedded` skips the product header (the
// shell provides its own) and demotes nothing else — the ledger panels render
// identically in both contexts.
export function EvidenceDesk({ embedded = false }: { embedded?: boolean }) {
  const packet = DONNA_JEAN_PACKET;
  const receiptPreview = buildExportReceipt(packet);

  return (
    <>
      {/* 1 — Product header */}
      {!embedded && (
        <header className="fhgi-header">
          <h1>Family History Intelligence OS</h1>
          <p className="fhgi-subtitle">Evidence-first genealogy intelligence</p>
          <p className="fhgi-boundary">{BOUNDARY_TEXT}</p>
        </header>
      )}

      {/* 2 — Person evidence packet */}
      <section className="fhgi-panel" aria-labelledby="fhgi-h-packet">
        <h2 id="fhgi-h-packet">Person Evidence Packet</h2>
        <p className="fhgi-status">{packet.status}</p>
        <dl className="fhgi-facts">
          <div>
            <dt>Primary anchor</dt>
            <dd>{packet.knownNames.join(" / ")}</dd>
          </div>
          <div>
            <dt>Date of birth</dt>
            <dd>{packet.dob}</dd>
          </div>
          <div>
            <dt>Birthplace</dt>
            <dd>{packet.birthplace}</dd>
          </div>
          <div>
            <dt>Parents</dt>
            <dd>{packet.parents.join(" and ")}</dd>
          </div>
        </dl>
        <p className="fhgi-summary">{packet.summary}</p>
      </section>

      {/* 3 — Source / claim matrix */}
      <section className="fhgi-panel" aria-labelledby="fhgi-h-matrix">
        <h2 id="fhgi-h-matrix">Source / Claim Matrix</h2>
        <p className="fhgi-panel-note">
          Each row is a single sourced claim, never a person summary.
        </p>
        <div className="fhgi-table-wrap">
          <table className="fhgi-table">
            <thead>
              <tr>
                <th scope="col">Disposition</th>
                <th scope="col">Claim</th>
                <th scope="col">Type</th>
                <th scope="col">Source</th>
                <th scope="col">Confidence</th>
                <th scope="col">Conflicts</th>
                <th scope="col">Next action</th>
              </tr>
            </thead>
            <tbody>
              {packet.claims.map((claim) => (
                <tr key={claim.claimId} className={`fhgi-row-${claim.disposition}`}>
                  <td>
                    <DispositionChip disposition={claim.disposition} />
                  </td>
                  <td>{claim.claimText}</td>
                  <td>{claim.claimType.replace(/_/g, " ")}</td>
                  <td>
                    {claim.sourcePlatform} — {claim.collectionName}
                  </td>
                  <td>{claim.confidence}</td>
                  <td>{claim.conflicts.length > 0 ? claim.conflicts.join("; ") : "—"}</td>
                  <td>{claim.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4 — False-lead registry */}
      <section className="fhgi-panel" aria-labelledby="fhgi-h-false-leads">
        <h2 id="fhgi-h-false-leads">False-Lead Registry</h2>
        <ul className="fhgi-cards">
          {packet.falseLeads.map((lead) => (
            <li key={lead.leadId} className="fhgi-card fhgi-card-rejected">
              <div className="fhgi-card-head">
                <DispositionChip disposition="rejected" />
                <h3>{lead.label}</h3>
              </div>
              <p>{lead.rejectionReason}</p>
              <p className="fhgi-block-note">{lead.autoMergeBlock}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 5 — Candidate board */}
      <section className="fhgi-panel" aria-labelledby="fhgi-h-candidates">
        <h2 id="fhgi-h-candidates">Candidate Board</h2>
        <ul className="fhgi-cards">
          {packet.candidates.map((candidate) => (
            <li key={candidate.candidateId} className="fhgi-card fhgi-card-hold">
              <div className="fhgi-card-head">
                <DispositionChip disposition={candidate.disposition} />
                <h3>{candidate.label}</h3>
              </div>
              <p className="fhgi-requirement">{candidate.requirement}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 6 — ExplainIT interview module (bounded, not open-ended chat) */}
      <section className="fhgi-panel" aria-labelledby="fhgi-h-interview">
        <h2 id="fhgi-h-interview">ExplainIT Interview Module</h2>
        {packet.interviewReceipts.map((receipt) => (
          <div key={receipt.receiptId} className="fhgi-interview">
            <dl className="fhgi-facts">
              <div>
                <dt>Purpose</dt>
                <dd>{receipt.purpose}</dd>
              </div>
              <div>
                <dt>Subject</dt>
                <dd>{receipt.subject}</dd>
              </div>
              <div>
                <dt>Interviewee</dt>
                <dd>{receipt.targetInterviewee}</dd>
              </div>
            </dl>
            <ul className="fhgi-cards">
              {receipt.promptSet.map((prompt) => (
                <li key={prompt.promptId} className="fhgi-card">
                  <p className="fhgi-gap">{prompt.artifactOrGap}</p>
                  <p>{prompt.suggestedPrompt}</p>
                  <p className="fhgi-say-this">
                    <strong>Say this:</strong> “{prompt.sayThis}”
                  </p>
                  <p className="fhgi-followup">
                    <strong>Follow-up lead:</strong> {prompt.followUpLead}
                  </p>
                  <p className="fhgi-lead-label">{LEAD_NOT_PROOF_LABEL}</p>
                </li>
              ))}
            </ul>
            <p className="fhgi-panel-note">
              Receipt output: every answer is logged as a {LEAD_NOT_PROOF_LABEL} lead
              (rd_only) — {receipt.uncertaintyNotes}
            </p>
          </div>
        ))}
      </section>

      {/* 7 — Artifact ingestion placeholder */}
      <section className="fhgi-panel" aria-labelledby="fhgi-h-artifacts">
        <h2 id="fhgi-h-artifacts">Artifact Ingestion</h2>
        <p className="fhgi-panel-note">
          Placeholder — no upload in Slice 0. Future slices will ingest:
        </p>
        <ul className="fhgi-artifact-list">
          {FUTURE_ARTIFACT_CLASSES.map((artifactClass) => (
            <li key={artifactClass}>{artifactClass}</li>
          ))}
        </ul>
      </section>

      {/* 8 — Reconstruction label legend */}
      <section className="fhgi-panel" aria-labelledby="fhgi-h-recon">
        <h2 id="fhgi-h-recon">Reconstruction Label Legend</h2>
        <ul className="fhgi-legend">
          {packet.reconstructionNotes.map((note) => (
            <li key={note.noteId}>
              <ReconLabelChip label={note.label} />
              <span>{note.text}</span>
            </li>
          ))}
        </ul>
        <p className="fhgi-warning">{RECONSTRUCTION_WARNING}</p>
      </section>

      {/* 9 — Export receipt preview */}
      <section className="fhgi-panel" aria-labelledby="fhgi-h-receipt">
        <h2 id="fhgi-h-receipt">Export Receipt Preview</h2>
        <pre className="fhgi-receipt">{receiptPreview}</pre>
      </section>
    </>
  );
}

// Slice 0 standalone surface, unchanged in content: the full desk with its
// product header. Slice 1's shell renders this when its own flag is off.
export default function FamilyHistoryApp() {
  return (
    <main className="fhgi-shell">
      <EvidenceDesk />
    </main>
  );
}
