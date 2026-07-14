import React, { useMemo, useRef, useState } from "react";
import {
  PRIVACY_LANES,
  THEME_TYPES,
  type Actor,
  type PrivacyLane,
  type SourceArtifact,
  type SourceType,
  type ThemeAssertion,
  type IntakeReceipt
} from "../contracts";
import {
  attachManualDerivation,
  importSource,
  proposeObjectDetails,
  MANUAL_GENERATOR,
  type ManualImportResult
} from "../adapters";
import { DurinSpine, DurinSpineError } from "../spine";
import { createMemoryBackend, type KeyValueBackend } from "../ledger";

// Slice 0 is single-operator and device-local. Every review action below is
// this explicit human actor — never a system actor.
const OPERATOR: Actor = { actorId: "operator", actorType: "human" };

const NO_DELETE_LINE =
  "Nothing here is ever deleted. Processed, routed, archived, and held are filing states, not deletion. " +
  "Deleting an original would require a separate explicit human action, and Slice 0 refuses to execute deletion at all.";

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  audio_recording: "Voice recording",
  text_note_export: "Exported Note / text",
  pdf_scan: "PDF / scanned document",
  family_photo: "Family photo",
  object_photo: "Object / heirloom photo"
};

const LANE_LABELS: Record<PrivacyLane, string> = {
  adl_business: "ADL / business",
  private_journal: "Private journal",
  family_memory: "Family memory / legacy",
  faith_study: "Faith / church study",
  object_archive: "Object archive / garage-sale / heirloom",
  unsorted_holding: "Unsorted holding",
  restricted_health_legal: "Restricted health / legal"
};

function browserBackend(): KeyValueBackend {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  return createMemoryBackend();
}

type Step = "home" | "import" | "lane" | "derivation" | "themes" | "review" | "disposition" | "receipt";

type Draft = {
  sourceType: SourceType;
  filename: string;
  content: string; // utf8 text, or a data: URL (base64 serialization) for binary files
  encoding: "utf8_text" | "base64";
  mediaType: string;
};

