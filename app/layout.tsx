import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth-provider";
import { AnalyticsConsent } from "@/components/analytics-consent";
import { LanguageProvider } from "@/components/language-provider";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Second Opinion AI", template: "%s · Second Opinion AI" }, description: "A clear, source-linked medical record review that helps you prepare better questions for your clinician." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><LanguageProvider><AuthProvider>{children}<AnalyticsConsent/><Toaster richColors position="top-right"/></AuthProvider></LanguageProvider></body></html>; }
