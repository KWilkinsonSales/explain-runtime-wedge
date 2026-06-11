import { explainAdlMission } from "./mission";
import type { CompletionResult, RuntimeState } from "./types";

export function canStartVoiceMission(state: RuntimeState): boolean {
  return (
    state.voice.connectionStatus === "connected" &&
    state.voice.voiceVerified === true &&
    state.voice.fallbackUsed === false
  );
}

export function evaluateCompletion(state: RuntimeState): CompletionResult {
  if (state.endedReason) {
    const technical = state.endedReason.startsWith("technical:");
    return {
      status: technical ? "TECHNICAL_FAILURE" : "ENDED_EARLY",
      missing: [],
      canClose: true
    };
  }

  const checks: Record<string, boolean> = {
    mustEstablishBoundedPurpose: state.progress.openingEstablished,
    mustSurfaceDecisionEnvironment: state.progress.decisionEnvironmentFound,
    mustReflectEnvironment:
      state.progress.environmentReflected &&
      (state.evidence.hiddenPressures.length > 0 || state.evidence.missingContext.length > 0) &&
      state.evidence.roles.length > 0,
    mustExplainDistinction: state.progress.adlDistinctionExplained,
    mustAttemptDemoOrRecordDecline:
      state.progress.demonstrationCompleted || state.progress.demoDeclined,
    mustAskRelevanceOrWrong: state.progress.finalQuestionAsked,
    mustCheckHandoff: state.progress.handoffChecked,
    mustCloseExplicitly: state.progress.closedExplicitly,
    mustWriteReceipt: state.progress.receiptWritten,
    mustDisposeState: state.progress.disposed
  };

  const missing = Object.entries(explainAdlMission.completionRequirements)
    .filter(([key, required]) => required && !checks[key])
    .map(([key]) => key);

  return {
    status: missing.length === 0 ? "COMPLETED" : "RUNNING",
    missing,
    canClose: missing.length === 0
  };
}

export function voiceOperationalReport(state: RuntimeState) {
  return {
    neuralRealtimeVoiceUsed: state.voice.provider === "realtime_neural",
    browserSpeechSynthesisUsed: false,
    silentFallbackOccurred: state.voice.fallbackUsed,
    firstAudioLatencyPassed: state.voice.firstAudioReceived,
    interruptiblePassed: state.voice.recipientInterrupted,
    bargeInPassed: state.voice.bargeInHandled,
    naturalPacingPassed: false,
    noAnnouncerCadencePassed: false,
    pronunciationPassed: false,
    humanListenerAccepted: false
  };
}
