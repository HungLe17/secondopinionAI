import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const {requireUser,analyzeCase}=vi.hoisted(()=>({requireUser:vi.fn(),analyzeCase:vi.fn()}));
vi.mock("@/lib/server/auth",()=>({requireUser}));
vi.mock("@/lib/server/pipeline",()=>({analyzeCase}));
import { POST } from "@/app/api/cases/[caseId]/analyze/route";

const context={params:Promise.resolve({caseId:"case_1"})};
describe("analysis route",()=>{
  beforeEach(()=>{requireUser.mockReset();analyzeCase.mockReset();});
  it("rejects unauthorized requests without starting work",async()=>{requireUser.mockRejectedValue(new AppError("UNAUTHORIZED","Sign in is required.",401));const response=await POST(new Request("http://test/api/cases/case_1/analyze",{method:"POST",body:"{}"}),context);expect(response.status).toBe(401);expect(analyzeCase).not.toHaveBeenCalled();});
  it("returns a stable idempotency conflict",async()=>{requireUser.mockResolvedValue({uid:"user_1"});analyzeCase.mockRejectedValue(new AppError("ANALYSIS_IN_PROGRESS","Analysis is already running.",409,true));const response=await POST(new Request("http://test/api/cases/case_1/analyze",{method:"POST",body:"{}"}),context);expect(response.status).toBe(409);expect(await response.json()).toMatchObject({error:{code:"ANALYSIS_IN_PROGRESS",retryable:true}});});
  it("does not leak unexpected failures",async()=>{requireUser.mockResolvedValue({uid:"user_1"});analyzeCase.mockRejectedValue(new Error("secret raw model output"));const response=await POST(new Request("http://test/api/cases/case_1/analyze",{method:"POST",body:"{}"}),context);expect(response.status).toBe(500);expect(JSON.stringify(await response.json())).not.toContain("secret");});
});
