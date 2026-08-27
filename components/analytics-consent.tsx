"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { enableConsentedAnalytics } from "@/lib/firebase-client";
import { useLanguage } from "@/components/language-provider";

const KEY = "second-opinion-anonymous-analytics";

export function AnalyticsConsent() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [choice, setChoice] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (pathname === "/demo") return;
    const saved = window.localStorage.getItem(KEY);
    // Local storage is an external browser system; synchronize it after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(saved);
    if (saved === "accepted") void enableConsentedAnalytics();
  }, [pathname]);
  if (pathname === "/demo" || choice === undefined || choice) return null;
  const decide = (accepted: boolean) => {
    const value = accepted ? "accepted" : "declined";
    window.localStorage.setItem(KEY, value);
    setChoice(value);
    if (accepted) void enableConsentedAnalytics();
  };
  return (
    <aside className="consent" aria-label={t("analytics.label")}>
      <span className="consent-icon" aria-hidden="true"><ShieldCheck /></span>
      <p><strong>{t("analytics.label")}</strong><span>{t("analytics.body")}</span></p>
      <div>
        <button className="button small" onClick={() => decide(true)}>
          {t("analytics.allow")}
        </button>
        <button className="button ghost small" onClick={() => decide(false)}>
          {t("analytics.decline")}
        </button>
      </div>
    </aside>
  );
}
