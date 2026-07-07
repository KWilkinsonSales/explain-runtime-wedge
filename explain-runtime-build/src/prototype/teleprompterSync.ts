// Proof-level sync surface for the Mac teleprompter view. This syncs across
// tabs/windows in the SAME browser via BroadcastChannel + localStorage. It does
// NOT sync across separate devices (e.g. phone -> Mac) — that would require a
// deployed backend relay, which is out of scope for this build-first pass.
import type { IntentId } from "./intents";

export interface TeleprompterPayload {
  text: string;
  intentId: IntentId | null;
  updatedAt: string;
}

const CHANNEL_NAME = "companion-teleprompter-sync";
const STORAGE_KEY = "companion-teleprompter-sync-v1";

let channelInstance: BroadcastChannel | null | undefined;
function getChannel(): BroadcastChannel | null {
  if (channelInstance === undefined) {
    channelInstance = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;
  }
  return channelInstance;
}

export function publishTeleprompter(payload: TeleprompterPayload): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  getChannel()?.postMessage(payload);
}

export function readTeleprompter(): TeleprompterPayload | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TeleprompterPayload;
  } catch {
    return null;
  }
}

export function subscribeTeleprompter(onMessage: (payload: TeleprompterPayload) => void): () => void {
  const channel = getChannel();
  const channelHandler = (event: MessageEvent<TeleprompterPayload>) => onMessage(event.data);
  channel?.addEventListener("message", channelHandler);

  const storageHandler = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        onMessage(JSON.parse(event.newValue) as TeleprompterPayload);
      } catch {
        // ignore malformed payload from another tab
      }
    }
  };
  window.addEventListener("storage", storageHandler);

  return () => {
    channel?.removeEventListener("message", channelHandler);
    window.removeEventListener("storage", storageHandler);
  };
}
