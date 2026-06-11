import type { RuntimeState } from "./types";

interface SessionBootstrap {
  client_secret: { value: string };
  model?: string;
}

export interface RealtimeConnection {
  peer: RTCPeerConnection;
  events: RTCDataChannel;
  stop: () => void;
}

export async function connectRealtimeVoice(
  token: string,
  state: RuntimeState,
  onEvent: (event: unknown) => void,
  onRemoteAudio: () => void
): Promise<RealtimeConnection> {
  state.voice.connectionStatus = "connecting";

  const bootstrapResponse = await fetch(`/api/realtime/session?token=${encodeURIComponent(token)}`, {
    method: "POST"
  });
  if (!bootstrapResponse.ok) {
    state.voice.connectionStatus = "failed";
    state.voice.audioFailure = `session-bootstrap:${bootstrapResponse.status}`;
    throw new Error("Realtime voice session could not be created.");
  }

  const bootstrap = (await bootstrapResponse.json()) as SessionBootstrap;
  if (!bootstrap.client_secret?.value) {
    state.voice.connectionStatus = "failed";
    state.voice.audioFailure = "missing-ephemeral-key";
    throw new Error("Realtime session did not return an ephemeral credential.");
  }

  const peer = new RTCPeerConnection();
  const audio = document.createElement("audio");
  audio.autoplay = true;
  audio.setAttribute("playsinline", "true");
  peer.ontrack = (event) => {
    audio.srcObject = event.streams[0];
    state.voice.firstAudioReceived = true;
    onRemoteAudio();
  };

  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });
  for (const track of localStream.getTracks()) peer.addTrack(track, localStream);

  const events = peer.createDataChannel("oai-events");
  events.onmessage = (message) => {
    try {
      const event = JSON.parse(message.data);
      if (event.type === "input_audio_buffer.speech_started") {
        state.voice.recipientInterrupted = true;
        events.send(JSON.stringify({ type: "response.cancel" }));
        events.send(JSON.stringify({ type: "output_audio_buffer.clear" }));
      }
      if (event.type === "response.cancelled" || event.type === "output_audio_buffer.cleared") {
        state.voice.bargeInHandled = true;
      }
      onEvent(event);
    } catch {
      onEvent(message.data);
    }
  };

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);

  const model = bootstrap.model ?? "gpt-realtime";
  const sdpResponse = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`, {
    method: "POST",
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${bootstrap.client_secret.value}`,
      "Content-Type": "application/sdp"
    }
  });
  if (!sdpResponse.ok) {
    state.voice.connectionStatus = "failed";
    state.voice.audioFailure = `sdp:${sdpResponse.status}`;
    throw new Error("Realtime voice connection failed.");
  }

  await peer.setRemoteDescription({ type: "answer", sdp: await sdpResponse.text() });
  state.voice.connectionStatus = "connected";
  state.voice.voiceVerified = true;
  state.voice.fallbackUsed = false;

  return {
    peer,
    events,
    stop: () => {
      localStream.getTracks().forEach((track) => track.stop());
      events.close();
      peer.close();
      audio.remove();
    }
  };
}
