"use client";
import React, { useEffect, useRef } from "react";

type DayForm = "trött" | "normal" | "stark" | null;

type ChatMessage = {
  role: "you" | "coach";
  text: string;
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
};

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

export default function CoachPanel({
  coachData,
  chatLog,
  chatInput,
  setChatInput,
  sendChat,
}: Props) {
    const lastCoachMessage =
    [...chatLog].reverse().find((m) => m.role === "coach")?.text || "";

  const { displayed: typedLastCoachMessage, isThinking: isThinkingLastCoach } =
    useTypewriter(lastCoachMessage, 20, 400);
  
    const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, coachData]);
  return (
    <div className="space-y-4">
    

      <div className="rounded-2xl border border-blue-400/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.15),rgba(24,24,27,0.9)_50%,rgba(10,10,15,0.95)_100%)] p-3 shadow-[0_0_60px_rgba(59,130,246,0.15)] space-y-4">
        <div className="max-h-[420px] overflow-auto space-y-2">
          {coachData && (
  <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-4 text-white">
              <p className="mb-1 text-xs uppercase tracking-[0.12em] text-white/40">
                Coach
              </p>
             <p className="whitespace-pre-line text-[1.25rem] leading-snug font-semibold tracking-[-0.01em]">
  {coachData?.intro}
</p>
            </div>
          )}

          {chatLog.length === 0 ? (
            <p className="text-sm text-gray-300">
              Skriv t.ex. &quot;kändes tungt&quot; eller &quot;kändes lätt&quot;.
            </p>
          ) : (
            chatLog.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "coach"
                    ? "rounded-2xl border border-blue-400/15 bg-blue-500/10 px-3 py-2 text-white/90"
                    : "rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                }
              >
                <p className="mb-1 text-xs uppercase tracking-[0.12em] text-white/40">
                  {m.role === "coach" ? "Coach" : "Du"}
                </p>
<p className="whitespace-pre-line text-sm leading-relaxed">
  {m.role === "coach" && m.text === lastCoachMessage
    ? isThinkingLastCoach
      ? "..."
      : typedLastCoachMessage
    : m.text}
</p>
              </div>
            ))
          )}
          
          <div ref={chatEndRef} />
        </div>

        <div className="flex gap-2 pt-2">
          <input
            className="flex-1 rounded-xl bg-black border border-zinc-700 p-3"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Skriv till coachen..."
            onKeyDown={(e) => {
              if (e.key === "Enter") sendChat();
            }}
          />
          <button
            className="rounded-2xl border border-blue-400/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),rgba(37,99,235,0.88))] px-5 font-semibold text-white shadow-[0_0_22px_rgba(59,130,246,0.28)] transition hover:brightness-110 hover:shadow-[0_0_28px_rgba(59,130,246,0.38)]"
            onClick={sendChat}
          >
            Skicka
          </button>
        </div>
      </div>

      
    </div>
  );
}