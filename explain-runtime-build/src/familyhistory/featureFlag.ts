// FEATURE_FHGI_OS_SLICE0 — Family History & Genealogy Intelligence OS, Slice 0.
//
// Same single-flip idiom as teacherprep/durin/council, with one difference:
// this surface defaults OFF. It only mounts when the environment explicitly
// sets VITE_FEATURE_FHGI_OS_SLICE0=true (e.g. `VITE_FEATURE_FHGI_OS_SLICE0=true
// npm run dev`). When off, /family-history falls back to the Companion app
// like every other unrecognized path.
const raw: unknown = import.meta.env?.VITE_FEATURE_FHGI_OS_SLICE0;

export const FEATURE_FHGI_OS_SLICE0: boolean = raw === "true" || raw === "1" || raw === true;
