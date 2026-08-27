import { describe, expect, it } from "vitest";
import { IntakeSchema, RecordExtractionSchema, SecondOpinionReportSchema } from "@/lib/schemas";
import { MAX_FILE_SIZE, safeDisplayName, validateFile, validateFileSet } from "@/lib/files";
import { isAnalysisLockStale, STALE_ANALYSIS_MS } from "@/lib/locks";
import { demoRecords, demoReport } from "@/lib/demo";
import { safeNextPath } from "@/lib/navigation";
import { geminiResponseSchema } from "@/lib/server/gemini-schema";
import { z } from "zod";

describe("intake validation",()=>{
  it("accepts complete context and rejects missing medical context",()=>{
    const valid={ageOrRange:"40–49",sexRelevantToCare:null,currentDiagnosis:"Fictional diagnosis",symptoms:"Fictional symptoms",currentTreatment:"None",relevantHistory:"None",mainQuestions:"What should be clarified?",language:"en"};
    expect(IntakeSchema.safeParse(valid).success).toBe(true);
    expect(IntakeSchema.safeParse({...valid,symptoms:""}).success).toBe(false);
  });
});

describe("safe post-login navigation",()=>{
  it("preserves local paths and rejects protocol-relative or external targets",()=>{
    expect(safeNextPath("/cases/new")).toBe("/cases/new");
    expect(safeNextPath("//evil.example/path")).toBe("/dashboard");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
  });
});

describe("file validation and safe paths",()=>{
  it("accepts all six supported formats",()=>{
    const files=[
      ["a.pdf","application/pdf"],["a.docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      ["a.txt","text/plain"],["a.png","image/png"],["a.jpg","image/jpeg"],["a.webp","image/webp"]
    ];
    for(const[name,type]of files)expect(validateFile({name,size:10,type})).toBeNull();
  });
  it("accepts valid extensions when a browser omits or generalizes the MIME type",()=>{
    expect(validateFile({name:"scan.pdf",size:10,type:""})).toBeNull();
    expect(validateFile({name:"scan.pdf",size:10,type:"application/octet-stream"})).toBeNull();
  });
  it("rejects empty, oversized, mismatched, too many, and excessive-total files",()=>{
    expect(validateFile({name:"a.pdf",size:0,type:"application/pdf"})).toMatch(/empty/);
    expect(validateFile({name:"a.pdf",size:MAX_FILE_SIZE+1,type:"application/pdf"})).toMatch(/15 MiB/);
    expect(validateFile({name:"a.pdf",size:1,type:"image/png"})).toMatch(/do not match/);
    expect(validateFileSet(Array.from({length:11},(_,i)=>({name:`${i}.txt`,size:1,type:"text/plain"})))).toMatch(/10 records/);
    expect(validateFileSet([{name:"a.pdf",size:MAX_FILE_SIZE,type:"application/pdf"}],3,49*1024*1024)).toMatch(/50 MiB/);
  });
  it("sanitizes untrusted display names",()=>{
    expect(safeDisplayName("../scan\u0000.pdf")).toBe("..-scan.pdf");
  });
});

describe("AI schemas and locks",()=>{
  it("keeps schema properties while removing constraints unsupported by Gemini",()=>{
    const schema=geminiResponseSchema(z.toJSONSchema(z.object({label:z.string().max(20),items:z.array(z.string()).max(3)})));
    expect(schema).toMatchObject({type:"object",properties:{label:{type:"string"},items:{type:"array",items:{type:"string"}}},required:["label","items"]});
    expect(JSON.stringify(schema)).not.toMatch(/maxLength|maxItems|additionalProperties|\$schema/);
  });
  it("validates bundled extraction and complete report fixtures",()=>{
    demoRecords.forEach(record=>expect(RecordExtractionSchema.safeParse(record.extraction).success).toBe(true));
    expect(SecondOpinionReportSchema.safeParse(demoReport).success).toBe(true);
    expect(SecondOpinionReportSchema.safeParse({...demoReport,overallAssessment:"certain"}).success).toBe(false);
  });
  it("enforces the 25-word source quote policy",()=>{
    const extraction=structuredClone(demoRecords[0].extraction);extraction.sourceSnippets[0].quote=Array(26).fill("word").join(" ");
    expect(RecordExtractionSchema.safeParse(extraction).success).toBe(false);
  });
  it("recognizes a lock only after twenty minutes",()=>{
    const now=new Date("2026-08-26T12:00:00Z");
    expect(isAnalysisLockStale(new Date(now.getTime()-STALE_ANALYSIS_MS+1),now)).toBe(false);
    expect(isAnalysisLockStale(new Date(now.getTime()-STALE_ANALYSIS_MS-1),now)).toBe(true);
    expect(isAnalysisLockStale(null,now)).toBe(true);
  });
});
