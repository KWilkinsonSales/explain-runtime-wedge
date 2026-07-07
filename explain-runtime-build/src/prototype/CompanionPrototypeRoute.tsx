import React, { useMemo } from "react";
import CompanionPrototype from "./CompanionPrototype";
import TeleprompterView from "./TeleprompterView";

export default function CompanionPrototypeRoute() {
  const view = useMemo(() => new URLSearchParams(window.location.search).get("view"), []);
  return view === "teleprompter" ? <TeleprompterView /> : <CompanionPrototype />;
}
