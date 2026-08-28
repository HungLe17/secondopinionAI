"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { vi as viLocale } from "date-fns/locale";
import { AlertTriangle, ArrowDown, Check, CheckCircle2, ChevronRight, CircleHelp, Clipboard, FileCheck2, FileText, ListChecks, Minus, Stethoscope } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { AskAI } from "@/components/ask-ai";
import type { TranslationKey } from "@/lib/i18n";
import type { RecordExtraction, SecondOpinionReport, SourceReference } from "@/lib/schemas";

export type ReportRecord = { id: string; displayName: string; contentType: string; size: number; extraction: RecordExtraction | null };
type T = (key: TranslationKey, values?: Record<string, string | number>) => string;

function Sources({ sources, onSelect, t }: { sources: SourceReference[]; onSelect: (id: string) => void; t: T }) {
  if (!sources.length) return null;
  return <div className="sources" aria-label={t("report.sources")}>{sources.map((source, index) => {
    const location = source.page ? `${t("report.page")} ${source.page}` : source.section || t("report.record");
    return <button key={`${source.recordId}-${index}`} className="source-chip" onClick={() => onSelect(source.recordId)}>{source.displayName} · {location}</button>;
  })}</div>;
}

export function sourceLabel(source: SourceReference) {
  return `${source.displayName} · ${source.page ? `p. ${source.page}` : source.section || "record"}`;
}

