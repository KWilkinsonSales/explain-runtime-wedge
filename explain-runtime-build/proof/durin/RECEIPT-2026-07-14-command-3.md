# Command Receipt — Durin Multimodal Theme Intake, Slice 0, Command 3

**Date:** 2026-07-14
**Command:** 3 of 5 — Manual adapters and review surface
**Branch:** `claude/durin-intake-slice-0-eu4l9p` (restarted from `main` @ `d32cfd2` after PR #29 merged Command 2)
**Verdict:** Command 3 mechanically complete; awaiting human review before Command 4.

## Preconditions verified

- Commands 1–2 merged to `main` via PRs #28 and #29 (human acceptance of both receipts).
- Designated branch restarted from latest `main` per the merged-PR follow-up rule.

## What was built

### Adapters (`src/durin/adapters.ts` — new)

One shared import rail (`importSource`) for all five source types: audio recording, exported Note/text, PDF/scan, family photo, object/heirloom photo. Adapter differences are data (source type, media type, encoding) — never a different admission path. Guarantees, in order: **preserve** (the exact text or base64 export string is what `admit()` writes to the content store before any state advances) → **hash before admission** (adapter computes the envelope hash; the spine independently recomputes and refuses mismatches) → **derive after** (deterministic metadata and manual transcripts/descriptions are separate `DerivedRepresentation` records; originals are never rewritten).

- **No Apple connections:** input is only an operator-chosen file or pasted text; nothing is moved or deleted at the source (tested: adapters contain no removal API calls).
- **Safe deterministic metadata only:** source type, filename, declared media type, encoding, byte length, and text line/character counts. Deliberately not extracted (documented limits): EXIF, GPS, faces, device identifiers, embedded PDF metadata, audio duration.
- **Libraries documented:** none — TextEncoder plus the repo's own pure sha256; adapters 0.1.0 over contracts 0.1.0. Binary payloads are preserved/hashed as their base64 (data-URL) serialization — a documented Slice 0 representation limit.
- **Object/heirloom tagging (`proposeObjectDetails`):** object label, family provenance, condition note, keep/sell/unknown intent, related person/event; unknown intent proposed at low confidence so review reads uncertain. No listing, pricing, or valuation field exists anywhere (tested).

### Review surface (`src/durin/ui/` — new; `/durin`, flag-gated)

The minimum responsive flow, exactly as ordered: **import → preview (labeled ORIGINAL) → confirm privacy lane (default = hold in unsorted holding, fail closed) → inspect deterministic derivation (labeled DERIVED with generator@version+method) → propose/create themes (manual tagging first-class) → approve / correct / reject / uncertain → review disposition → admit or hold → open receipt (with in-browser deterministic reopen verification)**. Every assertion card shows confidence, evidence pointer, provenance, review state, and privacy scope. The no-delete boundary is stated verbatim on every screen and on the receipt. Device-local only — the walkthrough proves zero non-localhost requests.

### Existing files touched (smallest possible, behavior preserved)

- `src/routeGate.ts` — fourth flag-gated surface (`/durin`); the pre-Durin call shape still resolves identically (tested).
- `src/main.tsx` — mounts `DurinRoute` for the new surface.
- `src/ProductSelector.tsx` — adds the Durin card (additive).
- `src/durin/spine.ts` — read-only projection listings for the UI (`listArtifacts`, `derivationsFor`, `assertionsFor`, `envelopeFor`, `listReceipts`); no write-path changes.
- `tests/routeGate.test.ts` — additive cases; all pre-existing cases unchanged.
- `src/durin/README.md`, `src/durin/ACCEPTANCE.md` — status updates.

## Exact commands and results

| Command | Result |
|---|---|
| `npx vitest run` | **222/222 pass** (18 files: 212 prior + 10 new adapter/route tests) |
| `npx tsc --noEmit` | zero new errors (only the pre-existing `deepgramTokenFunction.test.ts` TS5097, documented since Command 1) |
| `node proof/durin/browser-walkthrough.mjs` (Chromium 1194, phone viewport 390×844, vite dev) | **22/22 assertions PASS**; 9 screenshots at `proof/durin/0*-phone.png`; zero non-localhost network requests; no horizontal scroll on home/derivation/receipt |

Command 3's required test list, mapped: one IntakeEnvelope across all adapters (`durinAdapters.test.ts`), original/derived distinction (adapter + walkthrough badges), fail-closed lane defaults (adapter test + walkthrough default radio), append-only review history (adapter test), rejected assertions staying unapproved (adapter test), no-delete language (source-verbatim test + walkthrough), mobile viewport behavior (walkthrough at 390×844 with horizontal-scroll checks).

## Contradiction checks (none triggered)

- Adapter rewrites originals? No — post-derivation byte-for-byte and hash checks pass; the spine additionally refuses derivation when a stored original drifts.
- Previews leak restricted data? No — a preview renders only the source being imported to its own operator, inside its own intake flow; nothing is indexed or shown across intakes/lanes.
- UI cannot distinguish source from derivation? No — ORIGINAL/DERIVED badges with generator provenance, verified in the walkthrough.

## Failures / risks / deferrals

- Pre-existing app `tsc --noEmit` error unchanged (documented since Command 1).
- `playwright-core` is not a repo dependency; the walkthrough resolves it ad hoc (same precedent as the teacherprep proof script). Documented, not hidden.
- Binary hash is over the base64 data-URL serialization, not raw bytes (deterministic; documented limit; revisit if raw-byte hashing is required for external cross-checking).
- Not built (as ordered): face recognition, relationship inference, broad indexing, pricing/resale, photo alteration, retrieval surface, model proposals, deploy.
- No real personal data used; all test and walkthrough content is synthetic.
- Push interpretation unchanged: filed to the designated branch as a draft PR; no merge, no deploy (the Netlify deploy preview on PRs is repo-configured platform behavior).

## Next authorized command

Command 4 — Meaning retrieval and bounded assistance — **only after this
receipt is reviewed and accepted by a human.**
