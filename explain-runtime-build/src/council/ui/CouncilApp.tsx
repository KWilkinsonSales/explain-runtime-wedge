import React, { useState } from "react";
import { deliberate } from "../engine";
import { ILLUSTRATIVE_LABEL } from "../fixtures";
import type { CouncilDeliberation } from "../types";
import "./council.css";

const STARTER_PROMPTS = ["Should we ship this now?", "Should we rearchitect this?", "Should we expand scope?"];

export default function CouncilApp() {
  const [question, setQuestion] = useState("");
  const [deliberation, setDeliberation] = useState<CouncilDeliberation | null>(null);

  function submit(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed) return;
    setDeliberation(deliberate(trimmed));
  }

  return (
    <main className="council-shell">
      <h1>Council</h1>
      <p className="council-disclaimer">{ILLUSTRATIVE_LABEL}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(question);
        }}
      >
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask the council a question…"
          aria-label="Question for the council"
        />
        <button type="submit">Convene</button>
      </form>
      <div className="council-starters">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              setQuestion(prompt);
              submit(prompt);
            }}
          >
            {prompt}
          </button>
        ))}
      </div>
      {deliberation && (
        <section aria-label="Council responses" className="council-responses">
          {deliberation.responses.map((response) => (
            <article key={response.perspectiveId} className="council-response-card">
              <h2>{response.name}</h2>
              <p className="council-stance">{response.stance}</p>
              <p>{response.response}</p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
