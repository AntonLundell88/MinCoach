/**
 * Loggar vad ett AI-anrop faktiskt kostade. Utan det här är varje uttalande om
 * kostnad per pass en gissning — OpenAI skickar redan tillbaka usage på varje
 * svar, vi kastade bara bort det.
 *
 * En rad per anrop, alltid med prefixet [ai_usage] så den går att greppa fram
 * ur Netlifys funktionsloggar. Ingen tabell, ingen migrering: vi vill veta vad
 * ett pass kostar, inte bygga ett analysverktyg. Visar mätningen att vi behöver
 * följa det över tid är det då vi lägger till lagring.
 *
 * cachedTokens är den viktiga siffran. Träffar prompt-cachen kostar den delen
 * av inputen en bråkdel — slår den aldrig till är det prefixordningen i
 * rutternas payload som är fel, inte modellen som är dyr.
 */

type OpenAiUsage = {
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: { cached_tokens?: number };
  output_tokens_details?: { reasoning_tokens?: number };
};

function readUsage(data: unknown): OpenAiUsage | null {
  if (!data || typeof data !== "object") return null;
  const usage = (data as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") return null;
  return usage as OpenAiUsage;
}

export function logAiUsage(args: {
  /** Vilken coachröst: "set", "chat", "exercise_intro", "program_build"… */
  route: string;
  model: string;
  data: unknown;
  startedAt: number;
}) {
  const usage = readUsage(args.data);
  const inputTokens = usage?.input_tokens ?? 0;
  const cachedTokens = usage?.input_tokens_details?.cached_tokens ?? 0;

  console.log(
    "[ai_usage]",
    JSON.stringify({
      route: args.route,
      model: args.model,
      inputTokens,
      cachedTokens,
      cachedPercent:
        inputTokens > 0 ? Math.round((cachedTokens / inputTokens) * 100) : 0,
      reasoningTokens: usage?.output_tokens_details?.reasoning_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      ms: Date.now() - args.startedAt,
    })
  );
}
