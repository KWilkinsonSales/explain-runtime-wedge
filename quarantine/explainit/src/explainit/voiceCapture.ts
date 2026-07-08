// ExplainIT voice capture. Order is a hard rule: the room asks for the
// microphone via navigator.mediaDevices.getUserMedia({ audio: true }) FIRST,
// and only after the recipient grants it does SpeechRecognition start. If
// recognition is unsupported, the mic grant still stands and the room says so
// instead of silently falling back — text input remains the governed path.
//
// Injectable navigator/window shapes keep this testable without a browser,
// same approach as companionRuntime.ts.

import {
  classifyMicrophoneError,
  describeMicrophoneError,
  isSpeechRecognitionSupported,
  VOICE_UNAVAILABLE_MESSAGES
} from "../prototype/companionRuntime";

interface MediaStreamTrackLike {
  stop: () => void;
}

interface MediaStreamLike {
  getTracks: () => MediaStreamTrackLike[];
}

export interface VoiceNavigatorLike {
  mediaDevices?: {
    getUserMedia?: (constraints: { audio: boolean }) => Promise<MediaStreamLike>;
  };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export interface VoiceWindowLike {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

export interface VoiceCaptureHooks {
  onTranscript: (text: string) => void;
  onUnavailable: (message: string, detail: string | null) => void;
  onEnd: () => void;
}

export interface VoiceCaptureHandle {
  stop: () => void;
}

export async function startVoiceCapture(
  nav: VoiceNavigatorLike,
  win: VoiceWindowLike,
  hooks: VoiceCaptureHooks
): Promise<VoiceCaptureHandle | null> {
  if (typeof nav.mediaDevices?.getUserMedia !== "function") {
    hooks.onUnavailable(VOICE_UNAVAILABLE_MESSAGES.unsupported, "getUserMedia is not available in this browser.");
    return null;
  }

  let stream: MediaStreamLike;
  try {
    stream = await nav.mediaDevices!.getUserMedia!({ audio: true });
  } catch (error) {
    hooks.onUnavailable(VOICE_UNAVAILABLE_MESSAGES[classifyMicrophoneError(error)], describeMicrophoneError(error));
    return null;
  }

  const stopStream = () => stream.getTracks().forEach((track) => track.stop());

  const RecognitionCtor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  if (!isSpeechRecognitionSupported(win) || !RecognitionCtor) {
    stopStream();
    hooks.onUnavailable(
      "Microphone access was granted, but this browser cannot transcribe speech. Ask by text instead.",
      "SpeechRecognition is not available in this browser."
    );
    return null;
  }

  const recognition = new RecognitionCtor();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    stopStream();
    hooks.onEnd();
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
    if (transcript.length > 0) hooks.onTranscript(transcript);
  };
  recognition.onerror = (event) => {
    hooks.onUnavailable(VOICE_UNAVAILABLE_MESSAGES["runtime-failure"], `SpeechRecognition error: ${event.error ?? "unknown"}`);
    finish();
  };
  recognition.onend = finish;
  recognition.start();

  return {
    stop: () => {
      try {
        recognition.stop();
      } finally {
        finish();
      }
    }
  };
}

// Optional read-aloud of the governed answer. Support-gated; silence is a
// valid outcome and never blocks the transcript.
export function speakAnswerAloud(win: { speechSynthesis?: SpeechSynthesis; SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance }, text: string): boolean {
  if (!win.speechSynthesis || !win.SpeechSynthesisUtterance) return false;
  win.speechSynthesis.cancel();
  win.speechSynthesis.speak(new win.SpeechSynthesisUtterance(text));
  return true;
}
