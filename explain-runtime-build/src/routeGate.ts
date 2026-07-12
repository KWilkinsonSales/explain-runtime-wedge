// Front-door routing, kept pure so it is testable.
//
// Three surfaces share this deployment:
//   - "/teacher" (and subpaths)  → LDS Teacher Preparation (flag-gated)
//   - "/" exactly                → product selector front door
//   - everything else            → Companion, unchanged (including
//                                  /companion/prototype and the teleprompter)
export type Surface = "teacher" | "selector" | "companion";

export function resolveSurface(pathname: string, teacherPrepEnabled: boolean): Surface {
  if (teacherPrepEnabled && (pathname === "/teacher" || pathname.startsWith("/teacher/"))) {
    return "teacher";
  }
  if (pathname === "/" || pathname === "") {
    return "selector";
  }
  return "companion";
}