export default function DurinIntakeApp() {
  const spine = useMemo(() => new DurinSpine(browserBackend()), []);
  const [step, setStep] = useState<Step>("home");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [imported, setImported] = useState<ManualImportResult | null>(null);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<IntakeReceipt | null>(null);
  const [tick, setTick] = useState(0); // bump to re-read spine projections

  const refresh = () => setTick((value) => value + 1);

  function guard<T>(action: () => T): T | undefined {
    try {
      setError(null);
      const result = action();
      refresh();
      return result;
    } catch (thrown) {
      if (thrown instanceof DurinSpineError) setError(`${thrown.code}: ${thrown.message}`);
      else if (thrown instanceof Error) setError(thrown.message);
      else setError(String(thrown));
      return undefined;
    }
  }

  const artifact: SourceArtifact | null =
    activeArtifactId !== null
      ? spine.listArtifacts().find((candidate) => candidate.artifactId === activeArtifactId) ?? null
      : null;
  void tick;

  return (
    <main className="durin-shell">
      <header className="durin-header">
        <h1>Durin Intake — Slice 0</h1>
        <p className="durin-sub">Governed multimodal intake · device-local · originals preserved</p>
      </header>
      <p className="durin-nodelete">{NO_DELETE_LINE}</p>
      {error !== null && (
        <p role="alert" className="durin-error">
          Denied and audited: {error}
        </p>
      )}
      {notice !== null && <p className="durin-notice">{notice}</p>}

      {step === "home" && (
        <HomeScreen
          spine={spine}
          onNewImport={() => {
            setDraft(null);
            setImported(null);
            setReceipt(null);
            setNotice(null);
            setStep("import");
          }}
          onOpenArtifact={(id) => {
            setActiveArtifactId(id);
            setStep("derivation");
          }}
          onOpenReceipt={(opened) => {
            setReceipt(opened);
            setStep("receipt");
          }}
        />
      )}

      {step === "import" && (
        <ImportScreen
          onCancel={() => setStep("home")}
          onReady={(prepared) => {
            setDraft(prepared);
            setStep("lane");
          }}
        />
      )}

      {step === "lane" && draft !== null && (
        <LaneScreen
          draft={draft}
          onBack={() => setStep("import")}
          onConfirm={(lane, hold) => {
            const result = guard(() =>
              importSource(spine, {
                sourceType: draft.sourceType,
                filename: draft.filename,
                encoding: draft.encoding,
                content: draft.content,
                mediaType: draft.mediaType,
                capturedAt: null,
                owner: OPERATOR,
                privacyLaneChoice: lane,
                requestedAction: hold ? "hold" : "admit"
              })
            );
            if (!result) return;
            setImported(result);
            if (result.admission.status === "duplicate") {
              setNotice(
                `Duplicate of canonical source ${result.admission.canonicalArtifactId} — no second canonical record was created (${result.admission.observation.action}).`
              );
              setActiveArtifactId(result.admission.canonicalArtifactId);
            } else {
              setNotice(null);
              setActiveArtifactId(result.admission.artifact.artifactId);
            }
            setStep("derivation");
          }}
        />
      )}

      {step === "derivation" && artifact !== null && (
        <DerivationScreen
          spine={spine}
          artifact={artifact}
          imported={imported}
          guard={guard}
          onNext={() => setStep("themes")}
        />
      )}

      {step === "themes" && artifact !== null && (
        <ThemeScreen spine={spine} artifact={artifact} guard={guard} onNext={() => setStep("review")} />
      )}

      {step === "review" && artifact !== null && (
        <ReviewScreen spine={spine} artifact={artifact} guard={guard} onNext={() => setStep("disposition")} />
      )}

      {step === "disposition" && artifact !== null && (
        <DispositionScreen
          spine={spine}
          artifact={artifact}
          guard={guard}
          onReceipt={(issued) => {
            setReceipt(issued);
            setStep("receipt");
          }}
          onHome={() => setStep("home")}
        />
      )}

      {step === "receipt" && receipt !== null && (
        <ReceiptScreen spine={spine} receipt={receipt} guard={guard} onHome={() => setStep("home")} />
      )}
    </main>
  );
}

