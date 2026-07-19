import React, { useState } from "react";
import { BOUNDARY_TEXT } from "../fixtures";
import { FOCUS_PERSON_ID, PRODUCT_LINE } from "../treeFixtures";
import CommandCenterPanel from "./CommandCenterPanel";
import TreeOverviewPanel from "./TreeOverviewPanel";
import PersonWorkspacePanel from "./PersonWorkspacePanel";
import WorkQueuePanel from "./WorkQueuePanel";

// Slice 1: the Tree + Person Workspace shell. It wraps the Slice 0 Evidence
// Audit Desk — the desk is the proof spine, embedded whole inside the Person
// Workspace. The shell adds navigation and higher-level views; it adds no new
// authority over the ledger.

type ShellSection = "command" | "tree" | "person" | "queue";

const SECTION_LABEL: Record<ShellSection, string> = {
  command: "Command Center",
  tree: "Tree",
  person: "Person Workspace",
  queue: "Work Queue",
};

function initialSection(): ShellSection {
  if (typeof window === "undefined") return "command";
  const segment = window.location.pathname.split("/")[2] ?? "";
  if (segment === "tree") return "tree";
  if (segment === "person") return "person";
  if (segment === "queue") return "queue";
  return "command";
}

export default function FamilyHistoryShell() {
  const [section, setSection] = useState<ShellSection>(initialSection);
  const [personId, setPersonId] = useState<string>(FOCUS_PERSON_ID);

  function navigate(next: ShellSection) {
    setSection(next);
    if (typeof window !== "undefined") {
      const suffix =
        next === "command" ? "" : next === "person" ? "/person" : `/${next}`;
      window.history.replaceState(null, "", `/family-history${suffix}`);
    }
  }

  return (
    <main className="fhgi-shell">
      <header className="fhgi-header">
        <h1>Family History Intelligence OS</h1>
        <p className="fhgi-subtitle">Evidence-first genealogy intelligence</p>
        <p className="fhgi-boundary">{BOUNDARY_TEXT}</p>
      </header>

      <nav className="fhgi-nav" aria-label="Workspace sections">
        {(Object.keys(SECTION_LABEL) as ShellSection[]).map((key) => (
          <button
            key={key}
            type="button"
            className={section === key ? "fhgi-nav-active" : undefined}
            aria-current={section === key ? "page" : undefined}
            onClick={() => navigate(key)}
          >
            {SECTION_LABEL[key]}
          </button>
        ))}
      </nav>

      {section === "command" && <CommandCenterPanel />}
      {section === "tree" && (
        <TreeOverviewPanel
          onSelectPerson={(id) => {
            setPersonId(id);
            navigate("person");
          }}
        />
      )}
      {section === "person" && <PersonWorkspacePanel personId={personId} />}
      {section === "queue" && <WorkQueuePanel />}

      <footer className="fhgi-footer">
        <p>{PRODUCT_LINE}</p>
      </footer>
    </main>
  );
}
