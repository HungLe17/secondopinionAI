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
    const trigger = triggerRef.current;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
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
    <button ref={triggerRef} className="ask-ai-launch no-print" title={t("ask.launch")} onClick={() => setOpen(true)}><MessageCircleQuestion /> <span><strong>{t("ask.launch")}</strong><small>{t("ask.launchHint")}</small></span></button>
    {open && <div className="ask-ai-backdrop no-print">
      <aside className="ask-ai-panel" role="dialog" aria-labelledby="ask-title">
        <header><div><span className="ask-ai-mark"><Bot /></span><div><h2 id="ask-title">{t("ask.title")}</h2><p>{t("ask.subtitle")}</p></div></div><button ref={closeRef} type="button" className="ask-ai-close" onClick={() => setOpen(false)} aria-label={t("ask.close")}><X /></button></header>
        {!caseId || !user ? <div className="ask-ai-empty"><MessageCircleQuestion /><h3>{t("ask.demoTitle")}</h3><p>{t("ask.demoBody")}</p><Link className="button" href="/login?next=/cases/new">{t("ask.createCase")}</Link></div> : <>
          <div className="ask-ai-privacy"><ShieldCheck />{t("ask.sessionOnly")}</div>
          <div className="ask-ai-thread" aria-live="polite">
            {messages.length === 0 && <div className="ask-ai-welcome"><span className="ask-ai-welcome-mark"><MessageCircleQuestion /></span><h3>{t("ask.welcome")}</h3><p>{t("ask.welcomeBody")}</p><div>{prompts.map(prompt => <button type="button" key={prompt} onClick={() => void submit(undefined, prompt)}>{prompt}</button>)}</div></div>}
            {messages.map((message, index) => <div className="ask-exchange" key={index}>
              <p className="user-question">{message.question}</p>
              <div className="ai-answer"><span className="ask-ai-mark"><Bot /></span><div><FormattedAnswer text={message.response.answer} />{message.response.safetyNote && <p className="answer-safety">{message.response.safetyNote}</p>}{message.response.sources.length > 0 && <div className="answer-sources"><strong><FileText />{t("ask.basedOn")}</strong>{message.response.sources.map((source, sourceIndex) => <button type="button" key={`${source.recordId}-${sourceIndex}`} onClick={() => { onSelectSource(source.recordId); setOpen(false); }}>{source.displayName}{source.page ? ` · ${t("report.page")} ${source.page}` : source.section ? ` · ${source.section}` : ""}</button>)}</div>}{message.response.followUpQuestions.length > 0 && <div className="follow-ups">{message.response.followUpQuestions.map(item => <button type="button" key={item} onClick={() => void submit(undefined, item)}>{item}</button>)}</div>}</div></div>
            </div>)}
            {busy && <div className="ask-thinking"><LoaderCircle />{t("ask.thinking")}</div>}
            {error && <div className="notice error" role="alert">{error}</div>}
          </div>
          <form className="ask-composer" onSubmit={event => void submit(event)}><div className="ask-composer-heading"><label htmlFor="ask-question">{t("ask.label")}</label><span aria-live="polite">{question.length}/1000</span></div><div className="ask-composer-control"><textarea id="ask-question" rows={2} value={question} onChange={event => setQuestion(event.target.value)} maxLength={1000} placeholder={t("ask.placeholder")} disabled={busy} /><button disabled={busy || question.trim().length < 3} aria-label={t("ask.send")} title={t("ask.send")}><ArrowUp /></button></div><p>{t("ask.disclaimer")}</p></form>
        </>}
      </aside>
    </div>}
  </>;
}

export function FormattedAnswer({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const content: React.ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    if (/^#{1,4}\s+/.test(line)) {
      content.push(<h4 key={`heading-${index}`}>{inlineAnswerText(line.replace(/^#{1,4}\s+/, ""))}</h4>);
      index += 1;
      continue;
    }
    if (/^[-•]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-•]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-•]\s+/, "")); index += 1;
      }
      content.push(<ul key={`bullets-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{inlineAnswerText(item)}</li>)}</ul>);
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+[.)]\s+/, "")); index += 1;
      }
      content.push(<ol key={`numbers-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{inlineAnswerText(item)}</li>)}</ol>);
      continue;
    }
    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^#{1,4}\s+|^[-•]\s+|^\d+[.)]\s+/.test(lines[index].trim())) {
      paragraph.push(lines[index].trim()); index += 1;
    }
    content.push(<p key={`paragraph-${index}`}>{inlineAnswerText(paragraph.join(" "))}</p>);
  }
  return <div className="formatted-answer">{content}</div>;
}

function inlineAnswerText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part);
}