function HomeScreen(props: {
  spine: DurinSpine;
  onNewImport: () => void;
  onOpenArtifact: (artifactId: string) => void;
  onOpenReceipt: (receipt: IntakeReceipt) => void;
}) {
  const artifacts = props.spine.listArtifacts();
  const receipts = props.spine.listReceipts();
  return (
    <section>
      <button className="durin-primary" onClick={props.onNewImport}>
        Import a source
      </button>
      <h2>Sources</h2>
      {artifacts.length === 0 && <p className="durin-muted">No sources yet. Import one to begin the governed loop.</p>}
      <ul className="durin-list">
        {artifacts.map((artifact) => (
          <li key={artifact.artifactId} className="durin-card">
            <div className="durin-card-head">
              <span className="durin-badge durin-badge-original">ORIGINAL</span>
              <strong>{artifact.originalFilename}</strong>
            </div>
            <p className="durin-muted">
              {artifact.artifactId} · state: <b>{artifact.state}</b> · deletion: <b>{artifact.deletionState}</b>
            </p>
            <p className="durin-hash">{artifact.contentHash}</p>
            <button onClick={() => props.onOpenArtifact(artifact.artifactId)}>Open</button>
          </li>
        ))}
      </ul>
      <h2>Receipts</h2>
      {receipts.length === 0 && <p className="durin-muted">No receipts yet.</p>}
      <ul className="durin-list">
        {receipts.map((receipt) => (
          <li key={receipt.receiptId} className="durin-card">
            <strong>{receipt.receiptId}</strong>
            <p className="durin-muted">
              intake {receipt.intakeId} → {LANE_LABELS[receipt.routedTo]}
            </p>
            <button onClick={() => props.onOpenReceipt(receipt)}>Open receipt</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ImportScreen(props: { onCancel: () => void; onReady: (draft: Draft) => void }) {
  const [sourceType, setSourceType] = useState<SourceType>("text_note_export");
  const [noteText, setNoteText] = useState("");
  const [filename, setFilename] = useState("pasted-note.txt");
  const fileRef = useRef<HTMLInputElement>(null);
  const isText = sourceType === "text_note_export";

  return (
    <section>
      <h2>Import</h2>
      <p className="durin-muted">
        Manual import only — nothing connects to Apple Photos or Apple Notes, and nothing is moved or deleted at the
        source. The file or text you provide is preserved exactly as given, hashed before admission.
      </p>
      <label className="durin-field">
        Source type
        <select
          aria-label="Source type"
          value={sourceType}
          onChange={(event) => setSourceType(event.target.value as SourceType)}
        >
          {(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map((kind) => (
            <option key={kind} value={kind}>
              {SOURCE_TYPE_LABELS[kind]}
            </option>
          ))}
        </select>
      </label>
      {isText ? (
        <>
          <label className="durin-field">
            Note filename
            <input value={filename} onChange={(event) => setFilename(event.target.value)} />
          </label>
          <label className="durin-field">
            Exported note text
            <textarea
              aria-label="Exported note text"
              rows={6}
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Paste the exported note text here"
            />
          </label>
          <button
            className="durin-primary"
            disabled={noteText.trim().length === 0}
            onClick={() =>
              props.onReady({
                sourceType,
                filename: filename.trim() || "pasted-note.txt",
                content: noteText,
                encoding: "utf8_text",
                mediaType: "text/plain"
              })
            }
          >
            Preview source
          </button>
        </>
      ) : (
        <>
          <label className="durin-field">
            File
            <input ref={fileRef} type="file" aria-label="Source file" />
          </label>
          <button
            className="durin-primary"
            onClick={() => {
              const file = fileRef.current?.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                props.onReady({
                  sourceType,
                  filename: file.name,
                  // The data: URL is the base64 serialization we preserve
                  // and hash — a documented Slice 0 representation limit.
                  content: String(reader.result),
                  encoding: "base64",
                  mediaType: file.type || "application/octet-stream"
                });
              };
              reader.readAsDataURL(file);
            }}
          >
            Preview source
          </button>
        </>
      )}
      <button onClick={props.onCancel}>Cancel</button>
    </section>
  );
}

function SourcePreview(props: { draft: Draft }) {
  const { draft } = props;
  return (
    <div className="durin-card">
      <div className="durin-card-head">
        <span className="durin-badge durin-badge-original">ORIGINAL</span>
        <strong>{draft.filename}</strong>
      </div>
      <p className="durin-muted">Preserved exactly as provided — processing never alters this source.</p>
      {draft.encoding === "utf8_text" && <pre className="durin-pre">{draft.content}</pre>}
      {draft.encoding === "base64" && draft.mediaType.startsWith("image/") && (
        <img className="durin-preview-img" src={draft.content} alt={`Preview of ${draft.filename}`} />
      )}
      {draft.encoding === "base64" && draft.mediaType.startsWith("audio/") && (
        <audio controls src={draft.content} aria-label={`Audio preview of ${draft.filename}`} />
      )}
      {draft.encoding === "base64" && !draft.mediaType.startsWith("image/") && !draft.mediaType.startsWith("audio/") && (
        <p className="durin-muted">
          {draft.mediaType} · {draft.content.length.toLocaleString()} preserved characters (base64). Inline preview is
          limited in Slice 0; the bytes are preserved untouched.
        </p>
      )}
    </div>
  );
}

function LaneScreen(props: { draft: Draft; onBack: () => void; onConfirm: (lane: PrivacyLane | null, hold: boolean) => void }) {
  const [choice, setChoice] = useState<"hold" | PrivacyLane>("hold");
  return (
    <section>
      <h2>Preview &amp; confirm privacy lane</h2>
      <SourcePreview draft={props.draft} />
      <p className="durin-muted">
        Lanes are closed by default. If you are not sure — or the material is mixed — keep it in unsorted holding; it
        will not be routed to a guessed destination.
      </p>
      <div role="radiogroup" aria-label="Privacy lane">
        <label className="durin-lane">
          <input type="radio" name="lane" checked={choice === "hold"} onChange={() => setChoice("hold")} />
          Hold in unsorted holding (default — fail closed)
        </label>
        {PRIVACY_LANES.filter((lane) => lane !== "unsorted_holding").map((lane) => (
          <label key={lane} className="durin-lane">
            <input type="radio" name="lane" checked={choice === lane} onChange={() => setChoice(lane)} />
            {LANE_LABELS[lane]}
          </label>
        ))}
      </div>
      <button className="durin-primary" onClick={() => props.onConfirm(choice === "hold" ? null : choice, choice === "hold")}>
        Confirm and admit
      </button>
      <button onClick={props.onBack}>Back</button>
    </section>
  );
}

function DerivationScreen(props: {
  spine: DurinSpine;
  artifact: SourceArtifact;
  imported: ManualImportResult | null;
  guard: <T>(action: () => T) => T | undefined;
  onNext: () => void;
}) {
  const [manualText, setManualText] = useState("");
  const derivations = props.spine.derivationsFor(props.artifact.artifactId);
  const sourceType = props.spine.envelopeFor(props.artifact.intakeId)?.sourceType ?? props.imported?.envelope.sourceType;
  const manualKind =
    sourceType === "audio_recording" ? "transcript" : sourceType === "pdf_scan" ? "extracted_text" : "description";
  return (
    <section>
      <h2>Inspect derivation</h2>
      <div className="durin-card">
        <div className="durin-card-head">
          <span className="durin-badge durin-badge-original">ORIGINAL</span>
          <strong>{props.artifact.originalFilename}</strong>
        </div>
        <p className="durin-hash">{props.artifact.contentHash}</p>
        <p className="durin-muted">
          state: <b>{props.artifact.state}</b> · deletion: <b>{props.artifact.deletionState}</b>
        </p>
      </div>
      {derivations.map((derived) => (
        <div key={derived.derivedId} className="durin-card">
          <div className="durin-card-head">
            <span className="durin-badge durin-badge-derived">DERIVED</span>
            <strong>{derived.kind}</strong>
          </div>
          <p className="durin-muted">
            generator: {derived.generator.name}@{derived.generator.version} ({derived.generator.method})
          </p>
          <p className="durin-hash">{derived.contentHash}</p>
        </div>
      ))}
      <label className="durin-field">
        Add a manual {manualKind.replace("_", " ")} (kept separate from the original)
        <textarea
          aria-label="Manual derivation text"
          rows={4}
          value={manualText}
          onChange={(event) => setManualText(event.target.value)}
        />
      </label>
      <button
        disabled={manualText.trim().length === 0}
        onClick={() => {
          const created = props.guard(() =>
            attachManualDerivation(props.spine, props.artifact.artifactId, manualKind, manualText, OPERATOR)
          );
          if (created) setManualText("");
        }}
      >
        Attach {manualKind.replace("_", " ")}
      </button>
      <button className="durin-primary" onClick={props.onNext}>
        Continue to themes
      </button>
    </section>
  );
}

function AssertionCard(props: { assertion: ThemeAssertion; children?: React.ReactNode }) {
  const { assertion } = props;
  return (
    <div className={`durin-card durin-review-${assertion.reviewState}`}>
      <div className="durin-card-head">
        <span className="durin-badge">{assertion.themeType}</span>
        <strong>{assertion.value}</strong>
      </div>
      <p className="durin-muted">
        confidence: <b>{assertion.confidence.toFixed(2)}</b> · evidence: <b>{assertion.evidencePointer}</b> · provenance:{" "}
        <b>
          {assertion.generator.name}@{assertion.generator.version} ({assertion.generator.method})
        </b>
      </p>
      <p className="durin-muted">
        review state: <b>{assertion.reviewState}</b> · privacy scope: <b>{LANE_LABELS[assertion.privacyScope]}</b>
        {assertion.supersedesAssertionId !== null && <> · supersedes {assertion.supersedesAssertionId}</>}
        {assertion.supersededByAssertionId !== null && <> · superseded by {assertion.supersededByAssertionId}</>}
      </p>
      {props.children}
    </div>
  );
}

function ThemeScreen(props: {
  spine: DurinSpine;
  artifact: SourceArtifact;
  guard: <T>(action: () => T) => T | undefined;
  onNext: () => void;
}) {
  const disposition = props.spine.dispositionFor(props.artifact.artifactId);
  const defaultScope: PrivacyLane = disposition?.lane ?? "unsorted_holding";
  const [themeType, setThemeType] = useState<(typeof THEME_TYPES)[number]>("story_memory");
  const [value, setValue] = useState("");
  const [confidence, setConfidence] = useState("0.9");
  const [evidence, setEvidence] = useState("manual:operator note");
  const [scope, setScope] = useState<PrivacyLane>(defaultScope);
  // Object / heirloom extras (no pricing or valuation — not authorized).
  const isObject = props.spine.envelopeFor(props.artifact.intakeId)?.sourceType === "object_photo";
  const [objectLabel, setObjectLabel] = useState("");
  const [provenance, setProvenance] = useState("");
  const [condition, setCondition] = useState("");
  const [intent, setIntent] = useState<"keep" | "sell" | "unknown">("unknown");
  const [related, setRelated] = useState("");
  const assertions = props.spine.assertionsFor(props.artifact.artifactId);
  const derivations = props.spine.derivationsFor(props.artifact.artifactId);

  return (
    <section>
      <h2>Propose themes (manual tagging)</h2>
      <label className="durin-field">
        Theme type
        <select aria-label="Theme type" value={themeType} onChange={(event) => setThemeType(event.target.value as (typeof THEME_TYPES)[number])}>
          {THEME_TYPES.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </label>
      <label className="durin-field">
        Value
        <input aria-label="Theme value" value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <label className="durin-field">
        Confidence (0–1)
        <input aria-label="Confidence" value={confidence} onChange={(event) => setConfidence(event.target.value)} />
      </label>
      <label className="durin-field">
        Evidence pointer
        <input aria-label="Evidence pointer" value={evidence} onChange={(event) => setEvidence(event.target.value)} />
      </label>
      <label className="durin-field">
        Privacy scope
        <select aria-label="Privacy scope" value={scope} onChange={(event) => setScope(event.target.value as PrivacyLane)}>
          {PRIVACY_LANES.map((lane) => (
            <option key={lane} value={lane}>
              {LANE_LABELS[lane]}
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={value.trim().length === 0}
        onClick={() => {
          const parsed = Number(confidence);
          props.guard(() =>
            props.spine.proposeAssertion({
              sourceArtifactId: props.artifact.artifactId,
              derivedRepresentationId: derivations[0]?.derivedId ?? null,
              themeType,
              value,
              confidence: Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.5,
              evidencePointer: evidence,
              generator: MANUAL_GENERATOR,
              privacyScope: scope
            })
          );
          setValue("");
        }}
      >
        Propose theme
      </button>

      {isObject && (
        <div className="durin-card">
          <h3>Object / heirloom details</h3>
          <p className="durin-muted">No listing, pricing, or valuation — Slice 0 records meaning, not market.</p>
          <label className="durin-field">
            Object label
            <input aria-label="Object label" value={objectLabel} onChange={(event) => setObjectLabel(event.target.value)} />
          </label>
          <label className="durin-field">
            Family provenance
            <input aria-label="Family provenance" value={provenance} onChange={(event) => setProvenance(event.target.value)} />
          </label>
          <label className="durin-field">
            Condition note
            <input aria-label="Condition note" value={condition} onChange={(event) => setCondition(event.target.value)} />
          </label>
          <label className="durin-field">
            Keep / sell intent
            <select aria-label="Keep or sell intent" value={intent} onChange={(event) => setIntent(event.target.value as "keep" | "sell" | "unknown")}>
              <option value="keep">keep</option>
              <option value="sell">sell</option>
              <option value="unknown">unknown / uncertain</option>
            </select>
          </label>
          <label className="durin-field">
            Related person or event
            <input aria-label="Related person or event" value={related} onChange={(event) => setRelated(event.target.value)} />
          </label>
          <button
            disabled={objectLabel.trim().length === 0}
            onClick={() =>
              props.guard(() =>
                proposeObjectDetails(
                  props.spine,
                  props.artifact.artifactId,
                  derivations[0]?.derivedId ?? null,
                  {
                    objectLabel,
                    familyProvenance: provenance.trim() || undefined,
                    conditionNote: condition.trim() || undefined,
                    intent,
                    relatedPersonOrEvent: related.trim() || undefined
                  },
                  scope
                )
              )
            }
          >
            Propose object details
          </button>
        </div>
      )}

      <h3>Proposed so far</h3>
      {assertions.map((assertion) => (
        <AssertionCard key={assertion.assertionId} assertion={assertion} />
      ))}
      <button className="durin-primary" onClick={props.onNext}>
        Continue to review
      </button>
    </section>
  );
}

function ReviewScreen(props: {
  spine: DurinSpine;
  artifact: SourceArtifact;
  guard: <T>(action: () => T) => T | undefined;
  onNext: () => void;
}) {
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [correctionValue, setCorrectionValue] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const assertions = props.spine.assertionsFor(props.artifact.artifactId);
  return (
    <section>
      <h2>Human review</h2>
      <p className="durin-muted">
        Review history is append-only: corrections supersede, rejections stay on the record, nothing is erased.
      </p>
      {assertions.map((assertion) => (
        <AssertionCard key={assertion.assertionId} assertion={assertion}>
          {(assertion.reviewState === "proposed" || assertion.reviewState === "uncertain" || assertion.reviewState === "corrected") && (
            <div className="durin-actions">
              <button onClick={() => props.guard(() => props.spine.reviewAssertion(assertion.assertionId, "approved", OPERATOR))}>
                Approve
              </button>
              {assertion.reviewState !== "corrected" && (
                <>
                  <button onClick={() => props.guard(() => props.spine.reviewAssertion(assertion.assertionId, "rejected", OPERATOR))}>
                    Reject
                  </button>
                  {assertion.reviewState !== "uncertain" && (
                    <button onClick={() => props.guard(() => props.spine.reviewAssertion(assertion.assertionId, "uncertain", OPERATOR))}>
                      Uncertain
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          {assertion.reviewState === "approved" && (
            <div className="durin-actions">
              <button onClick={() => setCorrecting(assertion.assertionId)}>Correct…</button>
            </div>
          )}
          {correcting === assertion.assertionId && (
            <div className="durin-correction">
              <label className="durin-field">
                Corrected value
                <input aria-label="Corrected value" value={correctionValue} onChange={(event) => setCorrectionValue(event.target.value)} />
              </label>
              <label className="durin-field">
                Why (telemetry)
                <input aria-label="Correction reason" value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} />
              </label>
              <button
                disabled={correctionValue.trim().length === 0 || correctionReason.trim().length === 0}
                onClick={() => {
                  props.guard(() =>
                    props.spine.correctAssertion(
                      assertion.assertionId,
                      { value: correctionValue, confidence: 0.95, evidencePointer: "manual:correction" },
                      correctionReason,
                      "wrong_theme_value",
                      OPERATOR
                    )
                  );
                  setCorrecting(null);
                  setCorrectionValue("");
                  setCorrectionReason("");
                }}
              >
                Supersede with correction
              </button>
            </div>
          )}
        </AssertionCard>
      ))}
      <button className="durin-primary" onClick={props.onNext}>
        Continue to disposition
      </button>
    </section>
  );
}

function DispositionScreen(props: {
  spine: DurinSpine;
  artifact: SourceArtifact;
  guard: <T>(action: () => T) => T | undefined;
  onReceipt: (receipt: IntakeReceipt) => void;
  onHome: () => void;
}) {
  const [lane, setLane] = useState<PrivacyLane>("unsorted_holding");
  const [reason, setReason] = useState("");
  const artifact = props.artifact;
  const disposition = props.spine.dispositionFor(artifact.artifactId);
  return (
    <section>
      <h2>Disposition</h2>
      <p className="durin-muted">
        Current state: <b>{artifact.state}</b>
        {disposition && (
          <>
            {" "}
            · current lane: <b>{LANE_LABELS[disposition.lane]}</b>
          </>
        )}
      </p>
      {(artifact.state === "derived" || artifact.state === "held" || artifact.state === "preserved") && (
        <button
          onClick={() => props.guard(() => props.spine.transitionSource(artifact.artifactId, "reviewed", OPERATOR, "human review complete"))}
        >
          Mark reviewed
        </button>
      )}
      {artifact.state === "reviewed" && (
        <button onClick={() => props.guard(() => props.spine.transitionSource(artifact.artifactId, "admitted", OPERATOR, "admit after review"))}>
          Admit
        </button>
      )}
      {artifact.state === "admitted" && (
        <>
          <label className="durin-field">
            Destination lane
            <select aria-label="Destination lane" value={lane} onChange={(event) => setLane(event.target.value as PrivacyLane)}>
              {PRIVACY_LANES.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {LANE_LABELS[candidate]}
                </option>
              ))}
            </select>
          </label>
          <label className="durin-field">
            Routing reason
            <input aria-label="Routing reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <button
            className="durin-primary"
            disabled={reason.trim().length === 0}
            onClick={() => props.guard(() => props.spine.route(artifact.artifactId, lane, OPERATOR, reason))}
          >
            Route to lane
          </button>
        </>
      )}
      {(artifact.state === "routed" || artifact.state === "held") && (
        <button
          className="durin-primary"
          onClick={() => {
            const issued = props.guard(() => props.spine.issueReceipt(artifact.intakeId, OPERATOR));
            if (issued) props.onReceipt(issued);
          }}
        >
          Open receipt
        </button>
      )}
      <button onClick={props.onHome}>Back to sources</button>
    </section>
  );
}

function ReceiptScreen(props: {
  spine: DurinSpine;
  receipt: IntakeReceipt;
  guard: <T>(action: () => T) => T | undefined;
  onHome: () => void;
}) {
  const [reopenResult, setReopenResult] = useState<string | null>(null);
  const { receipt } = props;
  return (
    <section>
      <h2>Intake receipt</h2>
      <div className="durin-card">
        <strong>{receipt.receiptId}</strong>
        <p className="durin-muted">created {receipt.createdAt}</p>
        <dl className="durin-receipt">
          <dt>What entered</dt>
          <dd>
            {receipt.whatEntered.sourceArtifactId} ({receipt.whatEntered.sourceType})
            <span className="durin-hash"> {receipt.whatEntered.contentHash}</span>
          </dd>
          <dt>What was derived</dt>
          <dd>{receipt.whatWasDerived.join(", ") || "nothing"}</dd>
          <dt>What was approved</dt>
          <dd>{receipt.whatWasApproved.join(", ") || "nothing"}</dd>
          <dt>Rejected or held</dt>
          <dd>{receipt.whatWasRejectedOrHeld.join(", ") || "nothing"}</dd>
          <dt>Remained private</dt>
          <dd>{receipt.whatRemainedPrivate.join(", ") || "—"}</dd>
          <dt>Routed to</dt>
          <dd>{LANE_LABELS[receipt.routedTo]}</dd>
          <dt>Source state</dt>
          <dd>
            {receipt.sourceState} — <em>not deleted; filing states are not deletion</em>
          </dd>
          <dt>Deletion state</dt>
          <dd>{receipt.deletionState}</dd>
          <dt>Reopen digest</dt>
          <dd className="durin-hash">{receipt.reopenDigest}</dd>
        </dl>
        <button
          onClick={() => {
            const result = props.guard(() => props.spine.reopenReceipt(receipt.receiptId));
            setReopenResult(
              result ? "Reopen verified: records reconstruct deterministically to the same digest." : "Reopen FAILED — see error above."
            );
          }}
        >
          Reopen receipt (verify)
        </button>
        {reopenResult !== null && <p className="durin-notice">{reopenResult}</p>}
      </div>
      <button onClick={props.onHome}>Back to sources</button>
    </section>
  );
}
