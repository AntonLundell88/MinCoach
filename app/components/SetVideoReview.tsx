"use client";
import { useEffect, useRef, useState } from "react";
import { requestAiCoachSetVideoReply, type CoachSetVideoContext } from "../lib/coachAi";

type Stage = "intro" | "record" | "review" | "sending" | "result" | "error";

const MAX_RECORD_SECONDS = 8;
const FRAME_COUNT = 5;
const FRAME_MAX_DIMENSION = 512;
const FRAME_QUALITY = 0.6;
const INTRO_SEEN_KEY = "mincoach_video_intro_seen";

function hasSeenIntro() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(INTRO_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

function markIntroSeen() {
  try {
    window.localStorage.setItem(INTRO_SEEN_KEY, "true");
  } catch {
    // ignore storage errors (private browsing etc.)
  }
}

type Props = {
  exerciseName: string;
  weight?: number;
  reps?: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  rir?: number;
  onClose: () => void;
  onFeedbackReceived: (text: string) => void;
};

function extractFrames(blob: Blob): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(blob);
    video.src = url;

    const frames: string[] = [];
    let timestamps: number[] = [];
    let index = 0;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.src = "";
    };

    const captureNext = () => {
      if (index >= timestamps.length) {
        cleanup();
        resolve(frames);
        return;
      }
      video.currentTime = timestamps[index];
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : MAX_RECORD_SECONDS;
      timestamps = [0.1, 0.3, 0.5, 0.7, 0.9].slice(0, FRAME_COUNT).map((f) => f * duration);
      captureNext();
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, FRAME_MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", FRAME_QUALITY));
      }
      index += 1;
      captureNext();
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("video_load_failed"));
    };
  });
}

export default function SetVideoReview({
  exerciseName,
  weight,
  reps,
  durationSeconds,
  metricType,
  rir,
  onClose,
  onFeedbackReceived,
}: Props) {
  const [stage, setStage] = useState<Stage>(() => (hasSeenIntro() ? "record" : "intro"));
  const [isRecording, setIsRecording] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(MAX_RECORD_SECONDS);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [resultText, setResultText] = useState("");
  const [errorText, setErrorText] = useState("");

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const clipBlobRef = useRef<Blob | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (stage !== "record") return;

    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      } catch {
        if (!cancelled) {
          setErrorText("Kom inte åt kameran. Kolla att appen har tillåtelse att använda den.");
          setStage("error");
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [stage]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (clipUrl) URL.revokeObjectURL(clipUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function continueFromIntro() {
    markIntroSeen();
    setStage("record");
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      clipBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setClipUrl(url);
      setStage("review");
      stopStream();
    };
    recorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
    setSecondsLeft(MAX_RECORD_SECONDS);

    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          recorderRef.current?.stop();
          setIsRecording(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setIsRecording(false);
    recorderRef.current?.stop();
  }

  function retake() {
    if (clipUrl) URL.revokeObjectURL(clipUrl);
    setClipUrl(null);
    clipBlobRef.current = null;
    setStage("record");
  }

  async function sendForAnalysis() {
    const blob = clipBlobRef.current;
    if (!blob) return;

    setStage("sending");

    try {
      const frames = await extractFrames(blob);

      if (clipUrl) URL.revokeObjectURL(clipUrl);
      setClipUrl(null);
      clipBlobRef.current = null;

      const context: CoachSetVideoContext = {
        kind: "set_video_feedback",
        exerciseName,
        weight,
        reps,
        durationSeconds,
        metricType,
        rir,
      };

      const fallbackReply = "Jag hann inte titta ordentligt på klippet just nu. Testa igen om en liten stund.";
      const response = await requestAiCoachSetVideoReply({
        context,
        frames,
        fallbackReply,
      });

      setResultText(response.text);
      setStage("result");
    } catch {
      setErrorText("Något gick fel när klippet skulle analyseras. Filmen är inte sparad — testa gärna igen.");
      setStage("error");
    }
  }

  function handleDone() {
    onFeedbackReceived(resultText);
    onClose();
  }

  function handleClose() {
    if (stage === "result") {
      handleDone();
      return;
    }
    if (isRecording) recorderRef.current?.stop();
    stopStream();
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (clipUrl) URL.revokeObjectURL(clipUrl);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6">
      <div className="relative flex max-h-[calc(100svh-2rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.09] bg-[#131c27] shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <p className="text-sm font-semibold text-white/85">Filma setet — {exerciseName}</p>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.05] text-white/60 transition hover:bg-white/[0.09] hover:text-white"
            aria-label="Stäng"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {stage === "intro" && (
            <div className="space-y-4">
              <p className="text-[15px] font-semibold text-white/90">Innan du filmar första gången</p>
              <div className="space-y-2.5 text-sm leading-6 text-white/72">
                <p>Jag ser klippet en gång för att titta på setet, sedan raderas det direkt — varken på din enhet, i appen eller hos oss. Ingen kan se det igen, inte ens jag.</p>
                <p>Det jag sparar är bara mina skriftliga anteckningar om setet, så jag kan komma ihåg och referera till dem senare — precis som med resten av din träning.</p>
              </div>
              <button
                type="button"
                onClick={continueFromIntro}
                className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white transition hover:bg-blue-500 active:scale-[0.98]"
              >
                Jag förstår, fortsätt
              </button>
            </div>
          )}

          {stage === "record" && (
            <div className="space-y-3">
              <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="text-xs leading-5 text-white/50">
                Filma sidled, hela kroppen i bild. Max {MAX_RECORD_SECONDS} sekunder — räcker till 2-4 reps.
              </p>
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-full rounded-2xl px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.98] ${
                  isRecording ? "bg-red-600/80 hover:bg-red-500/80" : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                {isRecording ? `Stoppa (${secondsLeft}s)` : "Spela in"}
              </button>
            </div>
          )}

          {stage === "review" && clipUrl && (
            <div className="space-y-3">
              <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black">
                <video src={clipUrl} controls playsInline className="h-full w-full object-contain" />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={retake}
                  className="flex-1 rounded-2xl border border-white/[0.1] bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white/72 transition hover:bg-white/[0.09]"
                >
                  Filma om
                </button>
                <button
                  type="button"
                  onClick={sendForAnalysis}
                  className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  Skicka till coachen
                </button>
              </div>
            </div>
          )}

          {stage === "sending" && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-blue-400" />
              <p className="text-sm text-white/70">Coachen tittar på klippet…</p>
              <p className="text-xs text-white/40">Det här tar lite längre än ett vanligt svar.</p>
            </div>
          )}

          {stage === "result" && (
            <div className="space-y-4">
              <p className="text-[15px] leading-6 text-white/90">{resultText}</p>
              <button
                type="button"
                onClick={handleDone}
                className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white transition hover:bg-blue-500 active:scale-[0.98]"
              >
                Klart
              </button>
            </div>
          )}

          {stage === "error" && (
            <div className="space-y-4 py-6 text-center">
              <p className="text-sm text-white/75">{errorText}</p>
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-5 py-3.5 text-base font-semibold text-white/75 transition hover:bg-white/[0.09]"
              >
                Stäng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
