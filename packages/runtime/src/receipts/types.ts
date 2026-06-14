export type ReceiptVersion = "0.1";

export type UnderstandingReceipt = {
  readonly receiptId: string;
  readonly version: ReceiptVersion;
  readonly roomId: string;
  readonly lensId: string;
  readonly manifestVersion: string;
  readonly runtimeVersion: string;
  readonly eventLogDigest: string;
  readonly receiptType: string;
  readonly createdAt: string;
  readonly decisions: readonly string[];
  readonly evidence: readonly string[];
};

export type ReceiptLog = readonly UnderstandingReceipt[];
