import { createHash } from "crypto";

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
  input_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
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
      cacheWriteTokens: usage?.input_tokens_details?.cache_write_tokens ?? 0,
      cachedPercent:
        inputTokens > 0 ? Math.round((cachedTokens / inputTokens) * 100) : 0,
      reasoningTokens: usage?.output_tokens_details?.reasoning_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      ms: Date.now() - args.startedAt,
    })
  );

  // Tillfällig: hela usage-objektet råt, för att utesluta att cachen
  // rapporteras under ett annat fältnamn än cached_tokens.
  if (process.env.AI_USAGE_RAW === "1") {
    console.log("[ai_usage_raw]", JSON.stringify(readUsage(args.data)));
  }
}

/**
 * Diagnostik för prompt-cachen. Cache träffar bara på ett byte-identiskt
 * prefix — den här loggar en hash av det som SKA vara stabilt, så vi kan se
 * om nollan beror på oss eller på OpenAI.
 *
 * stableChars är antalet tecken före "context" i input-texten, alltså hur
 * långt det oföränderliga blocket faktiskt räcker. Är hasharna identiska
 * mellan två anrop men cachedTokens ändå 0, är prefixet inte vårt problem.
 *
 * Tillfällig. Ta bort när cache-frågan är avgjord.
 */
export function logPromptPrefix(args: {
  route: string;
  system: string;
  inputText: string;
}) {
  const short = (value: string) =>
    createHash("sha1").update(value).digest("hex").slice(0, 10);
  const contextAt = args.inputText.indexOf('"context"');

  console.log(
    "[ai_prefix]",
    JSON.stringify({
      route: args.route,
      systemHash: short(args.system),
      systemChars: args.system.length,
      stableChars: contextAt < 0 ? 0 : contextAt,
      stableHash: short(args.inputText.slice(0, Math.max(0, contextAt))),
      totalChars: args.inputText.length,
    })
  );
}
