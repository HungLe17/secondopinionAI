"use client";

import { ArrowRight, Bot, Check, ClipboardCheck, FileSearch, Languages, LockKeyhole, Stethoscope } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { TrackedLink } from "@/components/tracked-link";
import { useLanguage } from "@/components/language-provider";

export default function Home() {
  const { t } = useLanguage();
  return <>
    <SiteHeader />
    <main className="page home-page service-home">
      <section className="service-hero">
        <div className="service-copy">
          <p className="eyebrow"><Stethoscope />{t("home.serviceTag")}</p>
          <h1>{t("home.serviceTitle")}</h1>
          <p className="lead">{t("home.serviceLead")}</p>
          <ul className="service-proof"><li><Check />{t("home.servicePoint1")}</li><li><Check />{t("home.servicePoint2")}</li><li><Check />{t("home.servicePoint3")}</li></ul>
          <div className="actions"><TrackedLink className="button" event="landing_cta" href="/login?next=/cases/new">{t("home.startNow")}<ArrowRight /></TrackedLink><TrackedLink className="button secondary" event="demo_opened" href="/demo">{t("home.seeSample")}</TrackedLink></div>
          <p className="language-care"><Languages />{t("home.languageCare")}</p>
        </div>
        <div className="diagnostic-preview" aria-label={t("home.previewLabel")}>
          <header><div><span className="clinical-symbol"><Stethoscope /></span><div><small>{t("home.previewLabel")}</small><strong>{t("home.previewStatus")}</strong></div></div><span>SO / 01</span></header>
          <section><p className="section-label">{t("report.bottomLine")}</p><h2>{t("home.previewHeadline")}</h2><p>{t("home.previewSummary")}</p></section>
          <div className="preview-findings"><div><span>02</span><p>{t("home.previewSupport")}</p></div><div className="attention"><span>03</span><p>{t("home.previewMismatch")}</p></div><div><span>04</span><p>{t("home.previewQuestions")}</p></div></div>
          <footer><FileSearch />{t("home.previewSources")}</footer>
        </div>
      </section>

      <section className="service-features">
        <header><p className="eyebrow">{t("home.featuresLabel")}</p><h2>{t("home.featuresTitle")}</h2></header>
        <div className="feature-ledger">
          <article><span><FileSearch /></span><div><h3>{t("home.feature1Title")}</h3><p>{t("home.feature1Body")}</p></div></article>
          <article><span><Bot /></span><div><h3>{t("home.feature2Title")}</h3><p>{t("home.feature2Body")}</p></div></article>
          <article><span><ClipboardCheck /></span><div><h3>{t("home.feature3Title")}</h3><p>{t("home.feature3Body")}</p></div></article>
          <article><span><LockKeyhole /></span><div><h3>{t("home.feature4Title")}</h3><p>{t("home.feature4Body")}</p></div></article>
        </div>
      </section>

      <section className="service-process">
        <div><p className="eyebrow">{t("home.how")}</p><h2>{t("home.cautious")}</h2><p>{t("home.cautiousBody")}</p></div>
        <ol><li><span>01</span><div><h3>{t("home.step1")}</h3><p>{t("home.step1Body")}</p></div></li><li><span>02</span><div><h3>{t("home.step2")}</h3><p>{t("home.step2Body")}</p></div></li><li><span>03</span><div><h3>{t("home.step3")}</h3><p>{t("home.step3Body")}</p></div></li></ol>
      </section>

      <section className="service-cta"><div><p className="eyebrow">Second Opinion AI</p><h2>{t("home.serviceCtaTitle")}</h2><p>{t("home.serviceCtaBody")}</p></div><TrackedLink className="button" event="landing_cta" href="/login?next=/cases/new">{t("home.startNow")}<ArrowRight /></TrackedLink></section>
      <div className="emergency-note">{t("home.emergency")}</div>
    </main>
    <Footer />
  </>;
}
