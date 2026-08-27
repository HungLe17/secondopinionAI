import type { RecordExtraction, SecondOpinionReport } from "@/lib/schemas";

export const demoRecords: Array<{ id: string; displayName: string; contentType: string; size: number; extraction: RecordExtraction }> = [
  {
    id: "primary-note", displayName: "Fictional_River_Clinic_Note.txt", contentType: "text/plain", size: 4820,
    extraction: {
      documentType: "Primary care note", documentDate: "2026-07-02", facility: "River Lantern Clinic (fictional)", clinicians: ["Dr. Linh Nguyen (fictional)"],
      patientSummary: "Fictional patient reports eight weeks of fatigue, intermittent palpitations, heat intolerance, and unintentional weight loss. Provisional diagnosis is anxiety.",
      encounters: [{ date: "2026-07-02", reason: "Fatigue and palpitations", findings: "Pulse 104 beats/min; mild hand tremor noted.", assessment: "Symptoms provisionally attributed to anxiety.", plan: "Continue observation and review after laboratory testing.", source: { recordId: "primary-note", displayName: "Fictional_River_Clinic_Note.txt", page: null, section: "Assessment" } }],
      diagnoses: [{ name: "Anxiety (provisional)", status: "current", date: "2026-07-02", source: { recordId: "primary-note", displayName: "Fictional_River_Clinic_Note.txt", page: null, section: "Assessment" } }],
      symptoms: [
        { name: "Palpitations", onset: "8 weeks", severity: "intermittent", status: "ongoing", source: { recordId: "primary-note", displayName: "Fictional_River_Clinic_Note.txt", page: null, section: "History" } },
        { name: "Weight loss", onset: "8 weeks", severity: "4 kg", status: "ongoing", source: { recordId: "primary-note", displayName: "Fictional_River_Clinic_Note.txt", page: null, section: "History" } }
      ],
      medications: [{ name: "Propranolol", dose: "10 mg", route: "oral", frequency: "as needed", status: "listed", date: "2026-07-02", source: { recordId: "primary-note", displayName: "Fictional_River_Clinic_Note.txt", page: null, section: "Medication list" } }],
      allergies: ["No known drug allergies documented"], vitals: ["Pulse 104 beats/min"], labs: [], imaging: [], procedures: [],
      recommendations: ["Review after laboratory testing"], uncertainties: ["The note does not document a formal anxiety screening assessment."],
      sourceSnippets: [{ page: null, section: "History", quote: "Eight weeks of fatigue, heat intolerance, palpitations and four-kilogram weight loss." }]
    }
  },
  {
    id: "lab-report", displayName: "Fictional_Sunrise_Lab_Report.pdf", contentType: "application/pdf", size: 188400,
    extraction: {
      documentType: "Laboratory report", documentDate: "2026-07-05", facility: "Sunrise Diagnostics (fictional)", clinicians: [], patientSummary: "Thyroid testing shows suppressed TSH and elevated free T4.", encounters: [], diagnoses: [], symptoms: [], medications: [], allergies: [], vitals: [],
      labs: [
        { name: "TSH", value: "0.02", unit: "mIU/L", referenceRange: "0.4–4.0", flag: "low", date: "2026-07-05", source: { recordId: "lab-report", displayName: "Fictional_Sunrise_Lab_Report.pdf", page: 1, section: "Thyroid panel" } },
        { name: "Free T4", value: "27", unit: "pmol/L", referenceRange: "10–20", flag: "high", date: "2026-07-05", source: { recordId: "lab-report", displayName: "Fictional_Sunrise_Lab_Report.pdf", page: 1, section: "Thyroid panel" } }
      ],
      imaging: [], procedures: [], recommendations: ["Clinical correlation advised"], uncertainties: ["No repeat thyroid panel is present."], sourceSnippets: [{ page: 1, section: "Thyroid panel", quote: "TSH low; free T4 high. Clinical correlation advised." }]
    }
  },
  {
    id: "imaging-report", displayName: "Fictional_Harbor_Imaging.pdf", contentType: "application/pdf", size: 224100,
    extraction: {
      documentType: "Thyroid ultrasound", documentDate: "2026-07-12", facility: "Harbor Imaging Centre (fictional)", clinicians: ["Dr. An Tran (fictional)"], patientSummary: "Ultrasound describes a mildly enlarged, heterogeneous thyroid without a dominant nodule.", encounters: [], diagnoses: [], symptoms: [], medications: [], allergies: [], vitals: [], labs: [],
      imaging: [{ study: "Thyroid ultrasound", date: "2026-07-12", findings: "Mild diffuse enlargement and heterogeneous echotexture. No dominant nodule.", impression: "Diffuse thyroid change; correlate with thyroid function tests.", source: { recordId: "imaging-report", displayName: "Fictional_Harbor_Imaging.pdf", page: 1, section: "Impression" } }],
      procedures: [], recommendations: ["Correlate with thyroid function tests"], uncertainties: ["Ultrasound does not establish the cause of thyroid dysfunction."], sourceSnippets: [{ page: 1, section: "Impression", quote: "Diffuse thyroid change; correlate with thyroid function tests." }]
    }
  }
];

