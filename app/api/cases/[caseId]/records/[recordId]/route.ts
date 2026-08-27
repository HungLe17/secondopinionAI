import { FieldValue } from "firebase-admin/firestore";
import { AppError, safeErrorResponse } from "@/lib/errors";
import { CaseIdSchema } from "@/lib/schemas";
import { requireUser } from "@/lib/server/auth";
import { adminServices } from "@/lib/server/firebase-admin";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: Promise<{ caseId: string; recordId: string }> }) {
  try {
    const user = await requireUser(request);
    const { caseId, recordId } = await params;
    if (!CaseIdSchema.safeParse(caseId).success || !/^[A-Za-z0-9_-]{8,128}$/.test(recordId)) throw new AppError("INVALID_REQUEST", "Invalid record identifier.", 400);
    const { db } = adminServices();
    const caseRef = db.doc(`users/${user.uid}/cases/${caseId}`);
    const recordRef = caseRef.collection("records").doc(recordId);
    await db.runTransaction(async transaction => {
      const [caseSnap, recordSnap] = await Promise.all([transaction.get(caseRef), transaction.get(recordRef)]);
      if (!caseSnap.exists || caseSnap.data()?.ownerUid !== user.uid) throw new AppError("NOT_FOUND", "Case not found.", 404);
      if (!recordSnap.exists) return;
      transaction.delete(recordRef);
      transaction.update(caseRef, { recordCount: Math.max(0, Number(caseSnap.data()?.recordCount || 0) - 1), recordBytes: Math.max(0, Number(caseSnap.data()?.recordBytes || 0) - Number(recordSnap.data()?.size || 0)), updatedAt: FieldValue.serverTimestamp() });
    });
    return Response.json({ ok: true });
  } catch (error) {
    return safeErrorResponse(error);
  }
}
