export type CardSpec = {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly requiresInput?: boolean;
  readonly inputId?: string;
};

export type ThresholdSpec = {
  readonly id: string;
  readonly requiredCardIds: readonly string[];
  readonly requiredInputIds: readonly string[];
};

export type ReceiptPolicySpec = {
  readonly receiptType: string;
  readonly includeCardIds: readonly string[];
};

export type ProofLensManifest = {
  readonly lensId: "canonical" | "investor" | "qbr" | "outreach";
  readonly version: "0.1";
  readonly label: string;
  readonly purpose: string;
  readonly audience: string;
  readonly cards: readonly CardSpec[];
  readonly threshold: ThresholdSpec;
  readonly receiptPolicy: ReceiptPolicySpec;
};
