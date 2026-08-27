"use client";
import { BarChart3, Database, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { useLanguage } from "@/components/language-provider";

export default function Privacy() {
  const { t } = useLanguage();
  return <>
    <SiteHeader />
    <main className="page policy-page">
      <header className="policy-hero">
        <span className="policy-mark"><ShieldCheck /></span>
        <div><p className="eyebrow">Second Opinion AI</p><h1>{t("privacy.title")}</h1><p><strong>{t("privacy.updated")}</strong> {t("privacy.intro")}</p></div>
      </header>
      <div className="policy-grid">
        <section className="policy-section"><span><Database /></span><div><h2>{t("privacy.storedTitle")}</h2><p>{t("privacy.stored")}</p></div></section>
        <section className="policy-section"><span><Sparkles /></span><div><h2>{t("privacy.geminiTitle")}</h2><p>{t("privacy.gemini")}</p></div></section>
        <section className="policy-section"><span><Trash2 /></span><div><h2>{t("privacy.deleteTitle")}</h2><p>{t("privacy.delete")}</p></div></section>
        <section className="policy-section"><span><BarChart3 /></span><div><h2>{t("privacy.analyticsTitle")}</h2><p>{t("privacy.analytics")}</p></div></section>
      </div>
      <div className="policy-note"><ShieldCheck />{t("privacy.claim")}</div>
    </main>
    <Footer />
  </>;
}
