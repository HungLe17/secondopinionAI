"use client";

import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RouteGuard } from "@/components/route-guard";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/components/auth-provider";
import { getFirebase } from "@/lib/firebase-client";
import { IntakeFormSchema, type Intake } from "@/lib/schemas";
import { MAX_CASE_SIZE, MAX_RECORDS, safeDisplayName, validateFileSet } from "@/lib/files";
import type { z } from "zod";
import { trackSafeEvent } from "@/lib/analytics";
import { authorizedFetch, authorizedFileUpload, localizedApiError } from "@/lib/api-client";
import { useLanguage } from "@/components/language-provider";
import { CustomSelect } from "@/components/custom-select";

type FormValues = z.infer<typeof IntakeFormSchema>;
type UploadItem = {
  id: string;
  file: File;
  displayName: string;
  size: number;
  progress: number;
  status: "extracting" | "extracted" | "failed";
  error?: string;
};
const defaults: FormValues = {
  title: "",
  ageOrRange: "",
  sexRelevantToCare: null,
  currentDiagnosis: "",
  symptoms: "",
  currentTreatment: "",
  relevantHistory: "",
  mainQuestions: "",
  language: "en",
};

export default function NewCasePage() {
  return (
    <RouteGuard>
      <NewCase />
    </RouteGuard>
  );
}

