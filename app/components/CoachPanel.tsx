"use client";
import React, { useEffect, useRef } from "react";
import { SendGlyph } from "./IconGlyphs";

type DayForm = "trött" | "normal" | "stark" | null;

type ChatMessage = {
  role: "you" | "coach";
  text: string;
  setNumber?: number;
  aiStatus?: "fallback";
};

type CoachData = {
  intro: string;
  pass: string;
  gym: string;
  exercise: string;
  lastText: string;
  plan: string;
  target: string;
  insight: string;
} | null;

type Props = {
  coachData: CoachData;
  dayForm: DayForm;
  setDayForm: (v: "trött" | "normal" | "stark") => void;
  chatLog: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  sendChat: () => void;
  isCoachThinking?: boolean;
  isExpanded?: boolean;
};

const coachInputPlaceholders = [
  "Skriv till coachen...",
  't.ex. "det kändes lätt"',
  't.ex. "jag är helt slut"',
  't.ex. "kan jag höja sen?"',
  't.ex. "det där satt fint"',
  't.ex. "jag känner av axeln"',
  't.ex. "maskinen är upptagen"',
  't.ex. "varför sänker vi?"',
  't.ex. "jag har mer att ge"',
  't.ex. "det blev tungt direkt"',
  't.ex. "kan vi byta övning?"',
  't.ex. "jag fick ont i knät"',
  't.ex. "ska jag vila längre?"',
  't.ex. "den här känns fel"',
  't.ex. "jag vill testa tyngre"',
  't.ex. "jag tappade tekniken"',
  't.ex. "finns det ett alternativ?"',
  't.ex. "det känns för lätt"',
  't.ex. "jag orkar nog ett set till"',
];

function getRandomCoachPlaceholder(current?: string) {
  const options = coachInputPlaceholders.filter((item) => item !== current);
  return options[Math.floor(Math.random() * options.length)] ?? coachInputPlaceholders[0];
}