export function ReportView({ report, records, caseId, readOnly = false, onDeleteRecord }: { report: SecondOpinionReport; records: ReportRecord[]; caseId?: string; readOnly?: boolean; onDeleteRecord?: (id: string) => void }) {
  const { language, t } = useLanguage();
  const [highlight, setHighlight] = useState<string | null>(null);
  const [completedQuestions, setCompletedQuestions] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!caseId) return;
    const saved = window.localStorage.getItem(`second-opinion-visit-prep-${caseId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as unknown;
        if (Array.isArray(parsed) && parsed.every(item => Number.isInteger(item))) window.setTimeout(() => setCompletedQuestions(parsed as number[]), 0);
      } catch { /* Ignore invalid local-only checklist state. */ }
    }
  }, [caseId]);
  const selectSource = (id: string) => {
    setHighlight(id);
    document.getElementById(`record-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => setHighlight(null), 1800);
  };
  const priority = (value: "high" | "medium" | "low") => t(`priority.${value}`);
  const urgencyLabel = t(`urgency.${report.urgency}`);
  const toggleQuestion = (index: number) => setCompletedQuestions(current => {
    const next = current.includes(index) ? current.filter(item => item !== index) : [...current, index];
    if (caseId) window.localStorage.setItem(`second-opinion-visit-prep-${caseId}`, JSON.stringify(next));
    return next;
  });
  const copyBrief = async () => {
    const brief = [report.headline, report.executiveSummary, t("report.questions"), ...report.questionsForDoctor.map((question, index) => `${index + 1}. ${question}`)].join("\n\n");
    await navigator.clipboard.writeText(brief);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  };

  const generatedDate = format(new Date(), "PPP", { locale: language === "vi" ? viLocale : undefined });

  return <>
    <header className="print-only print-report-header">
      <div><strong>Second Opinion AI</strong><span>{t("report.reviewTitle")}</span></div>
      <p>{t("report.generated", { date: generatedDate })}</p>
      <dl><div><dt>{t("report.reviewedRecords")}</dt><dd>{records.length}</dd></div><div><dt>{t("report.reportStatus")}</dt><dd>{t("report.readyToReview")}</dd></div></dl>
      <aside><strong>{t("report.disclaimerTitle")}</strong> {t("report.disclaimer")}</aside>
    </header>
    <section className="medical-result" aria-label={t("report.reviewTitle")}>
    <header className="report-letterhead no-print">
      <div className="report-letterhead-brand"><span><Stethoscope /></span><div><strong>Second Opinion AI</strong><small>{t("report.reviewTitle")}</small></div></div>
      <dl>
        <div><dt>{t("report.reviewedRecords")}</dt><dd>{records.length}</dd></div>
        <div><dt>{t("report.preparedOn")}</dt><dd>{generatedDate}</dd></div>
        <div><dt>{t("report.reportStatus")}</dt><dd><span />{t("report.readyToReview")}</dd></div>
      </dl>
    </header>
    <div className="report-command-bar no-print">
      <nav className="report-nav" aria-label={t("report.jumpTo")}>
        <span>{t("report.jumpTo")}</span>
        <a href="#overview" title={t("report.navOverview")}><FileCheck2 /><span>{t("report.navOverview")}</span></a>
        <a href="#evidence" title={t("report.navEvidence")}><ListChecks /><span>{t("report.navEvidence")}</span></a>
        <a href="#next-steps" title={t("report.navActions")}><Stethoscope /><span>{t("report.navActions")}</span></a>
        <a href="#records" title={t("report.navRecords")}><FileText /><span>{t("report.navRecords")}</span></a>
      </nav>
      <div className="report-tools"><AskAI caseId={caseId} onSelectSource={selectSource} /><button className="copy-brief" title={copied ? t("report.copied") : t("report.copyBrief")} onClick={() => void copyBrief()}>{copied ? <CheckCircle2 /> : <Clipboard />}<span><strong>{copied ? t("report.copied") : t("report.copyBrief")}</strong><small>{t("report.copyBriefHint")}</small></span></button></div>
    </div>
    <div className="clinical-report">
      <article className="report-main">
        <header className="assessment-header" id="overview">
          <div className="assessment-kicker"><span className={`assessment-mark ${report.overallAssessment}`}>{t(`assessment.${report.overallAssessment}`)}</span><span className={`urgency-label ${report.urgency}`}>{t("report.urgencyLabel")}: {urgencyLabel}</span></div>
          <p className="section-label">{t("report.bottomLine")}</p>
          <h2>{report.headline}</h2>
          <p className="executive-summary">{report.executiveSummary}</p>
          <div className="report-stats" aria-label={t("report.atGlance")}>
            <div><strong>{report.evidenceFor.length}</strong><span>{t("report.supporting")}</span></div>
            <div><strong>{report.evidenceAgainst.length}</strong><span>{t("report.notFit")}</span></div>
            <div><strong>{report.missingInformation.length}</strong><span>{t("report.informationGaps")}</span></div>
            <div><strong>{report.redFlags.length}</strong><span>{t("report.redFlagCount")}</span></div>
          </div>
        </header>

        <div className="clinical-disclaimer"><AlertTriangle size={18} /><p><strong>{t("report.disclaimerTitle")}</strong> {t("report.disclaimer")} <span>{t("report.emergency")}</span></p></div>

        {report.redFlags.length > 0 && <section className="red-flag-section" aria-labelledby="red-flags"><p className="section-label">{t("report.actNow")}</p><h2 id="red-flags">{t("report.redFlags")}</h2>{report.redFlags.map((item, i) => <article key={i}><h3>{item.title}</h3><p>{item.reason}</p><strong>{item.action}</strong><Sources sources={item.sources} onSelect={selectSource} t={t} /></article>)}</section>}

        <section className="report-block case-summary" aria-labelledby="case-summary-title">
          <div className="block-heading"><p className="section-index">01</p><div><p className="section-label">{t("report.reconstructed")}</p><h2 id="case-summary-title">{t("report.caseSnapshot")}</h2></div></div>
          <dl className="case-facts">
            <div><dt>{t("report.context")}</dt><dd>{report.caseSnapshot.demographics}</dd></div>
            <div><dt>{t("report.diagnosis")}</dt><dd>{report.caseSnapshot.currentDiagnosis}</dd></div>
            <div><dt>{t("report.treatment")}</dt><dd>{report.caseSnapshot.currentTreatment}</dd></div>
            <div><dt>{t("report.symptoms")}</dt><dd>{report.caseSnapshot.keySymptoms.join("; ") || t("report.none")}</dd></div>
          </dl>
          <details className="timeline-disclosure"><summary>{t("report.timeline")} <span>{report.timeline.length}</span><ChevronRight /></summary><div className="timeline-table">{report.timeline.map((item, i) => <article key={i}><time>{item.date || t("report.unclearDate")}</time><div><h3>{item.event}</h3><p>{item.significance}</p><Sources sources={item.sources} onSelect={selectSource} t={t} /></div></article>)}</div></details>
        </section>

        <section className="report-block" id="evidence" aria-labelledby="evidence-title">
          <div className="block-heading"><p className="section-index">02</p><div><p className="section-label">{t("report.evidenceReview")}</p><h2 id="evidence-title">{t("report.whatFits")}</h2></div></div>
          <div className="evidence-board">
            <EvidenceColumn tone="supports" icon={<Check />} title={t("report.evidenceFor")} empty={t("report.noEvidence")} items={report.evidenceFor.map(item => ({ title: item.point, body: item.significance, sources: item.sources }))} onSelect={selectSource} t={t} />
            <EvidenceColumn tone="challenges" icon={<Minus />} title={t("report.evidenceAgainst")} empty={t("report.noMismatch")} items={report.evidenceAgainst.map(item => ({ title: item.point, body: item.significance, sources: item.sources }))} onSelect={selectSource} t={t} />
          </div>
        </section>

        <section className="report-block" aria-labelledby="gaps-title">
          <div className="block-heading"><p className="section-index">03</p><div><p className="section-label">{t("report.gapsLabel")}</p><h2 id="gaps-title">{t("report.gapsTitle")}</h2></div></div>
          <div className="ranked-list">
            {report.alternativeConsiderations.map((item, i) => <article key={`alternative-${i}`}><span className={`priority priority-${item.priority}`}>{priority(item.priority)}</span><div><h3>{item.name}</h3><p>{item.rationale}</p><p className="clarifier"><strong>{t("report.clarify")}</strong> {item.whatWouldClarify}</p><Sources sources={item.sources} onSelect={selectSource} t={t} /></div></article>)}
            {report.missingInformation.map((item, i) => <article key={`missing-${i}`}><span className={`priority priority-${item.priority}`}>{priority(item.priority)}</span><div><h3>{item.item}</h3><p>{item.whyItMatters}</p></div></article>)}
          </div>
          {report.contradictions.length > 0 && <details className="contradictions"><summary>{t("report.contradictions")} <span>{report.contradictions.length}</span><ChevronRight /></summary>{report.contradictions.map((item, i) => <article key={i}><h3>{item.description}</h3><p><strong>{t("report.conflict")}</strong> {item.itemsInConflict.join("; ")}</p><p><strong>{t("report.howClarify")}</strong> {item.howToClarify}</p><Sources sources={item.sources} onSelect={selectSource} t={t} /></article>)}</details>}
        </section>

        <section className="report-block actions-block" id="next-steps" aria-labelledby="actions-title">
          <div className="block-heading"><p className="section-index">04</p><div><p className="section-label">{t("report.nextVisit")}</p><h2 id="actions-title">{t("report.actionsTitle")}</h2></div></div>
          <div className="action-columns">
            <div><h3><Stethoscope />{t("report.treatmentPoints")}</h3>{report.treatmentConsiderations.length ? report.treatmentConsiderations.map((item, i) => <article key={i}><h4>{item.topic}</h4><p>{item.discussionPoint}</p><p className="caution"><strong>{t("report.caution")}</strong> {item.caution}</p><Sources sources={item.sources} onSelect={selectSource} t={t} /></article>) : <p>{t("report.noTreatment")}</p>}</div>
            <div><h3><CircleHelp />{t("report.questions")}<span className="question-progress">{t("report.prepared", { done: completedQuestions.length, total: report.questionsForDoctor.length })}</span></h3>{report.questionsForDoctor.length ? <ol className="doctor-questions">{report.questionsForDoctor.map((question, i) => <li className={completedQuestions.includes(i) ? "question-done" : ""} key={i}><button onClick={() => toggleQuestion(i)} aria-label={completedQuestions.includes(i) ? t("report.markNotAsked") : t("report.markAsked")} aria-pressed={completedQuestions.includes(i)}>{completedQuestions.includes(i) ? <Check /> : <span>{String(i + 1).padStart(2, "0")}</span>}</button><span>{question}</span></li>)}</ol> : <p>{t("report.noQuestions")}</p>}</div>
          </div>
        </section>

        <details className="limitations"><summary>{t("report.uncertainty")}<ArrowDown /></summary><p>{report.uncertainty}</p><ul>{report.limitations.map((item, i) => <li key={i}>{item}</li>)}</ul></details>
      </article>

      <aside className="record-index" id="records" aria-label={t("report.records")}>
        <div className="record-index-heading"><FileText size={19} /><div><h2>{t("report.records")}</h2><p>{t("report.rawDeleted")}</p></div></div>
        <div className="records-list">{records.map((record, index) => <article id={`record-${record.id}`} className={highlight === record.id ? "record-highlight" : ""} key={record.id}><span className="record-number">{String(index + 1).padStart(2, "0")}</span><div><strong>{record.displayName}</strong><p>{record.extraction?.documentType || record.contentType} · {(record.size / 1024).toFixed(0)} KiB</p>{record.extraction?.patientSummary && <details><summary>{t("report.viewSummary")}</summary><p>{record.extraction.patientSummary}</p></details>}</div>{!readOnly && onDeleteRecord && <button className="text-button" onClick={() => onDeleteRecord(record.id)}>{t("report.delete")}</button>}</article>)}</div>
      </aside>
    </div>
    </section>
    <footer className="print-only print-report-footer">Second Opinion AI <span>{t("report.disclaimerTitle")}</span></footer>
  </>;
}

function EvidenceColumn({ tone, icon, title, items, empty, onSelect, t }: { tone: string; icon: React.ReactNode; title: string; empty: string; items: Array<{ title: string; body: string; sources: SourceReference[] }>; onSelect: (id: string) => void; t: T }) {
  return <div className={`evidence-column ${tone}`}><h3>{icon}{title}<span>{items.length}</span></h3>{items.length ? items.map((item, i) => <article key={i}><h4>{item.title}</h4><p>{item.body}</p><Sources sources={item.sources} onSelect={onSelect} t={t} /></article>) : <p>{empty}</p>}</div>;
}
