"use client";
import { AlertTriangle, FileText, Scale, ShieldCheck, UserCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { useLanguage } from "@/components/language-provider";

export default function Terms() {
  const { t } = useLanguage();
  return <>
    <SiteHeader />
    <main className="page policy-page">
      <header className="policy-hero">
        <span className="policy-mark"><Scale /></span>
        <div><p className="eyebrow">Second Opinion AI</p><h1>{t("terms.title")}</h1><p><strong>{t("terms.updated")}</strong></p></div>
      </header>
      <div className="policy-grid">
        <section className="policy-section"><span><FileText /></span><div><h2>{t("terms.infoTitle")}</h2><p>{t("terms.info")}</p></div></section>
        <section className="policy-section is-caution"><span><AlertTriangle /></span><div><h2>{t("terms.emergencyTitle")}</h2><p>{t("terms.emergency")}</p></div></section>
        <section className="policy-section"><span><UserCheck /></span><div><h2>{t("terms.responsibilityTitle")}</h2><p>{t("terms.responsibility")}</p></div></section>
        <section className="policy-section"><span><ShieldCheck /></span><div><h2>{t("terms.limitsTitle")}</h2><p>{t("terms.limits")}</p></div></section>
      </div>
    </main>
    <Footer />
  </>;
}