function useTypewriter(text: string, speed = 20, delay = 500) {
  const [displayed, setDisplayed] = React.useState("");
  const [isThinking, setIsThinking] = React.useState(true);

  React.useEffect(() => {
    let i = 0;
    let interval: ReturnType<typeof setInterval> | null = null;

    setDisplayed("");
    setIsThinking(true);

    const timeout = setTimeout(() => {
      setIsThinking(false);

      interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));

        if (i >= text.length && interval) {
          clearInterval(interval);
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, delay]);

  return { displayed, isThinking };
}

function normalizeCoachDisplayText(text: string) {
  return [
    ["Ã¥", "å"],
    ["Ã¤", "ä"],
    ["Ã¶", "ö"],
    ["Ã…", "Å"],
    ["Ã„", "Ä"],
    ["Ã–", "Ö"],
    ["â€“", "-"],
    ["â€”", "-"],
    ["Â·", "-"],
    ["Ã—", "x"],
    ["âœ…", "✅"],
    ["âœ”ï¸", "✔️"],
    ["ðŸ‘Š", "👊"],
    ["ðŸ”¥", "🔥"],
    ["ðŸ’ª", "💪"],
    ["ðŸ’¡", "💡"],
    ["ðŸš€", "🚀"],
    ["âž¡ï¸", "➡️"],
    ["ðŸ“ˆ", "📈"],
    ["ðŸŽ¯", "🎯"],
    ["ðŸ‘€", "👀"],
  ].reduce((current, [broken, fixed]) => current.replaceAll(broken, fixed), text);
}

function CoachText({ text, isPrimary = false }: { text: string; isPrimary?: boolean }) {
  const lines = normalizeCoachDisplayText(text).split("\n");
  const nonEmptyLineIndexes = lines.map((line, index) =>
    line.trim()
      ? lines.slice(0, index).filter((previousLine) => previousLine.trim()).length
      : -1
  );

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={index} className="h-1" />;
        }

        const currentLineIndex = nonEmptyLineIndexes[index];

        const isLabel = trimmed.endsWith(":");
        const isSetLine =
          /^\d+([,.]\d+)?\s*(x|×)\s*\d+(\s*[·•]\s*RIR\s*\d\+?)?\.?$/i.test(trimmed);
        const isWeightLine = /^\d+([,.]\d+)?\s*kg\.?$/i.test(trimmed);
        const isRepTargetLine =
          /^sikta på\s*\d+([,.]\d+)?(\s*[–-]\s*\d+([,.]\d+)?)?\s*reps\.?$/i.test(trimmed);
        const isRirLine = /^RIR\s*\d\+?(\s*[–-]\s*\d\+?)?\.?$/i.test(trimmed);
        const isRestLine =
          /^Vila\s*\d+(\s*[–-]\s*\d+)?\s*(min|minuter|sek|sekunder)\.?$/i.test(trimmed);
        const isTargetNumber =
          isSetLine || isWeightLine || isRepTargetLine || isRirLine || isRestLine;

        return (
          <p
            key={index}
            className={
              isLabel
                ? `${currentLineIndex > 0 ? "pt-2" : "pt-0"} text-[9px] font-semibold uppercase tracking-[0.13em] text-blue-100/45`
                : isTargetNumber
                ? isPrimary
                  ? "text-[14px] font-semibold leading-[1.32] tracking-normal text-white"
                  : "text-[14px] font-semibold leading-[1.32] tracking-normal text-white"
                : isPrimary
                ? "text-[13.5px] leading-[1.62] tracking-normal text-white/86"
                : "text-[13.5px] leading-[1.62] tracking-normal text-white/86"
            }
          >
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default function CoachPanel({
  coachData,
  chatLog,
  chatInput,
  setChatInput,
  sendChat,
  isCoachThinking = false,
  isExpanded = false,
}: Props) {
    const [coachInputPlaceholder, setCoachInputPlaceholder] = React.useState(
      () => getRandomCoachPlaceholder()
    );
    const lastCoachIndex = chatLog.reduce(
      (latest, message, index) => (message.role === "coach" ? index : latest),
      -1
    );
    const lastCoachMessage =
    lastCoachIndex >= 0
      ? normalizeCoachDisplayText(chatLog[lastCoachIndex]?.text ?? "")
      : "";

  const { displayed: typedLastCoachMessage, isThinking: isThinkingLastCoach } =
    useTypewriter(lastCoachMessage, 18, 300);
  
    const chatScrollRef = useRef<HTMLDivElement | null>(null);
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const shouldStickToBottomRef = useRef(true);
    const lastChatLengthRef = useRef(chatLog.length);

  function updateStickToBottom() {
    const el = chatScrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 96;
  }

  useEffect(() => {
    const lastMessage = chatLog[chatLog.length - 1];
    const chatLengthChanged = lastChatLengthRef.current !== chatLog.length;
    const forceScrollForUserMessage =
      chatLengthChanged && lastMessage?.role === "you";

    lastChatLengthRef.current = chatLog.length;

    if (forceScrollForUserMessage) {
      shouldStickToBottomRef.current = true;
    }

    if (!shouldStickToBottomRef.current) return;

    const scrollFrame = window.requestAnimationFrame(() => {
      chatScrollRef.current?.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "auto",
      });
    });

    return () => window.cancelAnimationFrame(scrollFrame);
  }, [chatLog, coachData, typedLastCoachMessage, isThinkingLastCoach, isCoachThinking]);

  useEffect(() => {
    if (chatInput.trim()) return;

    const placeholderFrame = window.setTimeout(() => {
      setCoachInputPlaceholder((current) => getRandomCoachPlaceholder(current));
    }, 0);

    return () => window.clearTimeout(placeholderFrame);
  }, [chatLog.length, chatInput]);

  useEffect(() => {
    if (chatInput.trim()) return;

    const interval = window.setInterval(() => {
      setCoachInputPlaceholder((current) => getRandomCoachPlaceholder(current));
    }, 6500);

    return () => window.clearInterval(interval);
  }, [chatInput]);

  return (
    <div className="space-y-4">
    

      <div className="coach-panel-shell space-y-2.5 rounded-[1.35rem] border border-white/[0.09] bg-white/[0.05] p-2.5 shadow-[0_16px_44px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl sm:p-3">
        <div
          ref={chatScrollRef}
          onScroll={updateStickToBottom}
          className={`overflow-auto space-y-2 pr-1 transition-[max-height,min-height] duration-200 ease-out ${
            isExpanded
              ? "max-h-[62vh] min-h-[52vh]"
              : "max-h-[42vh] min-h-[210px] sm:min-h-[260px]"
          }`}
        >
          {chatLog.length === 0 ? (
            <p className="coach-empty-message rounded-2xl border border-white/[0.09] bg-white/[0.042] px-3 py-2 text-sm leading-5 text-white/62">
              Skriv till coachen när något känns tungt, lätt eller annorlunda.
            </p>
          ) : (
            chatLog.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "coach"
                    ? `coach-message animate-message-in relative rounded-[1.15rem] border border-white/[0.09] bg-slate-900/50 px-3 py-2 text-white/90 shadow-[0_10px_26px_rgba(0,0,0,0.14)] sm:px-3.5 ${
                        m.setNumber ? "pr-14" : ""
                      }`
                    : "user-message animate-message-in ml-8 rounded-[1.2rem] border border-white/[0.09] bg-white/5 px-3.5 py-2.5 text-white"
                }
              >
                {m.role === "coach" && m.setNumber ? (
                  <div
                    className="coach-set-marker absolute right-3 top-2 flex h-9 w-9 items-center justify-center rounded-full border border-blue-300/28 bg-blue-500/14 text-[15px] font-semibold text-blue-100 shadow-[0_8px_22px_rgba(37,99,235,0.18)]"
                    aria-label={`Set ${m.setNumber}`}
                  >
                    {m.setNumber}
                  </div>
                ) : null}
                <p className="coach-message-label mb-1 text-[9px] uppercase tracking-[0.12em] text-white/36">
                  {m.role === "coach" ? "Coach" : "Du"}
                </p>
                {m.role === "coach" ? (
                  <CoachText
                    text={
                      i === lastCoachIndex
                        ? isThinkingLastCoach
                          ? "..."
                          : typedLastCoachMessage
                        : m.text
                    }
                  />
                ) : (
                  <p className="user-message-text text-sm leading-5 text-white/86">{m.text}</p>
                )}
              </div>
            ))
          )}
          {isCoachThinking ? (
            <div className="coach-message animate-message-in relative rounded-[1.15rem] border border-white/[0.09] bg-slate-900/50 px-3 py-2 text-white/90 shadow-[0_10px_26px_rgba(0,0,0,0.14)] sm:px-3.5">
              <p className="coach-message-label mb-1 text-[9px] uppercase tracking-[0.12em] text-white/36">
                Coach
              </p>
              <div className="flex items-center gap-2 text-sm text-white/68">
                <span>Coachen skriver</span>
                <span className="flex gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-300/70" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-300/70 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-300/70 [animation-delay:240ms]" />
                </span>
              </div>
            </div>
          ) : null}
          
          <div ref={chatEndRef} />
        </div>

        <div className="flex gap-2">
          <input
            className="coach-input min-w-0 flex-1 rounded-xl border border-white/[0.09] bg-slate-950/52 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-blue-300/35 focus:bg-slate-950/65"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={coachInputPlaceholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendChat();
            }}
          />
          <button
            className="workout-ai-action flex h-10 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-600 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={sendChat}
            disabled={isCoachThinking || !chatInput.trim()}
            aria-label="Skicka"
          >
            <SendGlyph className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      
    </div>
  );
}
