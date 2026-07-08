export type MissionStatus =
  | "WAITING"
  | "RUNNING"
  | "COMPLETED"
  | "INCOMPLETE"
  | "ENDED_EARLY"
  | "TECHNICAL_FAILURE"
  | "CLOSED";

export type NextAction =
  | "ask_discovery"
  | "reflect"
  | "reveal"
  | "ask_demo"
  | "do_demo"
  | "ask_relevance"
  | "check_handoff"
  | "close"
  | "noop";

export interface MissionPackage {
  id: string;
  version: string;
  missionType: string;
  skin: {
    voiceProfile: string;
    voiceRequirements: {
      neuralRealtimeVoice: boolean;
      allowBrowserSpeechSynthesis: boolean;
      allowOperatingSystemVoice: boolean;
      allowRoboticFallback: boolean;
      naturalTurnTaking: boolean;
      interruptible: boolean;
      emotionallyResponsive: boolean;
      maximumOpeningDelayMs: number;
    };
    deliveryStyle: Record<string, string | boolean>;
  };
  script: Record<string, string>;
  constraints: Record<string, boolean | string>;
  completionRequirements: Record<string, boolean>;
  receiptSchema: { fields: string[] };
}

export interface RuntimeState {
  mission: { type: string; status: MissionStatus; authority: string };
  recipient: {
    displayName: string | null;
    role: string | null;
    approvedContext: string | null;
  };
  progress: {
    openingEstablished: boolean;
    decisionEnvironmentFound: boolean;
    environmentReflected: boolean;
    adlDistinctionExplained: boolean;
    demonstrationCompleted: boolean;
    demoDeclined: boolean;
    hoverSignalObserved: boolean;
    finalQuestionAsked: boolean;
    handoffChecked: boolean;
    closedExplicitly: boolean;
    receiptWritten: boolean;
    disposed: boolean;
  };
  evidence: {
    decision: string | null;
    hiddenPressures: string[];
    roles: string[];
    missingContext: string[];
    formingConsequence: string | null;
    questionOrObjection: string | null;
    handoffType: string;
    messageForKellen: string | null;
    demonstrationTopic?: string | null;
  };
  voice: {
    provider: "realtime_neural";
    profile: string;
    connectionStatus: "disconnected" | "connecting" | "connected" | "failed";
    voiceVerified: boolean;
    fallbackUsed: boolean;
    firstAudioReceived: boolean;
    recipientInterrupted: boolean;
    bargeInHandled: boolean;
    audioFailure: string | null;
  };
  endedReason: string | null;
}

export interface CompletionResult {
  status: MissionStatus;
  missing: string[];
  canClose: boolean;
}
