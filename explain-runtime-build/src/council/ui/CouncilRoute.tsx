import React, { useEffect } from "react";
import CouncilApp from "./CouncilApp";

// Route wrapper: sets the document identity while mounted and restores the
// previous title on unmount, same idiom as TeacherPrepRoute/DurinRoute.
export default function CouncilRoute() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Council";
    document.body.classList.add("council-page");
    return () => {
      document.title = previousTitle;
      document.body.classList.remove("council-page");
    };
  }, []);

  return <CouncilApp />;
}
