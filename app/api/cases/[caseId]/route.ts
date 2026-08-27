import { AppError, safeErrorResponse } from "@/lib/errors";
import { CaseIdSchema } from "@/lib/schemas";
import { requireUser } from "@/lib/server/auth";
import { adminServices } from "@/lib/server/firebase-admin";
export const dynamic="force-dynamic";
export async function DELETE(request:Request,{params}:{params:Promise<{caseId:string}>}){try{const user=await requireUser(request);const{caseId}=await params;if(!CaseIdSchema.safeParse(caseId).success)throw new AppError("INVALID_REQUEST","Invalid case identifier.",400);const{db}=adminServices();const caseRef=db.doc(`users/${user.uid}/cases/${caseId}`);const snapshot=await caseRef.get();if(snapshot.exists&&snapshot.data()?.ownerUid!==user.uid)throw new AppError("NOT_FOUND","Case not found.",404);await db.recursiveDelete(caseRef);return Response.json({ok:true});}catch(error){return safeErrorResponse(error)}}
