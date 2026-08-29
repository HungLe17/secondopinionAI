"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/components/auth-provider";
import { useLanguage } from "@/components/language-provider";
import { friendlyAuthError } from "@/lib/auth-errors";
import { safeNextPath } from "@/lib/navigation";

type Mode = "signin" | "create";

const subscribeToEmbedding = () => () => {};

export default function LoginPage() {
  return <Suspense fallback={<main className="page"><div className="skeleton hero-skeleton" /></main>}><LoginContent /></Suspense>;
}

function LoginContent() {
  const { user, signIn, signInWithEmail, createAccount, resetPassword, configError } = useAuth();
  const { language, t } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const next = useMemo(() => safeNextPath(params.get("next")), [params]);
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const embeddedHost = useSyncExternalStore(
    subscribeToEmbedding,
    () => window.self !== window.top ? window.location.hostname : "",
    () => "",
  );

  useEffect(() => { if (user) router.replace(next); }, [user, next, router]);

  const switchMode = (nextMode: Mode) => { setMode(nextMode); setError(null); setMessage(null); };

  const handleEmail = async (event: FormEvent) => {
    event.preventDefault(); setError(null); setMessage(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(t("login.invalidEmail"));
    if (!password) return setError(t("login.passwordRequired"));
    if (mode === "create" && password.length < 8) return setError(t("login.passwordRule"));
    if (mode === "create" && name.trim().length < 2) return setError(t("login.nameRule"));
    setBusy(true);
    try {
      if (mode === "create") await createAccount(name, email, password);
      else await signInWithEmail(email, password);
    } catch (authError) { setError(friendlyAuthError(authError, language)); setBusy(false); }
  };

  const handleGoogle = async () => {
    setBusy(true); setError(null); setMessage(null);
    try { await signIn(); } catch (authError) { setError(friendlyAuthError(authError, language)); setBusy(false); }
  };

  const handleReset = async () => {
    setError(null); setMessage(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(t("login.resetNeedsEmail"));
    setBusy(true);
    try { await resetPassword(email); setMessage(t("login.resetSent")); }
    catch (authError) { setError(friendlyAuthError(authError, language)); }
    finally { setBusy(false); }
  };

  return <>
    <SiteHeader />
    <main className="page auth-page">
      <section className="auth-shell">
        <aside className="auth-context">
          <p className="eyebrow"><ShieldCheck size={14} />{t("login.eyebrow")}</p>
          <h1>{t("login.contextTitle")}</h1>
          <p>{t("login.contextBody")}</p>
          <dl className="auth-promises">
            <div><dt>01</dt><dd>{t("login.promise1")}</dd></div>
            <div><dt>02</dt><dd>{t("login.promise2")}</dd></div>
            <div><dt>03</dt><dd>{t("login.promise3")}</dd></div>
          </dl>
          <Link className="text-link" href="/demo">{t("login.demo")} <ArrowRight size={15} /></Link>
        </aside>
        <div className="auth-form-panel">
          <div className="auth-tabs" role="tablist" aria-label={t("login.accountAccess")}>
            <button role="tab" aria-selected={mode === "signin"} onClick={() => switchMode("signin")}>{t("login.signInTab")}</button>
            <button role="tab" aria-selected={mode === "create"} onClick={() => switchMode("create")}>{t("login.createTab")}</button>
          </div>
          <div className="auth-form-heading"><LockKeyhole size={22} /><div><h2>{mode === "signin" ? t("login.title") : t("login.createTitle")}</h2><p>{mode === "signin" ? t("login.signInBody") : t("login.createBody")}</p></div></div>
          {configError && <div className="notice error" role="alert">{configError}</div>}
          {embeddedHost && <div className="notice auth-preview-notice"><strong>{t("login.previewTitle")}</strong><p>{t("login.previewBody")}</p><code>{embeddedHost}</code><button type="button" className="text-link" onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}>{t("login.openNewTab")} <ArrowRight size={14} /></button></div>}
          {error && <div className="notice error" role="alert">{error}</div>}
          {message && <div className="notice success" role="status">{message}</div>}
          <form className="auth-form" onSubmit={handleEmail} noValidate>
            {mode === "create" && <label>{t("login.name")}<input autoComplete="name" value={name} onChange={e => setName(e.target.value)} disabled={busy} /></label>}
            <label>{t("login.email")}<input type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></label>
            <div className="password-control"><label htmlFor="account-password">{t("login.password")}</label><span className="password-field"><input id="account-password" type={showPassword ? "text" : "password"} autoComplete={mode === "create" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}>{showPassword ? <EyeOff /> : <Eye />}</button></span></div>
            {mode === "create" && <p className="field-hint">{t("login.passwordRule")}</p>}
            {mode === "signin" && <button type="button" className="forgot-link" onClick={() => void handleReset()} disabled={busy}>{t("login.forgot")}</button>}
            <button className="button auth-submit" disabled={busy || !!configError}>{busy ? t("login.working") : mode === "signin" ? t("login.emailSignIn") : t("login.createAccount")}</button>
          </form>
          <div className="auth-divider"><span>{t("login.or")}</span></div>
          <button className="button google-button" disabled={busy || !!configError} onClick={() => void handleGoogle()}><span className="google-g">G</span>{t("login.google")}</button>
          <p className="auth-legal">{t("login.continueTerms")} <Link href="/privacy">{t("footer.privacy")}</Link> · <Link href="/terms">{t("footer.terms")}</Link></p>
        </div>
      </section>
    </main>
    <Footer />
  </>;
}
