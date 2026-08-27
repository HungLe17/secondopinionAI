"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { vi as viLocale } from "date-fns/locale";
import { ArrowRight, FileCheck2, FileText, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RouteGuard } from "@/components/route-guard";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/components/auth-provider";
import { useLanguage } from "@/components/language-provider";
import { authorizedFetch } from "@/lib/api-client";
import { getFirebase } from "@/lib/firebase-client";
import type { CaseDocument } from "@/lib/models";
import { trackSafeEvent } from "@/lib/analytics";

type CaseRow = CaseDocument & { id: string };
type Filter = "all" | "complete" | "active";

export default function DashboardPage() { return <RouteGuard><Dashboard /></RouteGuard>; }

function Dashboard() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!user) return;
    let off = () => {};
    getFirebase().then(({ db }) => {
      off = onSnapshot(query(collection(db, "users", user.uid, "cases"), orderBy("updatedAt", "desc")), snapshot => {
        setCases(snapshot.docs.map(item => ({ id: item.id, ...(item.data() as CaseDocument) })));
        setLoading(false); setError(null);
      }, () => { setError(t("dashboard.loadError")); setLoading(false); });
    });
    return () => off();
  }, [user, revision, t]);

  const visibleCases = useMemo(() => cases.filter(item => {
    const matchesSearch = item.title.toLocaleLowerCase(language).includes(search.trim().toLocaleLowerCase(language));
    const matchesFilter = filter === "all" || (filter === "complete" ? item.status === "complete" : item.status !== "complete");
    return matchesSearch && matchesFilter;
  }), [cases, filter, language, search]);

  const remove = useCallback(async (id: string, title: string) => {
    if (!user || !window.confirm(t("dashboard.deleteConfirm", { title }))) return;
    try {
      await authorizedFetch(user, `/api/cases/${id}`, { method: "DELETE" });
      void trackSafeEvent("case_deleted"); toast.success(t("dashboard.deleted"));
    } catch (requestError) { toast.error(requestError instanceof Error ? requestError.message : t("dashboard.deleteFailed")); }
  }, [user, t]);

  return <>
    <SiteHeader />
    <main className="page dashboard-page">
      <header className="dashboard-header">
        <div><p className="eyebrow">{t("dashboard.eyebrow")}</p><h1>{t("dashboard.workspaceTitle")}</h1><p>{t("dashboard.workspaceBody")}</p></div>
        <Link className="button" href="/cases/new"><Plus />{t("dashboard.new")}</Link>
      </header>

      {!loading && cases.length > 0 && <div className="case-toolbar">
        <label><Search /><span className="sr-only">{t("dashboard.search")}</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t("dashboard.searchPlaceholder")} /></label>
        <div role="group" aria-label={t("dashboard.filterLabel")}><button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("dashboard.filterAll")} <span>{cases.length}</span></button><button aria-pressed={filter === "complete"} onClick={() => setFilter("complete")}>{t("dashboard.filterReady")} <span>{cases.filter(item => item.status === "complete").length}</span></button><button aria-pressed={filter === "active"} onClick={() => setFilter("active")}>{t("dashboard.filterActive")} <span>{cases.filter(item => item.status !== "complete").length}</span></button></div>
      </div>}

      {loading ? <div className="case-grid"><div className="skeleton case-skeleton" /><div className="skeleton case-skeleton" /></div>
        : error ? <div className="notice error"><p>{error}</p><button className="button small" onClick={() => setRevision(value => value + 1)}>{t("dashboard.retry")}</button></div>
        : cases.length === 0 ? <div className="dashboard-empty"><span><FileText /></span><div><h2>{t("dashboard.empty")}</h2><p>{t("dashboard.emptyBody")}</p><Link className="button" href="/cases/new">{t("dashboard.first")}</Link></div></div>
        : visibleCases.length === 0 ? <div className="no-results"><Search /><h2>{t("dashboard.noResults")}</h2><button onClick={() => { setSearch(""); setFilter("all"); }}>{t("dashboard.clearFilters")}</button></div>
        : <div className="friendly-case-list">{visibleCases.map(item => <article className="friendly-case" key={item.id}>
          <Link href={`/cases/${item.id}`} className="case-summary-link"><span className={`case-status-dot ${item.status}`}><FileCheck2 /></span><div><div className="case-card-top"><span className={`badge ${item.status}`}>{t(`caseStatus.${item.status}`)}</span><time>{t("dashboard.updated")} {item.updatedAt?.toDate ? formatDistanceToNow(item.updatedAt.toDate(), { addSuffix: true, locale: language === "vi" ? viLocale : undefined }) : t("dashboard.now")}</time></div><h2>{item.title}</h2><p>{item.recordCount} {item.recordCount === 1 ? t("dashboard.record") : t("dashboard.records")} · {item.status === "complete" ? t("dashboard.ready") : t("dashboard.pending")}</p></div><ArrowRight className="case-open-arrow" /></Link>
          <button className="case-delete" aria-label={`${t("case.delete")} ${item.title}`} onClick={() => void remove(item.id, item.title)}><Trash2 />{t("case.delete")}</button>
        </article>)}</div>}
    </main>
    <Footer />
  </>;
}
