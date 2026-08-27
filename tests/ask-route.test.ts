import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { demoRecords, demoReport } from "@/lib/demo";

const { requireUser, answerQuestion, validateReportSources, adminServices } = vi.hoisted(() => ({
  requireUser: vi.fn(), answerQuestion: vi.fn(), validateReportSources: vi.fn(), adminServices: vi.fn(),
}));
vi.mock("@/lib/server/auth", () => ({ requireUser }));
vi.mock("@/lib/server/firebase-admin", () => ({ adminServices }));
vi.mock("@/lib/server/pipeline", () => ({ validateReportSources }));
vi.mock("@/lib/server/gemini", () => ({ GeminiAdapter: class { answerQuestion = answerQuestion; } }));

import { POST } from "@/app/api/cases/[caseId]/ask/route";

const context = { params: Promise.resolve({ caseId: "case_1" }) };
const source = demoReport.evidenceAgainst[0].sources[0];
const answer = { answer: "The thyroid findings deserve follow-up.", sources: [source], followUpQuestions: ["What is missing?"], safetyNote: null };

describe("Ask AI route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ uid: "user_1" });
    answerQuestion.mockResolvedValue(answer);
    const records = { docs: [{ id: "lab-report", data: () => ({ ...demoRecords[1], status: "extracted", extraction: demoRecords[1].extraction }) }] };
    const caseRef = { get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ ownerUid: "user_1" }) }), collection: vi.fn((name: string) => name === "analyses" ? { doc: () => ({ get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ report: demoReport }) }) }) } : { get: vi.fn().mockResolvedValue(records) }) };
    adminServices.mockReturnValue({ db: { doc: vi.fn().mockReturnValue(caseRef) } });
  });

  it("requires authentication", async () => {
    requireUser.mockRejectedValue(new AppError("UNAUTHORIZED", "Sign in is required.", 401));
    const response = await POST(new Request("http://test/api/cases/case_1/ask", { method: "POST", body: JSON.stringify({ question: "What matters?", language: "en" }) }), context);
    expect(response.status).toBe(401);
    expect(answerQuestion).not.toHaveBeenCalled();
  });

  it("returns a validated, source-checked answer without storing chat", async () => {
    const response = await POST(new Request("http://test/api/cases/case_1/ask", { method: "POST", body: JSON.stringify({ question: "What matters most?", language: "en" }) }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, answer: { sources: [{ recordId: "lab-report" }] } });
    expect(validateReportSources).toHaveBeenCalledWith(answer, expect.any(Array));
  });

  it("rejects oversized or malformed questions", async () => {
    const response = await POST(new Request("http://test/api/cases/case_1/ask", { method: "POST", body: JSON.stringify({ question: "x", language: "vi" }) }), context);
    expect(response.status).toBe(400);
    expect(answerQuestion).not.toHaveBeenCalled();
  });
});
