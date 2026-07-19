import React, { useState } from "react";
import { TREE_NODES, type TreePersonNode } from "../treeFixtures";

// Tree Overview: a three-generation pedigree with evidence-health,
// duplicate-risk, and research-opportunity overlays. Overlay chips always
// pair color with text — never color alone.

type Overlay = "health" | "duplicates" | "opportunities";

const HEALTH_TEXT: Record<TreePersonNode["evidenceHealth"], string> = {
  anchored: "Anchored",
  partial: "Partially sourced",
  unsourced: "Unsourced",
};

function PersonNode({
  node,
  overlays,
  onSelect,
}: {
  node: TreePersonNode;
  overlays: Set<Overlay>;
  onSelect: (personId: string) => void;
}) {
  return (
    <button
      type="button"
      className={`fhgi-tree-node fhgi-health-${node.evidenceHealth}`}
      onClick={() => onSelect(node.personId)}
    >
      <span className="fhgi-tree-name">{node.displayName}</span>
      <span className="fhgi-tree-lifespan">{node.lifespanNote}</span>
      {overlays.has("health") && (
        <span className={`fhgi-chip fhgi-overlay-${node.evidenceHealth}`}>
          {HEALTH_TEXT[node.evidenceHealth]}
        </span>
      )}
      {overlays.has("duplicates") && node.duplicateRisk !== "none" && (
        <span className="fhgi-chip fhgi-chip-hold">
          Duplicate risk: {node.duplicateRisk}
        </span>
      )}
      {overlays.has("opportunities") && (
        <span className="fhgi-tree-opportunity">{node.researchOpportunity}</span>
      )}
    </button>
  );
}

export default function TreeOverviewPanel({
  onSelectPerson,
}: {
  onSelectPerson: (personId: string) => void;
}) {
  const [overlays, setOverlays] = useState<Set<Overlay>>(new Set(["health"]));

  function toggle(overlay: Overlay) {
    setOverlays((current) => {
      const next = new Set(current);
      if (next.has(overlay)) next.delete(overlay);
      else next.add(overlay);
      return next;
    });
  }

  const grandparents = TREE_NODES.filter((n) => n.role === "grandparent_placeholder");
  const parents = TREE_NODES.filter((n) => n.role === "mother" || n.role === "father");
  const focus = TREE_NODES.filter((n) => n.role === "focus");

  return (
    <section className="fhgi-panel" aria-labelledby="fhgi-h-tree">
      <h2 id="fhgi-h-tree">Tree Overview</h2>
      <p className="fhgi-panel-note">
        Pedigree around the focus person. Select anyone to open their workspace.
        Placeholders stay visibly unsourced — the tree never invents ancestors.
      </p>

      <fieldset className="fhgi-overlay-toggles">
        <legend>Overlays</legend>
        <label>
          <input
            type="checkbox"
            checked={overlays.has("health")}
            onChange={() => toggle("health")}
          />
          Evidence health
        </label>
        <label>
          <input
            type="checkbox"
            checked={overlays.has("duplicates")}
            onChange={() => toggle("duplicates")}
          />
          Duplicate risk
        </label>
        <label>
          <input
            type="checkbox"
            checked={overlays.has("opportunities")}
            onChange={() => toggle("opportunities")}
          />
          Research opportunities
        </label>
      </fieldset>

      <div className="fhgi-tree">
        <div className="fhgi-tree-row" aria-label="Grandparents">
          {grandparents.map((node) => (
            <PersonNode key={node.personId} node={node} overlays={overlays} onSelect={onSelectPerson} />
          ))}
        </div>
        <div className="fhgi-tree-row" aria-label="Parents">
          {parents.map((node) => (
            <PersonNode key={node.personId} node={node} overlays={overlays} onSelect={onSelectPerson} />
          ))}
        </div>
        <div className="fhgi-tree-row" aria-label="Focus person">
          {focus.map((node) => (
            <PersonNode key={node.personId} node={node} overlays={overlays} onSelect={onSelectPerson} />
          ))}
        </div>
      </div>
    </section>
  );
}
