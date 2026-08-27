"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useLanguage } from "@/components/language-provider";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, configError } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!loading && !user && !configError) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, configError, pathname, router]);
  if (loading) return <RouteState icon={<LoaderCircle className="is-spinning" />} label={t("guard.loading")} />;
  if (configError) return <RouteState icon={<AlertCircle />} label={t("guard.setup")} body={t("guard.config")} action={t("guard.demo")} />;
  if (!user) return <RouteState icon={<LoaderCircle className="is-spinning" />} label={t("guard.redirect")} />;
  return children;
}

function RouteState({ icon, label, body, action }: { icon: React.ReactNode; label: string; body?: string; action?: string }) {
  return <>
    <SiteHeader />
    <main className="page route-state-page">
      <section className="route-state-card" role="status">
        <span>{icon}</span>
        <div><h1>{label}</h1>{body && <p>{body}</p>}{action && <a className="button" href="/demo">{action}</a>}</div>
      </section>
    </main>
    <Footer />
  </>;
}