function NewCase() {
  const { user } = useAuth();
  const { language, ready: languageReady, t } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);
  const caseIdRef = useRef<string | null>(null);
  const languageApplied = useRef(false);
  const dragDepth = useRef(0);
  const form = useForm<FormValues>({
    resolver: zodResolver(IntakeFormSchema),
    defaultValues: defaults,
    mode: "onBlur",
  });
  const watchedValues = useWatch({ control: form.control });
  useEffect(() => { if (languageReady && !languageApplied.current) { languageApplied.current = true; form.setValue("language", language); } }, [languageReady, language, form]);
  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;
    getFirebase().then(async ({ db }) => {
      const snap = await getDocs(
        query(
          collection(db, "users", user.uid, "cases"),
          where("status", "==", "draft"),
          orderBy("updatedAt", "desc"),
          limit(1),
        ),
      ).catch(() => null);
      if (snap && !snap.empty) {
        const found = snap.docs[0];
        caseIdRef.current = found.id;
        setCaseId(found.id);
        const data = found.data();
        form.reset({ title: data.title || "", ...(data.intake || defaults) });
        const records = await getDocs(
          collection(db, "users", user.uid, "cases", found.id, "records"),
        );
        setUploads(
          records.docs.map((d) => {
            const x = d.data();
            return {
              id: d.id,
              file: new File([], x.displayName, { type: x.contentType }),
              displayName: x.displayName,
              size: x.size || 0,
              progress: x.status === "extracted" ? 100 : 0,
              status: x.status === "extracted" ? "extracted" : "failed",
              error: x.error?.message,
            };
          }),
        );
      }
    });
  }, [user, form]);
  const ensureCase = useCallback(async () => {
    if (!user) throw new Error(t("nav.signIn"));
    if (caseIdRef.current) return caseIdRef.current;
    const { db } = await getFirebase();
    const values = form.getValues();
    const created = await addDoc(collection(db, "users", user.uid, "cases"), {
      ownerUid: user.uid,
      title: values.title || t("caseNew.untitled"),
      status: "draft",
      analysisStage: "idle",
      progressCurrent: 0,
      progressTotal: 0,
      intake: toIntake(values),
      consent: { accepted: false, acceptedAt: null, version: "2026-08-26" },
      recordCount: 0,
      recordBytes: 0,
      latestAnalysisVersion: 0,
      lastError: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      analyzedAt: null,
    });
    caseIdRef.current = created.id;
    setCaseId(created.id);
    void trackSafeEvent("case_created");
    return created.id;
  }, [user, form, t]);
  const saveDraft = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const id = await ensureCase();
      const { db } = await getFirebase();
      const values = form.getValues();
      await setDoc(
        doc(db, "users", user.uid, "cases", id),
        {
          ownerUid: user.uid,
          title: values.title || t("caseNew.untitled"),
          intake: toIntake(values),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } finally {
      setSaving(false);
    }
  }, [user, ensureCase, form, t]);
  useEffect(() => {
    if (!user || !initialized.current) return;
    const timer = window.setTimeout(() => void saveDraft(), 700);
    return () => clearTimeout(timer);
  }, [watchedValues, user, saveDraft]);
  const next = async () => {
    if (step === 1) {
      if (!(await form.trigger())) return;
      await saveDraft();
      setStep(2);
    } else if (step === 2) {
      if (!uploads.some((x) => x.status === "extracted")) {
        toast.error(t("caseNew.needRecord"));
        return;
      }
      if (uploads.some((x) => x.status === "extracting")) {
        toast.error(t("caseNew.wait"));
        return;
      }
      setStep(3);
    }
  };
  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void addFiles([...event.target.files]);
    event.target.value = "";
  };
  const drop = (event: DragEvent) => {
    event.preventDefault();
    void addFiles([...event.dataTransfer.files]);
  };
  const addFiles = async (files: File[]) => {
    const current = uploads.filter((x) => x.status !== "failed");
    const error = validateFileSet(
      files,
      current.length,
      current.reduce((n, x) => n + x.size, 0),
    );
    if (error) {
      toast.error(error);
      return;
    }
    const id = await ensureCase();
    for (const file of files) await startExtraction(id, file);
  };
  const startExtraction = async (id: string, file: File, existingId?: string) => {
    if (!user) return;
    const recordId = existingId || crypto.randomUUID();
    const displayName = safeDisplayName(file.name);
    const item: UploadItem = {
      id: recordId,
      file,
      displayName,
      size: file.size,
      progress: 0,
      status: "extracting",
    };
    setUploads((old) => [...old.filter((x) => x.id !== item.id), item]);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("recordId", recordId);
    try {
      await authorizedFileUpload(user, `/api/cases/${id}/records/extract`, formData, progress => setUploads(old => old.map(x => x.id === recordId ? { ...x, progress } : x)));
      setUploads(old => old.map(x => x.id === recordId ? { ...x, status: "extracted", progress: 100 } : x));
      void trackSafeEvent("upload_completed", { count: 1, kind: file.type });
      toast.success(t("caseNew.extracted"));
    } catch (error) {
      const message = localizedApiError(error, language, t("caseNew.extractionFailed"));
      setUploads(old => old.map(x => x.id === recordId ? { ...x, status: "failed", error: message } : x));
      toast.error(message);
    }
  };
  const remove = async (item: UploadItem) => {
    if (!user || !caseId) return;
    if (item.status !== "extracting") await authorizedFetch(user, `/api/cases/${caseId}/records/${item.id}`, { method: "DELETE" }).catch(() => undefined);
    setUploads((old) => old.filter((x) => x.id !== item.id));
  };
  const retry = async (item: UploadItem) => {
    if (!user || !caseId || item.file.size === 0) {
      toast.error(
        t("caseNew.reselect"),
      );
      return;
    }
    await authorizedFetch(user, `/api/cases/${caseId}/records/${item.id}`, { method: "DELETE" }).catch(() => undefined);
    await startExtraction(caseId, item.file);
  };
  const generate = async () => {
    if (!user || !caseId || !consent) return;
    setSaving(true);
    try {
      const { db } = await getFirebase();
      await updateDoc(doc(db, "users", user.uid, "cases", caseId), {
        status: "ready",
        consent: {
          accepted: true,
          acceptedAt: serverTimestamp(),
          version: "2026-08-26",
        },
        updatedAt: serverTimestamp(),
      });
      router.push(`/cases/${caseId}?start=1`);
    } catch {
      toast.error(t("caseNew.prepareFailed"));
      setSaving(false);
    }
  };
  const values = form.getValues();
  const readyUploads = uploads.filter((item) => item.status === "extracted").length;
  const activeBytes = uploads.filter((item) => item.status !== "failed").reduce((total, item) => total + item.size, 0);
  return (
    <>
      <SiteHeader />
      <main className="page case-builder-page">
        <header className="case-builder-header">
          <div>
            <p className="eyebrow">{t("caseNew.eyebrow")}</p>
            <h1>{t("caseNew.title")}</h1>
            <p className={`save-status ${saving ? "is-saving" : ""}`}><span />{saving ? t("caseNew.saving") : t("caseNew.saved")}</p>
          </div>
          <div className="case-builder-stage">
            <span>{step} / 3</span>
            <strong>{step === 1 ? t("caseNew.step1") : step === 2 ? t("caseNew.step2") : t("caseNew.step3")}</strong>
          </div>
        </header>
        <div className="case-builder-layout">
          <aside className="case-builder-sidebar">
            <div className="case-builder-progress" aria-hidden="true"><span style={{ width: `${(step / 3) * 100}%` }} /></div>
            <ol className="wizard-steps case-builder-steps" aria-label={t("caseNew.title")}>
              <li className={`${step === 1 ? "active" : ""} ${step > 1 ? "complete" : ""}`}>
                <button type="button" onClick={() => setStep(1)} aria-current={step === 1 ? "step" : undefined}>
                  <b>{step > 1 ? "✓" : "1"}</b><span>{t("caseNew.step1")}</span>
                </button>
              </li>
              <li className={`${step === 2 ? "active" : ""} ${step > 2 ? "complete" : ""}`}>
                <button type="button" disabled={!caseId} onClick={() => setStep(2)} aria-current={step === 2 ? "step" : undefined}>
                  <b>{step > 2 ? "✓" : "2"}</b><span>{t("caseNew.step2")}</span>
                </button>
              </li>
              <li className={step === 3 ? "active" : ""}>
                <button type="button" disabled={readyUploads === 0 || uploads.some((item) => item.status === "extracting")} onClick={() => setStep(3)} aria-current={step === 3 ? "step" : undefined}>
                  <b>3</b><span>{t("caseNew.step3")}</span>
                </button>
              </li>
            </ol>
            <div className="case-builder-guidance">
              <ShieldCheck aria-hidden="true" />
              <p>{t("privacy.intro")}</p>
            </div>
          </aside>
          <div className="case-builder-content">
        {step === 1 && (
          <form
            className="intake-form"
            onSubmit={(e) => {
              e.preventDefault();
              void next();
            }}
          >
            <fieldset className="intake-group">
              <legend><span>01</span>{t("caseNew.detailsGroup")}</legend>
              <p className="intake-group-help">{t("caseNew.detailsHelp")}</p>
              <div className="grid">
                <Input label={t("caseNew.caseTitle")} name="title" form={form} />
                <div className="two-col grid demographic-grid">
                  <div className="field">
                    <label htmlFor="ageOrRange">{t("caseNew.age")}</label>
                    <input id="ageOrRange" placeholder={fieldPlaceholder("ageOrRange", language)} autoComplete="off" aria-invalid={Boolean(form.formState.errors.ageOrRange)} aria-describedby={form.formState.errors.ageOrRange ? "ageOrRange-error ageOrRange-hint" : "ageOrRange-hint"} required {...form.register("ageOrRange")} />
                    <small className="field-hint" id="ageOrRange-hint">{t("caseNew.ageHelp")}</small>
                    <div className="age-quick-picks" role="group" aria-label={t("caseNew.ageHelp")}>
                      {["0–12", "13–17", "18–29", "30–44", "45–59", "60–74", "75+"].map((range) => <button type="button" key={range} className={watchedValues.ageOrRange === range ? "selected" : ""} onClick={() => form.setValue("ageOrRange", range, { shouldDirty: true, shouldValidate: true })}>{range}</button>)}
                    </div>
                    {form.formState.errors.ageOrRange?.message && <span id="ageOrRange-error" className="error-text" role="alert">{validationMessage(String(form.formState.errors.ageOrRange.message), language)}</span>}
                  </div>
                  <div className="field">
                    <label htmlFor="sexRelevantToCare">{t("caseNew.sex")}</label>
                    <CustomSelect id="sexRelevantToCare" value={watchedValues.sexRelevantToCare || ""} placeholder={t("caseNew.sexPrompt")} onChange={(value) => form.setValue("sexRelevantToCare", value || null, { shouldDirty: true })} options={[
                      { value: "female", label: t("caseNew.sexFemale") },
                      { value: "male", label: t("caseNew.sexMale") },
                      { value: "intersex", label: t("caseNew.sexIntersex") },
                      { value: "prefer-not-to-say", label: t("caseNew.sexPreferNot") },
                    ]} />
                    <small className="field-hint">{t("caseNew.sexHelp")}</small>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="language">{t("caseNew.reportLanguage")}</label>
                  <CustomSelect id="language" value={watchedValues.language || "en"} placeholder={t("caseNew.reportLanguage")} onChange={(value) => form.setValue("language", value as "en" | "vi", { shouldDirty: true })} options={[
                    { value: "en", label: t("caseNew.english"), detail: "English" },
                    { value: "vi", label: t("caseNew.vietnamese"), detail: "Tiếng Việt" },
                  ]} />
                  <small className="field-hint">{t("caseNew.languageHelp")}</small>
                </div>
              </div>
            </fieldset>
            <fieldset className="intake-group">
              <legend><span>02</span>{t("caseNew.clinicalGroup")}</legend>
              <p className="intake-group-help">{t("caseNew.clinicalHelp")}</p>
              <div className="grid">
                <Text label={t("caseNew.diagnosis")} name="currentDiagnosis" form={form} />
                <Text label={t("caseNew.symptoms")} name="symptoms" form={form} />
                <Text label={t("caseNew.treatment")} name="currentTreatment" form={form} />
                <Text label={t("caseNew.history")} name="relevantHistory" form={form} />
                <Text label={t("caseNew.questions")} name="mainQuestions" form={form} />
              </div>
            </fieldset>
            <div className="actions">
              <button className="button" type="submit">
                {t("caseNew.continue")}
              </button>
            </div>
          </form>
        )}
        {step === 2 && (
          <section className="upload-workspace">
            <header className="upload-intro">
              <span className="upload-intro-icon" aria-hidden="true"><FileText /></span>
              <div>
                <p className="eyebrow">{t("caseNew.step2")}</p>
                <h2>{t("caseNew.uploadTitle")}</h2>
                <p>{t("caseNew.uploadBody")}</p>
              </div>
            </header>
            <div className="upload-privacy">
              <ShieldCheck aria-hidden="true" />
              <span>{t("caseNew.rawNotice")}</span>
            </div>
            <div
              className={`dropzone upload-dropzone ${dragActive ? "is-dragging" : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                dragDepth.current += 1;
                setDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                dragDepth.current = Math.max(0, dragDepth.current - 1);
                if (dragDepth.current === 0) setDragActive(false);
              }}
              onDrop={(event) => {
                dragDepth.current = 0;
                setDragActive(false);
                drop(event);
              }}
            >
              <span className="dropzone-icon" aria-hidden="true"><FileUp /></span>
              <h2>{t("caseNew.drop")}</h2>
              <p className="dropzone-help">{t("caseNew.dropHint")}</p>
              <label className="button">
                {t("caseNew.choose")}
                <input
                  hidden
                  multiple
                  type="file"
                  accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
                  onChange={choose}
                />
              </label>
              <div className="upload-formats" aria-label={t("caseNew.supportedFormats")}>
                <span>PDF</span><span>DOCX</span><span>TXT</span><span>JPG</span><span>PNG</span><span>WEBP</span>
              </div>
              <small>{t("caseNew.fileLimits")}</small>
            </div>
            <div className="upload-summary" aria-live="polite">
              <div><strong>{uploads.length}/{MAX_RECORDS}</strong><span>{t("caseNew.records")}</span></div>
              <div><strong>{readyUploads}</strong><span>{t("status.extracted")}</span></div>
              <div><strong>{(activeBytes / 1024 / 1024).toFixed(1)}/{MAX_CASE_SIZE / 1024 / 1024}</strong><span>MiB</span></div>
            </div>
            <div className="upload-list-heading">
              <div>
                <h3>{t("caseNew.addedRecords")}</h3>
                <p>{t("caseNew.readySummary", { ready: readyUploads, total: uploads.length })}</p>
              </div>
            </div>
            <div className="records-list">
              {uploads.length === 0 && (
                <div className="upload-empty">
                  <FileText aria-hidden="true" />
                  <div>
                    <strong>{t("caseNew.noRecords")}</strong>
                    <p>{t("caseNew.noRecordsBody")}</p>
                  </div>
                </div>
              )}
              {uploads.map((item) => (
                <div className={`record-row record-${item.status}`} key={item.id}>
                  <span className="record-file-mark" aria-hidden="true">{fileExtension(item.displayName)}</span>
                  <div className="record-content">
                    <div className="record-title-row">
                      <div>
                        <strong title={item.displayName}>{item.displayName}</strong>
                        <small>{formatFileSize(item.size)}</small>
                      </div>
                      <span className={`record-status status-${item.status}`}>
                        {item.status === "extracting" && <LoaderCircle className="is-spinning" />}
                        {item.status === "extracted" && <CheckCircle2 />}
                        {item.status === "failed" && <AlertCircle />}
                        {t(`status.${item.status}` as "status.extracting" | "status.extracted" | "status.failed")}
                      </span>
                    </div>
                    {item.status === "extracting" && (
                      <div className="progress" role="progressbar" aria-label={item.displayName} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.progress}>
                        <span style={{ width: `${item.progress}%` }} />
                      </div>
                    )}
                    {item.error && <p className="record-error">{item.error}</p>}
                  </div>
                  <div className="record-actions">
                    {item.status === "failed" && (
                      <button type="button" className="button ghost small" onClick={() => void retry(item)}>
                        <RotateCcw size={15} /> {t("caseNew.retry")}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={t("caseNew.remove", { name: item.displayName })}
                      className="button ghost small"
                      disabled={item.status === "extracting"}
                      onClick={() => void remove(item)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="actions upload-actions">
              <button type="button" className="button ghost" onClick={() => setStep(1)}>
                {t("caseNew.back")}
              </button>
              <button type="button" className="button" disabled={readyUploads === 0 || uploads.some((item) => item.status === "extracting")} onClick={() => void next()}>
                {t("caseNew.review")}
              </button>
            </div>
          </section>
        )}
        {step === 3 && (
          <section className="case-review-workspace">
            <div className="card review-card">
              <h2>{values.title}</h2>
              <div className="review-grid">
                <div><span>{t("caseNew.currentDiagnosis")}</span><p>{values.currentDiagnosis}</p></div>
                <div><span>{t("caseNew.symptoms")}</span><p>{values.symptoms}</p></div>
                <div><span>{t("caseNew.reportLanguageLabel")}</span><p>{values.language === "vi" ? t("caseNew.vietnamese") : t("caseNew.english")}</p></div>
              </div>
              <h3>{t("caseNew.records")}</h3>
              <ul className="review-records">
                {uploads
                  .filter((x) => x.status === "extracted")
                  .map((x) => (
                    <li key={x.id}>{x.displayName}</li>
                  ))}
              </ul>
            </div>
            <label className="review-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>{t("caseNew.consent")}</span>
            </label>
            <div className="disclaimer">
              {t("home.disclaimer")} {t("home.emergency")}
            </div>
            <div className="actions">
              <button className="button ghost" onClick={() => setStep(2)}>
                {t("caseNew.back")}
              </button>
              <button
                className="button"
                disabled={!consent || saving}
                onClick={() => void generate()}
              >
                {saving ? t("caseNew.preparing") : t("caseNew.generate")}
              </button>
            </div>
          </section>
        )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function toIntake(values: FormValues): Intake {
  return {
    ageOrRange: values.ageOrRange,
    sexRelevantToCare: values.sexRelevantToCare || null,
    currentDiagnosis: values.currentDiagnosis,
    symptoms: values.symptoms,
    currentTreatment: values.currentTreatment,
    relevantHistory: values.relevantHistory,
    mainQuestions: values.mainQuestions,
    language: values.language,
  };
}
type FormApi = UseFormReturn<FormValues>;
function Input({
  label,
  name,
  form,
}: {
  label: string;
  name: keyof FormValues;
  form: FormApi;
}) {
  const err = form.formState.errors[name]?.message;
  const { language } = useLanguage();
  const errorId = `${name}-error`;
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} placeholder={fieldPlaceholder(name, language)} autoComplete="off" aria-invalid={Boolean(err)} aria-describedby={err ? errorId : undefined} required={name !== "sexRelevantToCare"} {...form.register(name)} />
      {err && <span id={errorId} className="error-text" role="alert">{validationMessage(String(err), language)}</span>}
    </div>
  );
}
function Text({
  label,
  name,
  form,
}: {
  label: string;
  name: keyof FormValues;
  form: FormApi;
}) {
  const err = form.formState.errors[name]?.message;
  const { language } = useLanguage();
  const errorId = `${name}-error`;
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <textarea id={name} placeholder={fieldPlaceholder(name, language)} spellCheck aria-invalid={Boolean(err)} aria-describedby={err ? errorId : undefined} required {...form.register(name)} />
      {err && <span id={errorId} className="error-text" role="alert">{validationMessage(String(err), language)}</span>}
    </div>
  );
}

function fileExtension(name: string) {
  const extension = name.split(".").pop()?.toUpperCase();
  return extension && extension.length <= 5 ? extension : "FILE";
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function validationMessage(message: string, language: "en" | "vi") {
  if (language === "en") return message;
  const translated: Record<string, string> = {
    "Give this case a short title.": "Hãy đặt tên ngắn gọn cho ca bệnh.",
    "Enter an age or age range.": "Hãy nhập tuổi hoặc khoảng tuổi.",
    "Describe the current diagnosis.": "Hãy mô tả chẩn đoán hiện tại.",
    "Describe the symptoms and timing.": "Hãy mô tả triệu chứng và thời điểm xuất hiện.",
    "Describe current treatment, or enter ‘None’.": "Hãy mô tả điều trị hiện tại hoặc nhập ‘Không có’.",
    "Add relevant history, or enter ‘None’.": "Hãy thêm tiền sử liên quan hoặc nhập ‘Không có’.",
    "Add at least one concern or question.": "Hãy thêm ít nhất một mối quan tâm hoặc câu hỏi."
  };
  return translated[message] || message;
}

function fieldPlaceholder(name: keyof FormValues, language: "en" | "vi") {
  const copy: Record<"en" | "vi", Partial<Record<keyof FormValues, string>>> = {
    en: {
      title: "e.g. Thyroid follow-up",
      ageOrRange: "e.g. 45 or 40–49",
      sexRelevantToCare: "Optional",
      currentDiagnosis: "What diagnosis were you given, and when?",
      symptoms: "What are you experiencing? Include timing and changes.",
      currentTreatment: "List current medicines, doses, and other treatment—or enter None.",
      relevantHistory: "Add relevant conditions, procedures, allergies, or family history—or enter None.",
      mainQuestions: "What do you most want this review to clarify?",
    },
    vi: {
      title: "Ví dụ: Tái khám tuyến giáp",
      ageOrRange: "Ví dụ: 45 hoặc 40–49",
      sexRelevantToCare: "Không bắt buộc",
      currentDiagnosis: "Bạn được chẩn đoán gì và vào thời điểm nào?",
      symptoms: "Bạn đang gặp triệu chứng gì? Hãy nêu thời điểm và diễn tiến.",
      currentTreatment: "Liệt kê thuốc, liều dùng và điều trị hiện tại—hoặc ghi Không có.",
      relevantHistory: "Thêm bệnh sử, thủ thuật, dị ứng hoặc tiền sử gia đình liên quan—hoặc ghi Không có.",
      mainQuestions: "Bạn muốn bản đánh giá này làm rõ điều gì nhất?",
    },
  };
  return copy[language][name];
}