const primary = { recordId: "primary-note", displayName: "Fictional_River_Clinic_Note.txt", page: null, section: "History" };
const lab = { recordId: "lab-report", displayName: "Fictional_Sunrise_Lab_Report.pdf", page: 1, section: "Thyroid panel" };
const imaging = { recordId: "imaging-report", displayName: "Fictional_Harbor_Imaging.pdf", page: 1, section: "Impression" };

export const demoReport: SecondOpinionReport = {
  overallAssessment: "mixed", urgency: "urgent", headline: "The anxiety label does not fully explain the objective thyroid findings.",
  executiveSummary: "Some symptoms can occur with anxiety, but the suppressed thyroid-stimulating hormone (TSH), elevated free T4, persistent fast pulse, weight loss, and ultrasound changes warrant prompt clinician review for an overactive thyroid. The records are not sufficient to establish the cause.",
  redFlags: [{ title: "Seek urgent help for severe heart or breathing symptoms", reason: "The record shows a fast pulse and palpitations. A sustained very fast or irregular heartbeat with chest pain, fainting, severe breathlessness, confusion, or high fever can require emergency assessment.", action: "If any of these symptoms are happening now, seek immediate in-person care or contact your local emergency service. In Vietnam, call 115.", sources: [primary] }],
  caseSnapshot: { demographics: "Fictional adult, age range 30–39; sex relevant to care not provided.", currentDiagnosis: "Anxiety, documented as provisional.", currentTreatment: "Propranolol 10 mg by mouth as needed is listed; the reason and actual use are unclear.", keySymptoms: ["Eight weeks of palpitations", "Heat intolerance", "Fatigue", "4 kg unintentional weight loss"] },
  timeline: [
    { date: "2026-05", event: "Symptoms reportedly began.", significance: "Persistent systemic symptoms preceded the provisional diagnosis.", sources: [primary] },
    { date: "2026-07-02", event: "Primary-care assessment documented fast pulse, tremor, and provisional anxiety.", significance: "Anxiety may overlap with these symptoms, but physical causes also need consideration.", sources: [primary] },
    { date: "2026-07-05", event: "TSH was suppressed and free T4 elevated.", significance: "This pattern supports biochemical thyroid overactivity and does not fit anxiety alone.", sources: [lab] },
    { date: "2026-07-12", event: "Ultrasound showed diffuse thyroid change without a dominant nodule.", significance: "The imaging supports thyroid involvement but does not determine its cause.", sources: [imaging] }
  ],
  evidenceFor: [{ point: "Palpitations and fatigue may occur with anxiety.", significance: "These symptoms overlap with the provisional diagnosis but are not specific to it.", sources: [primary] }],
  evidenceAgainst: [
    { point: "TSH is low and free T4 is high.", significance: "Objective thyroid abnormalities are not explained by anxiety alone.", sources: [lab] },
    { point: "Weight loss, heat intolerance, tremor, and fast pulse cluster together.", significance: "The pattern warrants evaluation for a medical driver of the symptoms.", sources: [primary] }
  ],
  alternativeConsiderations: [
    { name: "Hyperthyroidism (overactive thyroid), cause not established", priority: "high", rationale: "Symptoms and thyroid tests are compatible with excess thyroid hormone.", whatWouldClarify: "Repeat thyroid function testing, thyroid-related antibodies, examination, and clinician-directed follow-up.", sources: [primary, lab, imaging] },
    { name: "Thyroid inflammation", priority: "medium", rationale: "Diffuse ultrasound changes and abnormal thyroid tests can occur with inflammation, but the record lacks timing and antibody information.", whatWouldClarify: "Clinical history, examination, repeat laboratory pattern, and tests selected by the treating clinician.", sources: [lab, imaging] }
  ],
  missingInformation: [{ item: "Repeat TSH, free T4, and free T3", whyItMatters: "Would confirm persistence and help characterize the thyroid pattern.", priority: "high" }],
  contradictions: [{ description: "The primary-care note plans review after laboratory testing, but labels symptoms as anxiety before the later abnormal thyroid results are integrated.", itemsInConflict: ["Provisional anxiety assessment", "Abnormal thyroid panel"], howToClarify: "Ask whether the diagnosis was reconsidered after the laboratory report arrived.", sources: [primary, lab] }],
  treatmentConsiderations: [{ topic: "Propranolol use", discussionPoint: "Ask what symptom it is intended to address, how often it should be used, and what monitoring is appropriate.", caution: "Do not start, stop, or change the dose based on this report; discuss it with a licensed clinician.", sources: [primary] }],
  questionsForDoctor: ["Do the thyroid test results change the provisional anxiety diagnosis?", "What could be causing the thyroid hormone pattern, and what tests would distinguish the possibilities?", "How soon should the thyroid panel and pulse be reassessed?", "Which symptoms should prompt urgent or emergency care?"],
  uncertainty: "This review cannot determine the cause of the abnormal thyroid tests and cannot confirm a diagnosis. It relies on three fictional records and the supplied context.",
  limitations: ["No physical examination beyond the brief primary-care note.", "No repeat thyroid testing or thyroid antibody results.", "Medication use and medical history may be incomplete."]
};

