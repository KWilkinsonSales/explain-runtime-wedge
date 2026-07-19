import React, { useEffect } from "react";
import FamilyHistoryApp from "./FamilyHistoryApp";
import FamilyHistoryShell from "./FamilyHistoryShell";
import { FEATURE_FHGI_OS_SLICE1 } from "../featureFlag";

// Route wrapper: sets the document identity while mounted and restores the
// previous title on unmount, same idiom as TeacherPrepRoute/CouncilRoute.
// Slice selection: with FEATURE_FHGI_OS_SLICE1 off (the default) this renders
// the Slice 0 Evidence Audit Desk exactly as before; with it on, the Slice 1
// shell wraps that same desk.
export default function FamilyHistoryRoute() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Family History Intelligence OS";
    document.body.classList.add("fhgi-page");
    return () => {
      document.title = previousTitle;
      document.body.classList.remove("fhgi-page");
    };
  }, []);

  return FEATURE_FHGI_OS_SLICE1 ? <FamilyHistoryShell /> : <FamilyHistoryApp />;
}
