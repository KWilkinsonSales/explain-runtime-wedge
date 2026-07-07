import { describe, expect, it } from "vitest";
import {
  classifyMicrophoneError,
  isGetUserMediaSupported,
  isSpeechRecognitionSupported
} from "../src/prototype/companionRuntime";

describe("isGetUserMediaSupported", () => {
  it("is true when navigator.mediaDevices.getUserMedia is a function", () => {
    expect(isGetUserMediaSupported({ mediaDevices: { getUserMedia: async () => ({} as MediaStream) } })).toBe(true);
  });

  it("is false when mediaDevices is missing", () => {
    expect(isGetUserMediaSupported({})).toBe(false);
  });

  it("is false when getUserMedia is missing", () => {
    expect(isGetUserMediaSupported({ mediaDevices: {} })).toBe(false);
  });
});

describe("isSpeechRecognitionSupported", () => {
  it("is true when window.SpeechRecognition exists", () => {
    expect(isSpeechRecognitionSupported({ SpeechRecognition: function () {} })).toBe(true);
  });

  it("is true when only window.webkitSpeechRecognition exists (Safari)", () => {
    expect(isSpeechRecognitionSupported({ webkitSpeechRecognition: function () {} })).toBe(true);
  });

  it("is false when neither is present", () => {
    expect(isSpeechRecognitionSupported({})).toBe(false);
  });
});

describe("classifyMicrophoneError", () => {
  it("classifies NotAllowedError as permission-denied", () => {
    const error = new Error("denied");
    error.name = "NotAllowedError";
    expect(classifyMicrophoneError(error)).toBe("permission-denied");
  });

  it("classifies PermissionDeniedError as permission-denied", () => {
    const error = new Error("denied");
    error.name = "PermissionDeniedError";
    expect(classifyMicrophoneError(error)).toBe("permission-denied");
  });

  it("classifies SecurityError as permission-denied", () => {
    const error = new Error("insecure context");
    error.name = "SecurityError";
    expect(classifyMicrophoneError(error)).toBe("permission-denied");
  });

  it("classifies other errors as runtime-failure", () => {
    const error = new Error("no device");
    error.name = "NotFoundError";
    expect(classifyMicrophoneError(error)).toBe("runtime-failure");
  });

  it("classifies non-Error throws as runtime-failure", () => {
    expect(classifyMicrophoneError("boom")).toBe("runtime-failure");
  });
});
