"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Languages, Stethoscope } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useLanguage } from "@/components/language-provider";

export function SiteHeader() {
  const { user, loading, logOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const accountName = user?.displayName?.trim() || user?.email?.split("@")[0] || "";

  return <header className="site-header no-print">
    <Link href="/" className="brand">
      <span className="brand-mark"><Stethoscope size={20} /></span>
      <span className="brand-name">Second Opinion <em>AI</em></span>
    </Link>
    <nav aria-label={t("nav.main")}>
      <Link href="/demo" aria-current={pathname === "/demo" ? "page" : undefined}>{t("nav.demo")}</Link>
      {!loading && user ? <>
        <Link href="/dashboard" aria-current={pathname.startsWith("/dashboard") || pathname.startsWith("/cases") ? "page" : undefined}>{t("nav.cases")}</Link>
        <span className="account-chip" title={user.email || accountName}>
          <span>{accountName.slice(0, 1).toLocaleUpperCase(language)}</span>
          <strong>{accountName}</strong>
        </span>
        <button className="link-button signout-link" onClick={() => void logOut()}>{t("nav.signOut")}</button>
      </> : <Link className="nav-signin" href="/login" aria-current={pathname === "/login" ? "page" : undefined}>{t("nav.signIn")}</Link>}
      <div className="language-switch" aria-label={t("nav.language")}>
        <Languages size={15} />
        <button aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
        <span>/</span>
        <button aria-pressed={language === "vi"} onClick={() => setLanguage("vi")}>VI</button>
      </div>
    </nav>
  </header>;
}
