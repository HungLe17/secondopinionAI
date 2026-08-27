import { z } from "zod";

export const LanguageSchema = z.enum(["en", "vi"]);

const limited = (max: number) => z.string().trim().max(max);

export const IntakeSchema = z.object({
  ageOrRange: limited(40).min(1, "Enter an age or age range."),
  sexRelevantToCare: limited(80).nullable(),
  currentDiagnosis: limited(2000).min(1, "Describe the current diagnosis."),
  symptoms: limited(8000).min(1, "Describe the symptoms and timing."),
  currentTreatment: limited(5000).min(1, "Describe current treatment, or enter ‘None’."),
  relevantHistory: limited(5000).min(1, "Add relevant history, or enter ‘None’."),
  mainQuestions: limited(5000).min(1, "Add at least one concern or question."),
  language: LanguageSchema
});

export const IntakeFormSchema = IntakeSchema.extend({
  title: limited(120).min(2, "Give this case a short title.")
});

export type Intake = z.infer<typeof IntakeSchema>;

export const SourceSchema = z.object({
  recordId: z.string().min(1).max(128),
  displayName: z.string().min(1).max(240),
  page: z.number().int().positive().nullable(),
  section: z.string().max(160).nullable()
});

export type SourceReference = z.infer<typeof SourceSchema>;

const sourced = {
  source: SourceSchema
};

export const RecordExtractionSchema = z.object({
  documentType: z.string().max(120).nullable(),
  documentDate: z.string().max(40).nullable(),
  facility: z.string().max(160).nullable(),
  clinicians: z.array(z.string().max(160)).max(12),
  patientSummary: z.string().max(3000),
  encounters: z.array(z.object({ date: z.string().max(40).nullable(), reason: z.string().max(400), findings: z.string().max(1200), assessment: z.string().max(1200), plan: z.string().max(1200), ...sourced })).max(30),
  diagnoses: z.array(z.object({ name: z.string().max(240), status: z.string().max(100).nullable(), date: z.string().max(40).nullable(), ...sourced })).max(30),
  symptoms: z.array(z.object({ name: z.string().max(240), onset: z.string().max(160).nullable(), severity: z.string().max(100).nullable(), status: z.string().max(100).nullable(), ...sourced })).max(40),
  medications: z.array(z.object({ name: z.string().max(240), dose: z.string().max(100).nullable(), route: z.string().max(80).nullable(), frequency: z.string().max(100).nullable(), status: z.string().max(100).nullable(), date: z.string().max(40).nullable(), ...sourced })).max(40),
  allergies: z.array(z.string().max(240)).max(30),
  vitals: z.array(z.string().max(300)).max(30),
  labs: z.array(z.object({ name: z.string().max(200), value: z.string().max(120), unit: z.string().max(80).nullable(), referenceRange: z.string().max(120).nullable(), flag: z.string().max(80).nullable(), date: z.string().max(40).nullable(), ...sourced })).max(60),
  imaging: z.array(z.object({ study: z.string().max(240), date: z.string().max(40).nullable(), findings: z.string().max(1500), impression: z.string().max(1000), ...sourced })).max(30),
  procedures: z.array(z.string().max(500)).max(30),
  recommendations: z.array(z.string().max(600)).max(30),
  uncertainties: z.array(z.string().max(600)).max(30),
  sourceSnippets: z.array(z.object({ page: z.number().int().positive().nullable(), section: z.string().max(160).nullable(), quote: z.string().max(300).refine(value => value.trim().split(/\s+/).length <= 25, "Source quotes must contain at most 25 words.") })).max(30)
});

export type RecordExtraction = z.infer<typeof RecordExtractionSchema>;

const sources = z.array(SourceSchema).max(12);

export const SecondOpinionReportSchema = z.object({
  overallAssessment: z.enum(["consistent", "mixed", "concerning", "insufficient_information"]),
  headline: z.string().min(1).max(240),
  executiveSummary: z.string().min(1).max(3000),
  urgency: z.enum(["emergency", "urgent", "routine", "none"]),
  redFlags: z.array(z.object({ title: z.string().max(240), reason: z.string().max(800), action: z.string().max(600), sources })).max(12),
  caseSnapshot: z.object({ demographics: z.string().max(500), currentDiagnosis: z.string().max(1000), currentTreatment: z.string().max(1200), keySymptoms: z.array(z.string().max(300)).max(20) }),
  timeline: z.array(z.object({ date: z.string().max(40).nullable(), event: z.string().max(800), significance: z.string().max(800), sources })).max(40),
  evidenceFor: z.array(z.object({ point: z.string().max(800), significance: z.string().max(800), sources })).max(30),
  evidenceAgainst: z.array(z.object({ point: z.string().max(800), significance: z.string().max(800), sources })).max(30),
  alternativeConsiderations: z.array(z.object({ name: z.string().max(240), priority: z.enum(["high", "medium", "low"]), rationale: z.string().max(1000), whatWouldClarify: z.string().max(800), sources })).max(20),
  missingInformation: z.array(z.object({ item: z.string().max(500), whyItMatters: z.string().max(800), priority: z.enum(["high", "medium", "low"]) })).max(30),
  contradictions: z.array(z.object({ description: z.string().max(800), itemsInConflict: z.array(z.string().max(500)).max(8), howToClarify: z.string().max(800), sources })).max(20),
  treatmentConsiderations: z.array(z.object({ topic: z.string().max(240), discussionPoint: z.string().max(1000), caution: z.string().max(800), sources })).max(30),
  questionsForDoctor: z.array(z.string().max(600)).max(30),
  uncertainty: z.string().max(1500),
  limitations: z.array(z.string().max(600)).max(20)
});

export type SecondOpinionReport = z.infer<typeof SecondOpinionReportSchema>;

export const CaseIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
export const AnalyzeBodySchema = z.object({}).strict();

export const AskQuestionSchema = z.object({
  question: z.string().trim().min(3).max(1000),
  language: LanguageSchema,
}).strict();

export const AskAnswerSchema = z.object({
  answer: z.string().min(1).max(3000),
  sources: z.array(SourceSchema).max(8),
  followUpQuestions: z.array(z.string().min(1).max(300)).max(3),
  safetyNote: z.string().max(500).nullable(),
});

export type AskAnswer = z.infer<typeof AskAnswerSchema>;
