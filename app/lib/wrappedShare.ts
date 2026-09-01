import type { WrappedStoredStats } from "./wrapped";
import type { CoachWrappedResult } from "./coachAi";

// Ett delningsläge. Förut fanns "pb" och "closing" — två knappar som delade
// var sin slide. Nu en bild av hela månaden.
export type ShareableWrappedCard = "summary";

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

/**
 * Sammanfattningsbilden — hela månaden på ett kort.
 *
 * Delningen satt tidigare på två enskilda kort och renderade just det
 * kortet. Men man delar inte en slide, man delar sin månad. Anton fångade
 * det direkt: "ska man inte kunna dela hela? Bara en bild? Skumt."
 *
 * Tre-fyra siffror som betyder något, plus banan på det största rekordet —
 * den raden är det enda här som är en berättelse snarare än ett tillstånd.
 */
function drawSummaryCard(ctx: CanvasRenderingContext2D, data: ShareableCardData) {
  const centerX = CANVAS_WIDTH / 2;
  const { stats } = data;

  ctx.textAlign = "center";
  ctx.fillStyle = GOLD_SOFT;
  ctx.font = "600 40px system-ui, -apple-system, sans-serif";
  ctx.fillText(data.monthLabel.toUpperCase(), centerX, 620);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 96px system-ui, -apple-system, sans-serif";
  ctx.fillText(
    `${stats.passCount} pass · ${Math.round((stats.totalVolumeKg / 1000) * 10) / 10} ton`,
    centerX,
    780
  );

  if (stats.pbCount > 0) {
    ctx.fillStyle = GOLD;
    ctx.font = "700 64px system-ui, -apple-system, sans-serif";
    ctx.fillText(
      stats.pbCount === 1 ? "1 nytt rekord" : `${stats.pbCount} nya rekord`,
      centerX,
      900
    );
  }

  if (stats.biggestPb) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 52px system-ui, -apple-system, sans-serif";
    ctx.fillText(stats.biggestPb.exerciseName, centerX, 1080);

    ctx.fillStyle = GOLD;
    ctx.font = "700 88px system-ui, -apple-system, sans-serif";
    const trajectory = stats.biggestPb.previous
      ? `${stats.biggestPb.previous.weight} → ${stats.biggestPb.weight} kg`
      : `${stats.biggestPb.weight} kg × ${stats.biggestPb.reps}`;
    ctx.fillText(trajectory, centerX, 1180);
  }
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

  drawSummaryCard(ctx, data);

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
