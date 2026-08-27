"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, Bot, FileText, LoaderCircle, MessageCircleQuestion, ShieldCheck, X } from "lucide-react";
import { useOptionalAuth } from "@/components/auth-provider";
import { useLanguage } from "@/components/language-provider";
import { authorizedFetch } from "@/lib/api-client";
import type { AskAnswer } from "@/lib/schemas";

type Message = { question: string; response: AskAnswer };

export function AskAI({ caseId, onSelectSource }: { caseId?: string; onSelectSource: (recordId: string) => void }) {
  const user = useOptionalAuth()?.user || null;
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prompts = [t("ask.prompt1"), t("ask.prompt2"), t("ask.prompt3")];

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [open]);

  const submit = async (event?: FormEvent, suggested?: string) => {
    event?.preventDefault();
    const value = (suggested || question).trim();
    if (!user || !caseId || value.length < 3 || busy) return;
    setBusy(true); setError(null); setQuestion("");
    try {
      const body = await authorizedFetch(user, `/api/cases/${caseId}/ask`, { method: "POST", body: JSON.stringify({ question: value, language }) }) as { answer?: AskAnswer };
      if (!body.answer) throw new Error(t("ask.error"));
      setMessages(current => [...current, { question: value, response: body.answer! }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("ask.error"));
      setQuestion(value);
    } finally { setBusy(false); }
  };

  return <>
    <button ref={triggerRef} className="ask-ai-launch no-print" onClick={() => setOpen(true)}><MessageCircleQuestion /> <span><strong>{t("ask.launch")}</strong><small>{t("ask.launchHint")}</small></span></button>
    {open && <div className="ask-ai-backdrop no-print" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <aside className="ask-ai-panel" role="dialog" aria-modal="true" aria-labelledby="ask-title">
        <header><div><span className="ask-ai-mark"><Bot /></span><div><h2 id="ask-title">{t("ask.title")}</h2><p>{t("ask.subtitle")}</p></div></div><button ref={closeRef} className="ask-ai-close" onClick={() => setOpen(false)} aria-label={t("ask.close")}><X /></button></header>
        {!caseId || !user ? <div className="ask-ai-empty"><MessageCircleQuestion /><h3>{t("ask.demoTitle")}</h3><p>{t("ask.demoBody")}</p><Link className="button" href="/login?next=/cases/new">{t("ask.createCase")}</Link></div> : <>
          <div className="ask-ai-privacy"><ShieldCheck />{t("ask.sessionOnly")}</div>
          <div className="ask-ai-thread" aria-live="polite">
            {messages.length === 0 && <div className="ask-ai-welcome"><h3>{t("ask.welcome")}</h3><p>{t("ask.welcomeBody")}</p><div>{prompts.map(prompt => <button key={prompt} onClick={() => void submit(undefined, prompt)}>{prompt}</button>)}</div></div>}
            {messages.map((message, index) => <div className="ask-exchange" key={index}>
              <p className="user-question">{message.question}</p>
              <div className="ai-answer"><span className="ask-ai-mark"><Bot /></span><div><p>{message.response.answer}</p>{message.response.safetyNote && <p className="answer-safety">{message.response.safetyNote}</p>}{message.response.sources.length > 0 && <div className="answer-sources"><strong><FileText />{t("ask.basedOn")}</strong>{message.response.sources.map((source, sourceIndex) => <button key={`${source.recordId}-${sourceIndex}`} onClick={() => { onSelectSource(source.recordId); setOpen(false); }}>{source.displayName}{source.page ? ` · ${t("report.page")} ${source.page}` : source.section ? ` · ${source.section}` : ""}</button>)}</div>}{message.response.followUpQuestions.length > 0 && <div className="follow-ups">{message.response.followUpQuestions.map(item => <button key={item} onClick={() => void submit(undefined, item)}>{item}</button>)}</div>}</div></div>
            </div>)}
            {busy && <div className="ask-thinking"><LoaderCircle />{t("ask.thinking")}</div>}
            {error && <div className="notice error" role="alert">{error}</div>}
          </div>
          <form className="ask-composer" onSubmit={event => void submit(event)}><label htmlFor="ask-question">{t("ask.label")}</label><div><textarea id="ask-question" value={question} onChange={event => setQuestion(event.target.value)} maxLength={1000} placeholder={t("ask.placeholder")} disabled={busy} /><button disabled={busy || question.trim().length < 3} aria-label={t("ask.send")}><ArrowUp /></button></div><p>{t("ask.disclaimer")}</p></form>
        </>}
      </aside>
    </div>}
  </>;
}
