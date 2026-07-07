import React, { useEffect, useState } from "react";
import { findIntent } from "./intents";
import { readTeleprompter, subscribeTeleprompter, type TeleprompterPayload } from "./teleprompterSync";
import { usePrototypeHeadTags } from "./usePrototypeHeadTags";
import "./prototype.css";

export default function TeleprompterView() {
  usePrototypeHeadTags();

  const [payload, setPayload] = useState<TeleprompterPayload | null>(() => readTeleprompter());

  useEffect(() => subscribeTeleprompter(setPayload), []);

  const intent = findIntent(payload?.intentId ?? null);

  return (
    <div className="teleprompter-view">
      <div>
        <p className="tag">Teleprompter proof surface</p>
        <p className="line">
          {payload?.text ?? "Waiting for a line from the Companion controller…"}
        </p>
        <p className="meta">
          {intent ? `${intent.word} — ${intent.label}` : "No intent selected"}
          {payload?.updatedAt ? ` · Updated ${new Date(payload.updatedAt).toLocaleTimeString()}` : ""}
        </p>
      </div>
    </div>
  );
}
