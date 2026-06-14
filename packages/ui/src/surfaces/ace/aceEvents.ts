export type AceEvent =
  | { readonly type: "ACE_ORIENTED_ROOM"; readonly roomId: string }
  | { readonly type: "ACE_PRESENTED_CARD"; readonly roomId: string; readonly cardId: string }
  | { readonly type: "ACE_COLLECTED_INPUT"; readonly roomId: string; readonly fieldId: string; readonly value: string }
  | { readonly type: "ACE_CONFIRMED_EVIDENCE"; readonly roomId: string; readonly evidenceId: string }
  | { readonly type: "ACE_FLAGGED_UNKNOWN"; readonly roomId: string; readonly unknownId: string }
  | { readonly type: "ACE_THRESHOLD_CHECK_REQUESTED"; readonly roomId: string; readonly thresholdId: string }
  | { readonly type: "ACE_RECEIPT_SELECTED"; readonly roomId: string; readonly receiptType: string }
  | { readonly type: "ACE_ROOM_CLOSED"; readonly roomId: string };
