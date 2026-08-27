import type { Intake, RecordExtraction, SecondOpinionReport } from "@/lib/schemas";

export type CaseStatus = "draft" | "ready" | "analyzing" | "complete" | "failed";
export type AnalysisStage = "idle" | "preparing" | "extracting" | "synthesizing" | "finalizing";

export type CaseDocument = {
  ownerUid: string;
  title: string;
  status: CaseStatus;
  analysisStage: AnalysisStage;
  progressCurrent: number;
  progressTotal: number;
  intake: Intake;
  consent: { accepted: boolean; acceptedAt: unknown; version: "2026-08-26" };
  recordCount: number;
  recordBytes: number;
  latestAnalysisVersion: number;
  lastError: { code: string; message: string } | null;
  createdAt: { toDate?: () => Date } | null;
  updatedAt: { toDate?: () => Date } | null;
  analyzedAt: { toDate?: () => Date } | null;
};

export type RecordDocument = {
  displayName: string;
  contentType: string;
  size: number;
  status: "extracting" | "extracted" | "failed";
  extraction: RecordExtraction | null;
  extractionVersion: 1;
  error: { code: string; message: string } | null;
};

export type AnalysisDocument = { schemaVersion: 1; model: string; promptVersion: string; report: SecondOpinionReport; createdAt: unknown };
