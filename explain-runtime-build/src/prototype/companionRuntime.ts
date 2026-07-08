// Pure, DOM-independent pieces of the Companion ON prototype lifecycle so they
// can be unit tested without a browser.

export type CompanionRuntimeState =
  | "IDLE"
  | "REQUESTING_PERMISSION"
  | "LISTENING"
  | "TEXT_MODE"
  | "VOICE_UNAVAILABLE"
  | "ERROR";

export type MicPermissionStatus = "unknown" | "granted" | "denied";

export type VoiceUnavailableReason = "permission-denied" | "unsupported" | "runtime-failure";

export const VOICE_UNAVAILABLE_MESSAGES: Record<VoiceUnavailableReason, string> = {
  "permission-denied": "Microphone access was denied. Allow it in your browser/iOS settings, or continue in Text Mode.",
  "unsupported": "This browser does not support microphone capture. Continue in Text Mode.",
  "runtime-failure": "The microphone could not be started. Continue in Text Mode."
};

interface MediaDevicesLike {
  mediaDevices?: {
    getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  };
}

export function isGetUserMediaSupported(nav: MediaDevicesLike): boolean {
  return typeof nav.mediaDevices?.getUserMedia === "function";
}

export interface SpeechRecognitionWindowLike {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
}

export function isSpeechRecognitionSupported(win: SpeechRecognitionWindowLike): boolean {
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

// Real getUserMedia rejections raise a DOMException with one of these `name`
// values. Anything else (device busy, hardware failure, etc.) is a runtime
// failure rather than a user decision to deny access.
export function classifyMicrophoneError(error: unknown): VoiceUnavailableReason {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    return "permission-denied";
  }
  return "runtime-failure";
}

// The raw error name/message, for diagnostics. Never shown in place of the
// human-readable VOICE_UNAVAILABLE_MESSAGES copy, only alongside it, so the
// prototype never hides what actually happened.
export function describeMicrophoneError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name || "Error"}: ${error.message || "(no message)"}`;
  }
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
