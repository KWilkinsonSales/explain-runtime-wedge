// Front-door routing, kept pure so it is testable.
//
// Six surfaces share this deployment:
//   - "/teacher" (and subpaths)  → LDS Teacher Preparation (flag-gated)
//   - "/durin" (and subpaths)    → Durin Intake, Slice 0 (flag-gated)
//   - "/council" (and subpaths)  → Council, deterministic fixture prototype (flag-gated)
//   - "/family-history" (and subpaths) → Family History Intelligence OS,
//                                  Slice 0 (flag-gated, default OFF)
//   - "/" exactly                → product selector front door
//   - everything else            → Companion, unchanged (including
//                                  /companion/prototype and the teleprompter)
export type Surface = "teacher" | "durin" | "council" | "familyHistory" | "selector" | "companion";

export function resolveSurface(
  pathname: string,
  teacherPrepEnabled: boolean,
  durinEnabled = false,
  councilEnabled = false,
  familyHistoryEnabled = false
): Surface {
  if (teacherPrepEnabled && (pathname === "/teacher" || pathname.startsWith("/teacher/"))) {
    return "teacher";
  }
  if (durinEnabled && (pathname === "/durin" || pathname.startsWith("/durin/"))) {
    return "durin";
  }
  if (councilEnabled && (pathname === "/council" || pathname.startsWith("/council/"))) {
    return "council";
  }
  if (
    familyHistoryEnabled &&
    (pathname === "/family-history" || pathname.startsWith("/family-history/"))
  ) {
    return "familyHistory";
  }
  if (pathname === "/" || pathname === "") {
    return "selector";
  }
  return "companion";
}
