import type { WrappedStoredStats } from "./wrapped";
import type { CoachWrappedResult } from "./coachAi";

export type ShareableWrappedCard = "pb" | "closing";

type ShareableCardData = {
  monthLabel: string;
  stats: WrappedStoredStats;
  captions: CoachWrappedResult;
};

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;
const NAVY_TOP = "#0b1420";
const NAVY_BOTTOM = "#050810";
const GOLD = "#fcd34d"; // amber-300, samma familj som PB-badgens amber-ton
const GOLD_SOFT = "rgba(252,211,77,0.75)";

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function drawCenteredLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number
) {
  const lines = wrapLines(ctx, text, maxWidth);
  lines.forEach((line, index) => {
    ctx.fillText(line, centerX, startY + index * lineHeight);
  });
  return startY + lines.length * lineHeight;
}

function formatRecordValue(pb: NonNullable<WrappedStoredStats["biggestPb"]>) {
  if (pb.metricType === "time") {
    const seconds = pb.durationSeconds ?? 0;
    return `${seconds}s`;
  }
  return `${pb.weight.toLocaleString("sv-SE")} kg × ${pb.reps}`;
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, NAVY_TOP);
  gradient.addColorStop(1, NAVY_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawWatermark(ctx: CanvasRenderingContext2D) {
  ctx.textAlign = "center";
  ctx.font = "600 30px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("MinCoach", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 90);
}

function drawPbCard(ctx: CanvasRenderingContext2D, data: ShareableCardData) {
  const centerX = CANVAS_WIDTH / 2;

  ctx.textAlign = "center";
  ctx.fillStyle = GOLD_SOFT;
  ctx.font = "600 34px system-ui, -apple-system, sans-serif";
  ctx.fillText(`Störst PB i ${data.monthLabel}`, centerX, 620);

  if (data.stats.biggestPb) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 54px system-ui, -apple-system, sans-serif";
    drawCenteredLines(ctx, data.stats.biggestPb.exerciseName, centerX, 740, 860, 64);

    ctx.fillStyle = GOLD;
    ctx.font = "700 96px system-ui, -apple-system, sans-serif";
    ctx.fillText(formatRecordValue(data.stats.biggestPb), centerX, 920);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 48px system-ui, -apple-system, sans-serif";
    drawCenteredLines(ctx, "Konsekvens den här månaden", centerX, 820, 820, 60);
  }

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "400 36px system-ui, -apple-system, sans-serif";
  drawCenteredLines(ctx, data.captions.pbCaption, centerX, 1080, 780, 48);
}

function drawClosingCard(ctx: CanvasRenderingContext2D, data: ShareableCardData) {
  const centerX = CANVAS_WIDTH / 2;

  ctx.textAlign = "center";
  ctx.fillStyle = GOLD_SOFT;
  ctx.font = "600 34px system-ui, -apple-system, sans-serif";
  ctx.fillText(`Din ${data.monthLabel} är klar`, centerX, 640);

  ctx.fillStyle = GOLD;
  ctx.font = "700 140px system-ui, -apple-system, sans-serif";
  ctx.fillText(`${data.stats.passCount}`, centerX, 840);

  ctx.fillStyle = "#ffffff";
  ctx.font = "500 40px system-ui, -apple-system, sans-serif";
  ctx.fillText("pass loggade", centerX, 900);

  ctx.fillStyle = GOLD;
  ctx.font = "700 72px system-ui, -apple-system, sans-serif";
  ctx.fillText(`${Math.round(data.stats.totalVolumeKg).toLocaleString("sv-SE")} kg`, centerX, 1020);

  ctx.fillStyle = "#ffffff";
  ctx.font = "500 34px system-ui, -apple-system, sans-serif";
  ctx.fillText("totalt lyft", centerX, 1064);

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "400 36px system-ui, -apple-system, sans-serif";
  drawCenteredLines(ctx, data.captions.reflectionCaption, centerX, 1200, 780, 48);
}

export async function renderShareableWrappedCard(
  cardType: ShareableWrappedCard,
  data: ShareableCardData
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D stöds inte i den här webbläsaren.");

  drawBackground(ctx);

  if (cardType === "pb") {
    drawPbCard(ctx, data);
  } else {
    drawClosingCard(ctx, data);
  }

  drawWatermark(ctx);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Kunde inte skapa bild."));
    }, "image/png");
  });
}

export async function shareWrappedCard(
  cardType: ShareableWrappedCard,
  data: ShareableCardData
): Promise<{ method: "share" | "download" }> {
  const blob = await renderShareableWrappedCard(cardType, data);
  const fileName = `mincoach-wrapped-${cardType}.png`;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    const file = new File([blob], fileName, { type: "image/png" });
    const shareData = { files: [file], title: "MinCoach Höjdpunkter", text: data.monthLabel };

    if (!navigator.canShare || navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return { method: "share" };
      } catch {
        // Användaren avbröt delningen eller webbläsaren stödde det ändå
        // inte — faller igenom till nedladdning nedan.
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { method: "download" };
}
