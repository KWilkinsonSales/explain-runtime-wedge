// Front-door routing, kept pure so it is testable.
//
// Four surfaces share this deployment:
//   - "/teacher" (and subpaths)  → LDS Teacher Preparation (flag-gated)
//   - "/durin" (and subpaths)    → Durin Intake, Slice 0 (flag-gated)
//   - "/" exactly                → product selector front door
//   - everything else            → Companion, unchanged (including
//                                  /companion/prototype and the teleprompter)
export type Surface = "teacher" | "durin" | "selector" | "companion";

export function resolveSurface(pathname: string, teacherPrepEnabled: boolean, durinEnabled = false): Surface {
  if (teacherPrepEnabled && (pathname === "/teacher" || pathname.startsWith("/teacher/"))) {
    return "teacher";
  }
  if (durinEnabled && (pathname === "/durin" || pathname.startsWith("/durin/"))) {
    return "durin";
  }
  if (pathname === "/" || pathname === "") {
    return "selector";
  }
  return "companion";
}
