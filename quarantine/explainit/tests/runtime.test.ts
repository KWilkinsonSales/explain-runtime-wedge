import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/mission";
import { canStartVoiceMission, evaluateCompletion } from "../src/runtime";

describe("voice gate", () => {
  it("blocks WAITING → RUNNING until connected, verified, and zero fallback", () => {
    const state = createInitialState();
    expect(canStartVoiceMission(state)).toBe(false);
    state.voice.connectionStatus = "connected";
    state.voice.voiceVerified = true;
    expect(canStartVoiceMission(state)).toBe(true);
    state.voice.fallbackUsed = true;
    expect(canStartVoiceMission(state)).toBe(false);
  });
});

describe("completion evaluator", () => {
  it("does not confuse a partial conversation with completion", () => {
    const state = createInitialState();
    state.progress.openingEstablished = true;
    expect(evaluateCompletion(state).status).toBe("RUNNING");
    expect(evaluateCompletion(state).missing).toContain("mustSurfaceDecisionEnvironment");
  });

  it("passes only after lifecycle, receipt, and disposal evidence", () => {
    const state = createInitialState();
    Object.assign(state.progress, {
      openingEstablished: true,
      decisionEnvironmentFound: true,
      environmentReflected: true,
      adlDistinctionExplained: true,
      demonstrationCompleted: true,
      finalQuestionAsked: true,
      handoffChecked: true,
      closedExplicitly: true,
      receiptWritten: true,
      disposed: true
    });
    state.evidence.hiddenPressures = ["delivery pressure"];
    state.evidence.roles = ["finance"];
    expect(evaluateCompletion(state)).toEqual({ status: "COMPLETED", missing: [], canClose: true });
  });
});
