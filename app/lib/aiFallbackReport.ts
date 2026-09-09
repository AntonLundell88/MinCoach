import { getOrCreateBetaDeviceId } from "./betaSync";

/**
 * Rapporterar att en AI-röst föll tillbaka, så att det syns för OSS och inte
 * bara för användaren som fick en tystare app.
 *
 * Bakgrunden: appen degraderar snyggt överallt — schemabygget har en
 * deterministisk reservplan, intron har en reservtext, chatten har en gul
 * prick. Det är rätt beteende. Men det gör felen osynliga, och med en enda
 * betatestare har det gått bra: han märker allt själv. Med femtio ser vi
 * ingenting alls. Vi skulle inte veta om en tredjedel av alla nya konton fick
 * reservschemat i stället för ett byggt.
 *
 * Skickas till beta_feedback via den befintliga, oinloggade /api/beta-feedback
 * — ingen ny tabell, ingen migrering. Att den inte kräver inloggning är själva
 * poängen: schemabygget händer innan användaren hunnit bli någon.
 *
 * Maskinraderna delar tabell med människors feedback. De är taggade
 * kind:"ai_fallback" så de går att filtrera bort, och blir det för brusigt är
 * en flytt trivial — raderna är redan märkta.
 *
 *   select metadata->>'route', metadata->>'reason', count(*)
 *   from beta_feedback
 *   where metadata->>'kind' = 'ai_fallback'
 *   group by 1, 2 order by 3 desc;
 *
 * Fire-and-forget, och sväljer sina egna fel. Telemetri får aldrig vara det
 * som gör appen långsammare eller trasigare än den var utan den.
 */
/**
 * Ett avbrutet anrop är inte ett misslyckande — användaren gick vidare, eller
 * så byggde vi om. Rapporterar vi det ändå mäter vi våra egna avbrytningar och
 * får en siffra som säger att appen är trasigare än den är. Bor här för att
 * det är enda skälet den finns.
 */
export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function reportAiFallback(
  route: string,
  reason: string | undefined,
  detail?: Record<string, unknown>
) {
  if (!reason) return;
  if (typeof window === "undefined") return;

  try {
    const deviceId = getOrCreateBetaDeviceId();

    void fetch("/api/beta-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Rutten kräver en icke-tom message, och den är det enda som syns utan
      // att man öppnar metadata — så den får bära hela fyndet i klartext.
      body: JSON.stringify({
        deviceId,
        message: `${route}: ${reason}`,
        metadata: { kind: "ai_fallback", route, reason, ...detail },
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Ingen localStorage, ingen fetch, blockerad av användaren — spelar ingen
    // roll. Det här får inte vara skillnaden mellan att appen fungerar och inte.
  }
}
