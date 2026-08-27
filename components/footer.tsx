"use client";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
export function Footer() { const {t}=useLanguage(); return <footer className="footer no-print"><div><strong>Second Opinion AI</strong><span>{t("footer.note")}</span></div><nav><span>{t("footer.prototype")}</span><Link href="/privacy">{t("footer.privacy")}</Link><Link href="/terms">{t("footer.terms")}</Link></nav></footer>; }
