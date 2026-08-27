"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { ArrowLeft, Pencil, Printer, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RouteGuard } from "@/components/route-guard";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/components/auth-provider";
import { ReportView, type ReportRecord } from "@/components/report-view";
import { ApiClientError, authorizedFetch, localizedApiError } from "@/lib/api-client";
import { getFirebase } from "@/lib/firebase-client";
import type {
  AnalysisDocument,
  CaseDocument,
  RecordDocument,
} from "@/lib/models";
import { CaseIdSchema } from "@/lib/schemas";
import { trackSafeEvent } from "@/lib/analytics";
import { useLanguage } from "@/components/language-provider";

export default function CasePage() {
  return (
    <RouteGuard>
      <Suspense
        fallback={
          <main className="page">
            <div className="skeleton hero-skeleton" />
          </main>
        }
      >
        <CaseWorkspace />
      </Suspense>
    </RouteGuard>
  );
}

function CaseWorkspace() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const params = useParams<{ caseId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const caseId = params.caseId;
  const started = useRef(false);
  const validCaseId = CaseIdSchema.safeParse(caseId).success;
  const [caseData, setCaseData] = useState<CaseDocument | null>(null);
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState("");
  useEffect(() => {
    if (!user || !validCaseId) return;
    const offs: Array<() => void> = [];
    getFirebase().then(({ db }) => {
      offs.push(
        onSnapshot(
          doc(db, "users", user.uid, "cases", caseId),
          (snap) => {
            if (!snap.exists()) {
              setNotFound(true);
              setLoading(false);
              return;
            }
            const value = snap.data() as CaseDocument;
            setCaseData(value);
            setTitle(value.title);
            setLoading(false);
          },
          () => {
            setNotFound(true);
            setLoading(false);
          },
        ),
      );
      offs.push(
        onSnapshot(
          collection(db, "users", user.uid, "cases", caseId, "records"),
          (snap) => {
            setRecords(
              snap.docs.filter(record => (record.data() as RecordDocument).status === "extracted").map((record) => {
                const value = record.data() as RecordDocument;
                return {
                  id: record.id,
                  displayName: value.displayName,
                  contentType: value.contentType,
                  size: value.size,
                  extraction: value.extraction,
                };
              }),
            );
          },
        ),
      );
      offs.push(
        onSnapshot(
          doc(db, "users", user.uid, "cases", caseId, "analyses", "current"),
          (snap) =>
            setAnalysis(
              snap.exists() ? (snap.data() as AnalysisDocument) : null,
            ),
        ),
      );
    });
    return () => offs.forEach((off) => off());
  }, [user, caseId, validCaseId]);
  const analyze = useCallback(
    async (force = false) => {
      if (!user) return;
      void trackSafeEvent("analysis_started");
      try {
        await authorizedFetch(
          user,
          `/api/cases/${caseId}/analyze${force ? "?force=true" : ""}`,
          { method: "POST", body: "{}" },
        );
        void trackSafeEvent("analysis_completed");
        toast.success(t("case.reportReady"));
      } catch (e) {
        void trackSafeEvent("analysis_failed");
        toast.error(localizedApiError(e, language, t("case.analysisFailed")));
      }
    },
    [user, caseId, language, t],
  );
  useEffect(() => {
    if (
      search.get("start") === "1" &&
      caseData?.status === "ready" &&
      !started.current
    ) {
      started.current = true;
      router.replace(`/cases/${caseId}`, { scroll: false });
      void analyze();
    }
  }, [search, caseData, analyze, router, caseId]);
  const saveTitle = async () => {
    if (!user || !title.trim() || title === caseData?.title) return;
    const { db } = await getFirebase();
    await updateDoc(doc(db, "users", user.uid, "cases", caseId), {
      title: title.trim().slice(0, 120),
      updatedAt: serverTimestamp(),
    });
    toast.success(t("case.titleUpdated"));
  };
  const removeCase = async () => {
    if (
      !user ||
      !window.confirm(
        t("case.deleteConfirm"),
      )
    )
      return;
    try {
      await authorizedFetch(user, `/api/cases/${caseId}`, { method: "DELETE" });
      void trackSafeEvent("case_deleted");
      toast.success(t("case.deleted"));
      router.replace("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };
  const removeRecord = async (recordId: string) => {
    if (!user || !window.confirm(t("case.recordDeleteConfirm"))) return;
    const record = records.find((x) => x.id === recordId);
    if (!record) return;
    try {
      await authorizedFetch(user, `/api/cases/${caseId}/records/${recordId}`, { method: "DELETE" });
      toast.success(t("case.recordDeleted"));
    } catch {
      toast.error(t("case.recordDeleteFailed"));
    }
  };
  if (loading)
    return (
      <>
        <SiteHeader />
        <main className="page">
          <div className="skeleton hero-skeleton" />
        </main>
      </>
    );
  if (!validCaseId || notFound || !caseData)
    return (
      <>
        <SiteHeader />
        <main className="page narrow">
          <div className="notice error">
            <h1>{t("case.notFound")}</h1><p>{t("case.notFoundBody")}</p>
          </div>
        </main>
      </>
    );
  const stage = stageLabel(caseData, t);
  return (
    <>
      <SiteHeader />
      <main className="page report-page">
        <div className="page-heading report-page-heading no-print">
          <div>
            <Link className="back-link" href="/dashboard"><ArrowLeft />{t("case.backToCases")}</Link>
            <p className="eyebrow">{t("case.eyebrow")}</p>
            <div className="report-title-editor">
              <input
                aria-label={t("case.titleLabel")}
              className="title-input"
              style={{ fontSize: "2rem", fontWeight: 800 }}
              disabled={caseData.status === "analyzing"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => void saveTitle()}
              />
              <Pencil size={18} />
            </div>
            <span className={`badge ${caseData.status}`}>
              {t(`caseStatus.${caseData.status}`)}
            </span>
          </div>
          <div className="actions">
            <button
              className="button secondary"
              disabled={!analysis}
              onClick={() => {
                void trackSafeEvent("report_printed");
                window.print();
              }}
            >
              <Printer size={17} /> {t("case.print")}
            </button>
            <button className="button danger-subtle" onClick={() => void removeCase()}>
              <Trash2 size={17} /> {t("case.delete")}
            </button>
          </div>
        </div>
        {caseData.status === "analyzing" && (
          <div className="card">
            <h2>{stage}</h2>
            <div className="progress">
              <span
                style={{
                  width: caseData.progressTotal
                    ? `${Math.max(8, (caseData.progressCurrent / caseData.progressTotal) * 100)}%`
                    : "18%",
                }}
              />
            </div>
            <p className="muted">
              {t("case.analyzingBody")}
            </p>
          </div>
        )}
        {caseData.status === "ready" && (
          <div className="card">
            <h2>{t("case.ready")}</h2>
            <button className="button" onClick={() => void analyze()}>
              {t("case.generate")}
            </button>
          </div>
        )}
        {caseData.status === "failed" && (
          <div className="notice error">
            <h2>{t("case.failed")}</h2>
            <p>
              {caseData.lastError
                ? localizedApiError(new ApiClientError(caseData.lastError.code, caseData.lastError.message), language, t("case.analysisFailed"))
                : t("case.analysisFailed")}
            </p>
            <button className="button" onClick={() => void analyze(true)}>
              <RotateCcw size={16} /> {t("case.retry")}
            </button>
          </div>
        )}
        {caseData.status === "complete" && analysis?.report && (
          <ReportView
            report={analysis.report}
            records={records}
            caseId={caseId}
            onDeleteRecord={removeRecord}
          />
        )}{" "}
        {caseData.status === "complete" && !analysis && (
          <div className="notice error">
            {t("case.reportMissing")}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function stageLabel(value: CaseDocument, t: ReturnType<typeof useLanguage>["t"]) {
  switch (value.analysisStage) {
    case "preparing":
      return t("case.stagePreparing");
    case "extracting":
      return t("case.stageExtracting", { current: Math.min(value.progressCurrent + 1, value.progressTotal), total: value.progressTotal });
    case "synthesizing":
      return t("case.stageSynthesizing");
    case "finalizing":
      return t("case.stageFinalizing");
    default:
      return t("case.stageDefault");
  }
}
