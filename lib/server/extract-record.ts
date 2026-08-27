import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FieldValue } from "firebase-admin/firestore";
import { AppError } from "@/lib/errors";
import { MAX_CASE_SIZE, MAX_FILE_SIZE, MAX_RECORDS, normalizedContentType, safeDisplayName, validateFile } from "@/lib/files";
import type { CaseDocument } from "@/lib/models";
import type { RecordExtraction } from "@/lib/schemas";
import { adminServices } from "@/lib/server/firebase-admin";
import { GeminiAdapter } from "@/lib/server/gemini";
import { validateAndPrepareRecord } from "@/lib/server/records";

export async function extractRecord(uid: string, caseId: string, recordId: string, file: File) {
  const clientError = validateFile(file);
  if (clientError) throw new AppError("INVALID_RECORD", `${safeDisplayName(file.name)}: ${clientError}`, 422);
  if (file.size > MAX_FILE_SIZE) throw new AppError("INVALID_RECORD", "The record is too large.", 422);
  const displayName = safeDisplayName(file.name);
  const contentType = normalizedContentType(file);
  if (!contentType) throw new AppError("INVALID_RECORD", `${displayName}: unsupported or mismatched file type.`, 422);
  const { db } = adminServices();
  const caseRef = db.doc(`users/${uid}/cases/${caseId}`);
  const recordRef = caseRef.collection("records").doc(recordId);

  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(caseRef);
    if (!snapshot.exists || snapshot.data()?.ownerUid !== uid) throw new AppError("NOT_FOUND", "Case not found.", 404);
    const data = snapshot.data() as CaseDocument;
    if (data.status !== "draft") throw new AppError("INVALID_REQUEST", "Records can only be added to a draft case.", 409);
    const count = data.recordCount || 0;
    const bytes = data.recordBytes || 0;
    if (count >= MAX_RECORDS) throw new AppError("INVALID_RECORD", "A case can contain at most 10 records.", 422);
    if (bytes + file.size > MAX_CASE_SIZE) throw new AppError("INVALID_RECORD", "A case can contain at most 50 MiB total.", 422);
    transaction.create(recordRef, { displayName, contentType, size: file.size, status: "extracting", extraction: null, extractionVersion: 1, error: null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    transaction.update(caseRef, { recordCount: count + 1, recordBytes: bytes + file.size, updatedAt: FieldValue.serverTimestamp() });
  });

  const workDir = join(tmpdir(), `second-opinion-record-${randomUUID()}`);
  const localPath = join(workDir, recordId);
  let gemini: GeminiAdapter | undefined;
  let geminiFile: { name?: string; uri?: string; mimeType?: string } | undefined;
  try {
    gemini = new GeminiAdapter();
    await mkdir(workDir, { recursive: false });
    await writeFile(localPath, Buffer.from(await file.arrayBuffer()));
    const prepared = await validateAndPrepareRecord(localPath, displayName, contentType, file.size);
    let extraction: RecordExtraction;
    if ("text" in prepared) extraction = await gemini.extract({ recordId, displayName, text: prepared.text, truncated: prepared.truncated });
    else {
      geminiFile = await gemini.uploadFile(prepared.filePath, prepared.mimeType, displayName);
      extraction = await gemini.extract({ recordId, displayName, file: geminiFile });
    }
    validateSources(extraction, recordId, displayName);
    await recordRef.update({ status: "extracted", extraction, error: null, updatedAt: FieldValue.serverTimestamp() });
    return { recordId, displayName, contentType, size: file.size, extraction };
  } catch (error) {
    const safe = error instanceof AppError ? error : new AppError("INTERNAL_ERROR", `${displayName}: extraction failed safely. Re-select the file to retry.`, 500, true);
    await recordRef.update({ status: "failed", error: { code: safe.code, message: safe.message }, updatedAt: FieldValue.serverTimestamp() }).catch(() => undefined);
    throw safe;
  } finally {
    await gemini?.deleteFile(geminiFile?.name);
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function validateSources(extraction: RecordExtraction, recordId: string, displayName: string) {
  walk(extraction, value => {
    if (value.recordId !== recordId || value.displayName !== displayName) throw new AppError("MODEL_INVALID_OUTPUT", "The model returned an invalid source reference. Please retry.", 502, true);
  });
}

function walk(value: unknown, visit: (source: { recordId: string; displayName: string }) => void) {
  if (Array.isArray(value)) return value.forEach(item => walk(item, visit));
  if (!value || typeof value !== "object") return;
  const object = value as Record<string, unknown>;
  if (typeof object.recordId === "string" && typeof object.displayName === "string" && "page" in object && "section" in object) return visit(object as { recordId: string; displayName: string });
  Object.values(object).forEach(item => walk(item, visit));
}
