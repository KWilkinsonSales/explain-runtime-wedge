import React, { useEffect } from "react";
import TeacherPrepApp from "./TeacherPrepApp";

// Route wrapper: sets the document identity while mounted and restores the
// previous title on unmount, so the Companion app never inherits it.
export default function TeacherPrepRoute() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Teacher Preparation";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return <TeacherPrepApp />;
}
