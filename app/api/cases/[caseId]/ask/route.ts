import { AskAnswerSchema, AskQuestionSchema, CaseIdSchema, RecordExtractionSchema, SecondOpinionReportSchema } from "@/lib/schemas";
import { AppError, safeErrorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/server/auth";
import { adminServices } from "@/lib/server/firebase-admin";
import { GeminiAdapter } from "@/lib/server/gemini";
import { validateReportSources } from "@/lib/server/pipeline";
import type { AnalysisDocument, CaseDocument, RecordDocument } from "@/lib/models";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const user = await requireUser(request);
    const { caseId } = await params;
    if (!CaseIdSchema.safeParse(caseId).success) throw new AppError("INVALID_REQUEST", "Invalid case identifier.", 400);
    const body = AskQuestionSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) throw new AppError("INVALID_REQUEST", "Enter a question between 3 and 1,000 characters.", 400);

    const { db } = adminServices();
    const caseRef = db.doc(`users/${user.uid}/cases/${caseId}`);
    const [caseSnap, analysisSnap, recordsSnap] = await Promise.all([
      caseRef.get(),
      caseRef.collection("analyses").doc("current").get(),
      caseRef.collection("records").get(),
    ]);
    if (!caseSnap.exists || (caseSnap.data() as CaseDocument).ownerUid !== user.uid) throw new AppError("NOT_FOUND", "Case not found.", 404);
    if (!analysisSnap.exists) throw new AppError("NOT_FOUND", "Generate the report before asking a follow-up question.", 404);
    const report = SecondOpinionReportSchema.parse((analysisSnap.data() as AnalysisDocument).report);
    const records = recordsSnap.docs.map(record => {
      const value = record.data() as RecordDocument;
      const extraction = RecordExtractionSchema.safeParse(value.extraction);
      if (value.status !== "extracted" || !extraction.success) return null;
      return { recordId: record.id, displayName: value.displayName, extraction: extraction.data };
    }).filter((record): record is NonNullable<typeof record> => record !== null);
    if (!records.length) throw new AppError("NO_RECORDS", "No extracted records are available.", 422);

    const answer = AskAnswerSchema.parse(await new GeminiAdapter().answerQuestion({ ...body.data, report, records }));
    validateReportSources(answer, records);
    return Response.json({ ok: true, answer });
  } catch (error) {
    return safeErrorResponse(error);
  }
}
