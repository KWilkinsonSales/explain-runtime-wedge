import React, { useEffect } from "react";
import FamilyHistoryApp from "./FamilyHistoryApp";

// Route wrapper: sets the document identity while mounted and restores the
// previous title on unmount, same idiom as TeacherPrepRoute/CouncilRoute.
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

  return <FamilyHistoryApp />;
}
