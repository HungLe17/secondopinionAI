"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Bot, Check, ClipboardCheck, FileSearch, Languages, LockKeyhole, Sparkles, Stethoscope } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { TrackedLink } from "@/components/tracked-link";
import { useLanguage } from "@/components/language-provider";

export default function Home() {
  const { t } = useLanguage();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minimumDisplay = new Promise((resolve) => window.setTimeout(resolve, reducedMotion ? 0 : 650));
    const fontsReady = Promise.race([
      document.fonts?.ready || Promise.resolve(),
      new Promise((resolve) => window.setTimeout(resolve, 1200)),
    ]);
    void Promise.all([minimumDisplay, fontsReady]).then(() => {
      if (active) requestAnimationFrame(() => setReady(true));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const sections = document.querySelectorAll<HTMLElement>(".landing-reveal");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sections.forEach((section) => section.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8%" });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [ready]);

  return <>
    <div className={`landing-loader ${ready ? "is-complete" : ""}`} role="status" aria-live="polite" aria-label={t("home.loading")}>
      <div className="landing-loader-mark"><Stethoscope /><span /></div>
      <strong>Second Opinion <em>AI</em></strong>
      <p>{t("home.loading")}</p>
      <div className="landing-loader-progress"><span /></div>
    </div>
    <SiteHeader />
    <main className={`page home-page service-home service-home-v2 ${ready ? "landing-ready" : "landing-waiting"}`} aria-busy={!ready}>
      <section className="service-hero premium-hero">
        <div className="hero-mesh" aria-hidden="true"><span /><span /><span /></div>
        <div className="service-copy">
          <p className="eyebrow hero-status"><span /><Stethoscope />{t("home.serviceTag")}</p>
          <h1>{t("home.serviceTitle")}</h1>
          <p className="lead">{t("home.serviceLead")}</p>
          <div className="actions"><TrackedLink className="button" event="landing_cta" href="/login?next=/cases/new">{t("home.startNow")}<ArrowRight /></TrackedLink><TrackedLink className="button secondary" event="demo_opened" href="/demo">{t("home.seeSample")}</TrackedLink></div>
          <div className="hero-confidence">
            <ul className="service-proof"><li><Check />{t("home.servicePoint1")}</li><li><Check />{t("home.servicePoint2")}</li><li><Check />{t("home.servicePoint3")}</li></ul>
            <p className="language-care"><Languages />{t("home.languageCare")}</p>
          </div>
        </div>
        <div className="hero-product-stage">
          <div className="product-orbit orbit-one" aria-hidden="true" />
          <div className="product-orbit orbit-two" aria-hidden="true" />
          <div className="floating-service-note note-source"><FileSearch /><span><small>{t("report.sources")}</small><strong>{t("home.previewSources")}</strong></span></div>
          <div className="floating-service-note note-language"><Languages /><span><small>EN / VI</small><strong>{t("home.languageCare")}</strong></span></div>
          <div className="diagnostic-preview" aria-label={t("home.previewLabel")}>
            <header><div><span className="clinical-symbol"><Stethoscope /></span><div><small>{t("home.previewLabel")}</small><strong>{t("home.previewStatus")}</strong></div></div><span>SO / 01</span></header>
            <nav className="preview-tabs" aria-hidden="true"><span className="active">{t("report.navOverview")}</span><span>{t("report.navEvidence")}</span><span>{t("report.navActions")}</span></nav>
            <section><p className="section-label">{t("report.bottomLine")}</p><h2>{t("home.previewHeadline")}</h2><p>{t("home.previewSummary")}</p></section>
            <div className="preview-findings"><div><span>02</span><p>{t("home.previewSupport")}</p></div><div className="attention"><span>03</span><p>{t("home.previewMismatch")}</p></div><div><span>04</span><p>{t("home.previewQuestions")}</p></div></div>
            <footer><Sparkles />{t("home.previewSources")}</footer>
          </div>
        </div>
        <div className="service-assurance" aria-label={t("home.featuresLabel")}>
          <div><strong>01</strong><span>{t("home.step1")}</span></div>
          <div><strong>02</strong><span>{t("home.step2")}</span></div>
          <div><strong>03</strong><span>{t("home.step3")}</span></div>
          <p><LockKeyhole />{t("home.feature4Title")}</p>
        </div>
      </section>

      <section className="service-features premium-features landing-reveal">
        <header><p className="eyebrow">{t("home.featuresLabel")}</p><h2>{t("home.featuresTitle")}</h2></header>
        <div className="feature-ledger">
          <article><span><FileSearch /></span><div><h3>{t("home.feature1Title")}</h3><p>{t("home.feature1Body")}</p></div></article>
          <article><span><Bot /></span><div><h3>{t("home.feature2Title")}</h3><p>{t("home.feature2Body")}</p></div></article>
          <article><span><ClipboardCheck /></span><div><h3>{t("home.feature3Title")}</h3><p>{t("home.feature3Body")}</p></div></article>
          <article><span><LockKeyhole /></span><div><h3>{t("home.feature4Title")}</h3><p>{t("home.feature4Body")}</p></div></article>
        </div>
      </section>

      <section className="service-process premium-process landing-reveal">
        <div><p className="eyebrow">{t("home.how")}</p><h2>{t("home.cautious")}</h2><p>{t("home.cautiousBody")}</p></div>
        <ol><li><span>01</span><div><h3>{t("home.step1")}</h3><p>{t("home.step1Body")}</p></div></li><li><span>02</span><div><h3>{t("home.step2")}</h3><p>{t("home.step2Body")}</p></div></li><li><span>03</span><div><h3>{t("home.step3")}</h3><p>{t("home.step3Body")}</p></div></li></ol>
      </section>

      <section className="service-cta landing-reveal"><div><p className="eyebrow">Second Opinion AI</p><h2>{t("home.serviceCtaTitle")}</h2><p>{t("home.serviceCtaBody")}</p></div><TrackedLink className="button" event="landing_cta" href="/login?next=/cases/new">{t("home.startNow")}<ArrowRight /></TrackedLink></section>
      <div className="emergency-note landing-reveal">{t("home.emergency")}</div>
    </main>
    <Footer />
  </>;
}
