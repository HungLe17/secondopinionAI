import { AppError, safeErrorResponse } from "@/lib/errors";
import { CaseIdSchema } from "@/lib/schemas";
import { requireUser } from "@/lib/server/auth";
import { extractRecord } from "@/lib/server/extract-record";

export const dynamic = "force-dynamic";
export const maxDuration = 900;

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const user = await requireUser(request);
    const { caseId } = await params;
    if (!CaseIdSchema.safeParse(caseId).success) throw new AppError("INVALID_REQUEST", "Invalid case identifier.", 400);
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 16 * 1024 * 1024) throw new AppError("INVALID_RECORD", "The record is larger than 15 MiB.", 413);
    const form = await request.formData();
    const file = form.get("file");
    const recordId = form.get("recordId");
    if (!(file instanceof File) || typeof recordId !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(recordId)) throw new AppError("INVALID_REQUEST", "A valid record file is required.", 400);
    return Response.json(await extractRecord(user.uid, caseId, recordId, file));
  } catch (error) {
    return safeErrorResponse(error);
  }
}
