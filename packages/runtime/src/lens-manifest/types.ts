import type { RuntimeEventKind } from "../kernel/envelope.js";

export type LensId = string & { readonly __brand: "LensId" };
export type LensVersion = string & { readonly __brand: "LensVersion" };

export type DeclaredInput = {
  readonly inputId: string;
  readonly label: string;
  readonly required: boolean;
};

export type DeclaredOutput = {
  readonly outputId: string;
  readonly label: string;
};

export type LensManifest = {
  readonly lensId: LensId;
  readonly lensVersion: LensVersion;
  readonly declaredInputs: readonly DeclaredInput[];
  readonly declaredOutputs: readonly DeclaredOutput[];
  readonly declaredRoomRequirements: readonly string[];
  readonly declaredEventKinds: readonly RuntimeEventKind[];
};

export type LensManifestDescriptor = Pick<LensManifest, "lensId" | "lensVersion" | "declaredEventKinds">;
