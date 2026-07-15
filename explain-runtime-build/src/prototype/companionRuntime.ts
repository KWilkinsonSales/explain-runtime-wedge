// Pure, DOM-independent pieces of the Companion ON prototype lifecycle so they
// can be unit tested without a browser.
//
// Voice-capability detection and error classification live in
// @adl/companion-shared so Companion and ExplainIT gate mic/speech access
// identically — re-exported here so existing Companion imports are unchanged.
export {
  VOICE_UNAVAILABLE_MESSAGES,
  isGetUserMediaSupported,
  isSpeechRecognitionSupported,
  classifyMicrophoneError,
  describeMicrophoneError,
  type VoiceUnavailableReason,
  type SpeechRecognitionWindowLike
} from "../../../packages/companion-shared/src/voiceCapability";

export type CompanionRuntimeState =
  | "IDLE"
  | "REQUESTING_PERMISSION"
  | "LISTENING"
  | "TEXT_MODE"
  | "VOICE_UNAVAILABLE"
  | "ERROR";

export type MicPermissionStatus = "unknown" | "granted" | "denied";
