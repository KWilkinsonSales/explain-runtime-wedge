import type { MissionPackage, RuntimeState } from "./types";

export const explainAdlMission: MissionPackage = {
  id: "explain-adl-founder-envoy",
  version: "0.1.0",
  missionType: "explain_adl",
  skin: {
    voiceProfile: "founder_envoy",
    voiceRequirements: {
      neuralRealtimeVoice: true,
      allowBrowserSpeechSynthesis: false,
      allowOperatingSystemVoice: false,
      allowRoboticFallback: false,
      naturalTurnTaking: true,
      interruptible: true,
      emotionallyResponsive: true,
      maximumOpeningDelayMs: 1200
    },
    deliveryStyle: {
      pace: "measured_conversational",
      warmth: "calm_confident",
      energy: "engaged_not_theatrical",
      sentenceLength: "short_spoken",
      useNaturalPauses: true,
      avoidAnnouncerCadence: true,
      avoidOverEnunciation: true,
      avoidConstantCheerfulness: true
    }
  },
  script: {
    firstLine: "Hi. Kellen asked me to explain ADL in a way that connects to your world.",
    openingContinuation: "This is not a pitch. I have one short job: ask you a couple of questions, use what you tell me, and show you why ADL starts to feel inevitable once decisions become consequential.",
    discoveryQuestion: "In your world, where does a decision look simple on paper but become messy once real people touch it?",
    demoPrompt: "Give me the decision in one sentence.",
    revealLine: "The decision was never just the decision. It was the environment around it.",
    adlDistinction: "ADL does not make the decision. It makes the environment around the decision visible, explainable, and governable before consequence hardens.",
    relevanceQuestion: "What part of that feels most relevant—or most wrong—to you?",
    handoffQuestion: "Do you have a question or message for Kellen?",
    closeLine: "That is the explanation. I will bring your question back to Kellen, and this room will now close. Goodbye."
  },
  constraints: {
    authority: "understanding_only",
    noScheduling: true,
    noConsulting: true,
    noFeatureDump: true,
    singleUse: true
  },
  completionRequirements: {
    mustEstablishBoundedPurpose: true,
    mustSurfaceDecisionEnvironment: true,
    mustReflectEnvironment: true,
    mustExplainDistinction: true,
    mustAttemptDemoOrRecordDecline: true,
    mustAskRelevanceOrWrong: true,
    mustCheckHandoff: true,
    mustCloseExplicitly: true,
    mustWriteReceipt: true,
    mustDisposeState: true
  },
  receiptSchema: {
    fields: [
      "recipient",
      "missionStatus",
      "decisionEnvironment",
      "hoverSignalObserved",
      "primaryQuestion",
      "demonstrationTopic",
      "handoffType",
      "messageForKellen"
    ]
  }
};

export function createInitialState(): RuntimeState {
  return {
    mission: { type: "explain_adl", status: "WAITING", authority: "understanding_only" },
    recipient: { displayName: null, role: null, approvedContext: null },
    progress: {
      openingEstablished: false,
      decisionEnvironmentFound: false,
      environmentReflected: false,
      adlDistinctionExplained: false,
      demonstrationCompleted: false,
      demoDeclined: false,
      hoverSignalObserved: false,
      finalQuestionAsked: false,
      handoffChecked: false,
      closedExplicitly: false,
      receiptWritten: false,
      disposed: false
    },
    evidence: {
      decision: null,
      hiddenPressures: [],
      roles: [],
      missingContext: [],
      formingConsequence: null,
      questionOrObjection: null,
      handoffType: "none",
      messageForKellen: null,
      demonstrationTopic: null
    },
    voice: {
      provider: "realtime_neural",
      profile: "founder_envoy",
      connectionStatus: "disconnected",
      voiceVerified: false,
      fallbackUsed: false,
      firstAudioReceived: false,
      recipientInterrupted: false,
      bargeInHandled: false,
      audioFailure: null
    },
    endedReason: null
  };
}
