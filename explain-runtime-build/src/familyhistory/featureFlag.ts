// FEATURE_FHGI_OS_SLICE0 — Family History & Genealogy Intelligence OS, Slice 0.
//
// Same single-flip idiom as teacherprep/durin/council, with one difference:
// this surface defaults OFF. It only mounts when the environment explicitly
// sets VITE_FEATURE_FHGI_OS_SLICE0=true (e.g. `VITE_FEATURE_FHGI_OS_SLICE0=true
// npm run dev`). When off, /family-history falls back to the Companion app
// like every other unrecognized path.
const raw: unknown = import.meta.env?.VITE_FEATURE_FHGI_OS_SLICE0;

export const FEATURE_FHGI_OS_SLICE0: boolean = raw === "true" || raw === "1" || raw === true;

// FEATURE_FHGI_OS_SLICE1 — Tree + Person Workspace shell. Also defaults OFF.
// When off, /family-history renders the Slice 0 Evidence Audit Desk exactly
// as before; when on, the shell wraps that same desk (it never replaces it).
// Slice 1 only exists inside the surface, so Slice 0's flag still gates the
// route itself.
const rawSlice1: unknown = import.meta.env?.VITE_FEATURE_FHGI_OS_SLICE1;

export const FEATURE_FHGI_OS_SLICE1: boolean =
  rawSlice1 === "true" || rawSlice1 === "1" || rawSlice1 === true;
