import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { AppError } from "@/lib/errors";
import { isAnalysisLockStale } from "@/lib/locks";
import { IntakeSchema, RecordExtractionSchema, SecondOpinionReportSchema, type RecordExtraction, type SourceReference } from "@/lib/schemas";
import type { CaseDocument, RecordDocument } from "@/lib/models";
import { adminServices } from "@/lib/server/firebase-admin";
import { GeminiAdapter } from "@/lib/server/gemini";
import { serverConfig } from "@/lib/server/config";

export async function analyzeCase(uid:string,caseId:string,force=false){
  serverConfig();const {db}=adminServices();
  const caseRef=db.doc(`users/${uid}/cases/${caseId}`);
  const caseSnap=await caseRef.get();
  if(!caseSnap.exists)throw new AppError("NOT_FOUND","Case not found.",404);
  const caseData=caseSnap.data() as CaseDocument;
  if(caseData.ownerUid!==uid)throw new AppError("NOT_FOUND","Case not found.",404);
  const intake=IntakeSchema.safeParse(caseData.intake);if(!intake.success)throw new AppError("INVALID_REQUEST","Complete all required case context before analysis.",422);
  if(!caseData.consent?.accepted)throw new AppError("INVALID_REQUEST","Synthetic/de-identified record consent is required.",422);
  const recordsSnap=await caseRef.collection("records").get();
  const recordDocs=recordsSnap.docs.filter(record=>(record.data() as RecordDocument).status==="extracted");
  if(!recordDocs.length)throw new AppError("NO_RECORDS","Extract at least one valid record before analysis.",422);
  if(recordDocs.length>10)throw new AppError("INVALID_RECORD","A case can contain at most 10 records.",422);
  const extracted=recordDocs.map(record=>{const data=record.data() as RecordDocument;const parsed=RecordExtractionSchema.safeParse(data.extraction);if(data.status!=="extracted"||data.extractionVersion!==1||!parsed.success)throw new AppError("INVALID_RECORD",`${data.displayName}: extraction is incomplete. Re-select the original file and try again.`,422);return{recordId:record.id,displayName:data.displayName,extraction:parsed.data};});
  await db.runTransaction(async tx=>{
    const fresh=await tx.get(caseRef);if(!fresh.exists)throw new AppError("NOT_FOUND","Case not found.",404);const value=fresh.data() as CaseDocument;
    const updated=value.updatedAt && "toDate" in value.updatedAt ? value.updatedAt.toDate!() : null;
    if(value.status==="analyzing"&&!isAnalysisLockStale(updated))throw new AppError("ANALYSIS_IN_PROGRESS","Analysis is already running.",409,true);
    if(value.status==="complete"&&!force)throw new AppError("ALREADY_COMPLETE","A report already exists. Use explicit retry to replace it.",409);
    tx.update(caseRef,{status:"analyzing",analysisStage:"preparing",progressCurrent:0,progressTotal:recordDocs.length,lastError:null,updatedAt:FieldValue.serverTimestamp()});
  });
  const gemini=new GeminiAdapter();
  try{
    await caseRef.update({analysisStage:"synthesizing",updatedAt:FieldValue.serverTimestamp()});
    const report=await gemini.synthesize(intake.data,extracted);SecondOpinionReportSchema.parse(report);validateReportSources(report,extracted);
    await caseRef.update({analysisStage:"finalizing",updatedAt:FieldValue.serverTimestamp()});
    const analysisRef=caseRef.collection("analyses").doc("current");const batch=db.batch();batch.set(analysisRef,{schemaVersion:1,model:gemini.model,promptVersion:"2026-08-26-v1",report,createdAt:FieldValue.serverTimestamp()});batch.update(caseRef,{status:"complete",analysisStage:"idle",progressCurrent:recordDocs.length,progressTotal:recordDocs.length,latestAnalysisVersion:FieldValue.increment(1),lastError:null,analyzedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});await batch.commit();
  }catch(error){const appError=error instanceof AppError?error:new AppError("INTERNAL_ERROR","Analysis stopped safely. Successful record extractions were preserved.",500,true);await caseRef.update({status:"failed",analysisStage:"idle",lastError:{code:appError.code,message:appError.message},updatedAt:FieldValue.serverTimestamp()}).catch(()=>undefined);throw appError;}
}

function validateReportSources(report:unknown,records:Array<{recordId:string;displayName:string;extraction:RecordExtraction}>){const allowed=new Map(records.map(r=>[r.recordId,r]));walkSources(report,source=>{const record=allowed.get(source.recordId);if(!record||record.displayName!==source.displayName)throw new AppError("MODEL_INVALID_OUTPUT","The model returned an invalid report source. Please retry.",502,true);if(source.page!==null||source.section!==null){let matched=false;walkSources(record.extraction,candidate=>{if(candidate.page===source.page&&candidate.section===source.section)matched=true;});if(!matched)throw new AppError("MODEL_INVALID_OUTPUT","The model returned a page or section not found in the extracted record.",502,true);}})}

function walkSources(value:unknown,visitor:(source:SourceReference)=>void){if(Array.isArray(value)){value.forEach(x=>walkSources(x,visitor));return;}if(!value||typeof value!=="object")return;const object=value as Record<string,unknown>;if(typeof object.recordId==="string"&&typeof object.displayName==="string"&&"page" in object&&"section" in object){visitor(object as SourceReference);return;}Object.values(object).forEach(x=>walkSources(x,visitor));}

export { validateReportSources };
