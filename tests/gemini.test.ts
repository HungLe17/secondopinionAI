import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoRecords, demoReport } from "@/lib/demo";

const generateContent=vi.fn();
vi.mock("@google/genai",()=>({
  GoogleGenAI:class{models={generateContent};files={upload:vi.fn(),get:vi.fn(),delete:vi.fn()}},
  createPartFromUri:vi.fn()
}));

describe("Gemini structured output",()=>{
  beforeEach(()=>generateContent.mockReset());
  it("retries once when structured output fails schema validation",async()=>{
    generateContent.mockResolvedValueOnce({text:"{}"}).mockResolvedValueOnce({text:JSON.stringify(demoReport)});
    const{GeminiAdapter}=await import("@/lib/server/gemini");const adapter=new GeminiAdapter("test-key","test-model");
    const report=await adapter.synthesize({ageOrRange:"30–39",sexRelevantToCare:null,currentDiagnosis:"Fictional anxiety",symptoms:"Fictional symptoms",currentTreatment:"None",relevantHistory:"None",mainQuestions:"What is missing?",language:"en"},[{recordId:"primary-note",displayName:demoRecords[0].displayName,extraction:demoRecords[0].extraction}]);
    expect(report.headline).toBe(demoReport.headline);expect(generateContent).toHaveBeenCalledTimes(2);
  });
  it("answers follow-up questions with structured sources and Vietnamese instructions",async()=>{
    const source=demoReport.evidenceAgainst[0].sources[0];
    generateContent.mockResolvedValueOnce({text:JSON.stringify({answer:"Kết quả tuyến giáp cần được bác sĩ đánh giá thêm.",sources:[source],followUpQuestions:["Cần bổ sung xét nghiệm nào?"],safetyNote:null})});
    const{GeminiAdapter}=await import("@/lib/server/gemini");const adapter=new GeminiAdapter("test-key","test-model");
    const answer=await adapter.answerQuestion({question:"Điểm nào cần theo dõi?",language:"vi",report:demoReport,records:[{recordId:"lab-report",displayName:demoRecords[1].displayName,extraction:demoRecords[1].extraction}]});
    expect(answer.sources[0].recordId).toBe("lab-report");
    expect(generateContent.mock.calls[0][0].contents[0].text).toContain("natural, medically precise Vietnamese");
  });
});
