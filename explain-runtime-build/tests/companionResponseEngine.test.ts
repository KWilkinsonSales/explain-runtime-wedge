import { describe, expect, it } from "vitest";
import {
  FALLBACK_SPEAK,
  FALLBACK_STEER,
  ResponseEngine,
  type EngineResponse,
  type ResponseProvider
} from "../src/prototype/responseEngine";
import { runAdmissionRail } from "../src/prototype/admissionSourceAdapter";

function countingProvider() {
  let calls = 0;
  const provider: ResponseProvider = (input) => {
    calls += 1;
    return runAdmissionRail(input);
  };
  return { provider, calls: () => calls };
}

describe("session lifecycle", () => {
  it("each activation gets its own session ID; close is clean and final", async () => {
    const first = new ResponseEngine();
    const second = new ResponseEngine();
    expect(first.sessionId).not.toBe(second.sessionId);

    first.close();
    expect(first.isClosed).toBe(true);
    expect(first.currentResponse).toBeNull();
    // Nothing is admitted after close.
    expect(first.admit("hello?", "paste_text").event).toBeNull();
    expect(await first.admitAndExecute("hello?", "paste_text")).toBeNull();
  });
});

describe("one event → one execution → one rendered answer", () => {
  it("executes the provider exactly once per admitted event", async () => {
    const { provider, calls } = countingProvider();
    const rendered: EngineResponse[] = [];
    const engine = new ResponseEngine(provider, { onResponse: (response) => rendered.push(response) });

    const response = await engine.admitAndExecute("What is the next step?", "browser_mic");
    expect(response!.speak.length).toBeGreaterThan(0);
    expect(response!.steer.length).toBeGreaterThan(0);
    expect(calls()).toBe(1);
    expect(rendered.length).toBe(1);
    expect(rendered[0].eventId).toBe(response!.eventId);
  });

  it("execute is idempotent for the same event ID", async () => {
    const { provider, calls } = countingProvider();
    const engine = new ResponseEngine(provider);
    const { event } = engine.admit("What is the next step?", "browser_mic");
    const [a, b, c] = await Promise.all([engine.execute(event!), engine.execute(event!), engine.execute(event!)]);
    expect(calls()).toBe(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("suppresses duplicate admission of the same utterance", async () => {
    const { provider, calls } = countingProvider();
    const engine = new ResponseEngine(provider);
    await engine.admitAndExecute("We should hold the line.", "browser_mic");
    const duplicate = engine.admit("  we should hold   the line. ", "browser_mic");
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.event).toBeNull();
    expect(await engine.admitAndExecute("We should hold the line.", "browser_mic")).toBeNull();
    expect(calls()).toBe(1);
  });

  it("ignores empty admissions", () => {
    const engine = new ResponseEngine();
    expect(engine.admit("   ", "browser_mic")).toEqual({ event: null, duplicate: false });
  });
});

describe("stale in-flight work is superseded", () => {
  it("an older slow response is never rendered as current once a newer event exists", async () => {
    const rendered: EngineResponse[] = [];
    let releaseFirst: (() => void) | null = null;
    const provider: ResponseProvider = async (input) => {
      if (input.text_chunk === "first utterance") {
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      }
      return runAdmissionRail(input);
    };
    const engine = new ResponseEngine(provider, { onResponse: (response) => rendered.push(response) });

    const firstPromise = engine.admitAndExecute("first utterance", "browser_mic");
    const second = await engine.admitAndExecute("second utterance?", "browser_mic");
    expect(second!.superseded).toBe(false);

    releaseFirst!();
    const first = await firstPromise;
    expect(first!.superseded).toBe(true);

    // Only the newer answer was rendered; the current answer stays the newer one.
    expect(rendered.map((response) => response.eventId)).toEqual([second!.eventId]);
    expect(engine.currentResponse!.eventId).toBe(second!.eventId);
  });
});

describe("provider failure", () => {
  it("falls back to the stable sentence instead of crashing or going silent", async () => {
    const failing: ResponseProvider = () => {
      throw new Error("provider exploded");
    };
    const states: string[] = [];
    const engine = new ResponseEngine(failing, { onState: (state) => states.push(state) });
    const response = await engine.admitAndExecute("Anything at all?", "browser_mic");
    expect(response!.fallback).toBe(true);
    expect(response!.speak).toBe(FALLBACK_SPEAK);
    expect(response!.steer).toBe(FALLBACK_STEER);
    expect(states).toEqual(["thinking", "error"]);
  });
});

describe("transcript evidence stays separate from guidance", () => {
  it("the admission receipt rides on the response without altering SPEAK/STEER", async () => {
    const engine = new ResponseEngine();
    const response = await engine.admitAndExecute("Is the budget approved?", "paste_text");
    expect(response!.receipt).not.toBeNull();
    expect(response!.receipt!.event.text_chunk).toBe("Is the budget approved?");
    expect(response!.receipt!.source_receipt.source_provider).toBe("paste_text");
    expect(response!.receipt!.output.speak).toBe(response!.speak);
  });
});
