import { AnalyzeBodySchema, CaseIdSchema } from "@/lib/schemas";
import { AppError, safeErrorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/server/auth";
import { analyzeCase } from "@/lib/server/pipeline";
export const dynamic="force-dynamic";export const maxDuration=900;
export async function POST(request:Request,{params}:{params:Promise<{caseId:string}>}){try{const user=await requireUser(request);const{caseId}=await params;if(!CaseIdSchema.safeParse(caseId).success)throw new AppError("INVALID_REQUEST","Invalid case identifier.",400);const body=AnalyzeBodySchema.safeParse(await request.json().catch(()=>null));if(!body.success)throw new AppError("INVALID_REQUEST","Request body must be an empty JSON object.",400);const force=new URL(request.url).searchParams.get("force")==="true";await analyzeCase(user.uid,caseId,force);return Response.json({ok:true});}catch(error){return safeErrorResponse(error)}}

