import type { UnderstandingReceipt, ReceiptLog } from "./types.js";

export function appendReceipt(log: ReceiptLog, receipt: UnderstandingReceipt): ReceiptLog {
  return [...log, Object.freeze({ ...receipt })];
}
