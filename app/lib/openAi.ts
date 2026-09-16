/**
 * Texten ur ett svar från OpenAI:s Responses API. Låg förut som en egen kopia
 * i varje rutt, åtta stycken. Det här är den mest kompletta av dem
 * (schemabyggets): den läser också output_text som lista och parsed-delar
 * från strukturerade svar.
 */
export function extractOutputText(data: unknown) {
  if (!data || typeof data !== "object") return "";

  const response = data as {
    output_text?: unknown;
    output?: unknown;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  if (Array.isArray(response.output_text)) {
    return response.output_text
      .map((item) => (typeof item === "string" ? item : ""))
      .filter(Boolean)
      .join("\n");
  }

  if (!Array.isArray(response.output)) return "";

  return response.output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const maybeText = part as {
        text?: unknown;
        content?: unknown;
        parsed?: unknown;
      };
      if (typeof maybeText.text === "string") return maybeText.text;
      if (typeof maybeText.content === "string") return maybeText.content;
      if (maybeText.parsed && typeof maybeText.parsed === "object") {
        return JSON.stringify(maybeText.parsed);
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * Prompten till en coachröst: den oföränderliga delen (instruktion och
 * maxCharacters) först och kontexten sist, som två delar i samma meddelande.
 *
 * GPT-5.6 och senare cachar bara vid en gräns. Utan en markerad gräns satte
 * OpenAI den i slutet av meddelandet, efter kontexten, så varje anrop skrev
 * sin egen unika prompt till cachen och läste aldrig något: cacheWriteTokens
 * ungefär lika med inputTokens och cachedTokens 0, i varje anrop. Skrivning
 * kostar 1,25 × inputpriset och läsning 0,1 ×, så det var ett påslag utan
 * besparing. Nu sitter gränsen efter den oföränderliga delen.
 *
 * Äldre modeller (gpt-5.5) har inte parametrarna. Där skickas bara de två
 * delarna.
 */
export function coachPromptInput(args: {
  model: string;
  instruction: string;
  maxCharacters: number;
  context: unknown;
  /** Sådant som är nytt i varje anrop och ska ligga efter kontexten, t.ex. bilder. */
  extraContent?: Array<Record<string, unknown>>;
}) {
  const explicitCache = supportsExplicitPromptCache(args.model);
  const stableText = JSON.stringify({
    instruction: args.instruction,
    maxCharacters: args.maxCharacters,
  });
  const contextText = JSON.stringify({ context: args.context });

  return {
    size: stableText.length + contextText.length,
    body: {
      ...(explicitCache ? { prompt_cache_options: { mode: "explicit" } } : {}),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: stableText,
              ...(explicitCache ? { prompt_cache_breakpoint: { mode: "explicit" } } : {}),
            },
            { type: "input_text", text: contextText },
            ...(args.extraContent ?? []),
          ],
        },
      ],
    },
  };
}

// "gpt-5.6-terra" och senare modeller.
export function supportsExplicitPromptCache(model: string) {
  const match = model.match(/^gpt-(\d+)(?:\.(\d+))?/);
  if (!match) return false;

  const major = Number(match[1]);
  const minor = Number(match[2] ?? 0);
  return major > 5 || (major === 5 && minor >= 6);
}

/**
 * Orsaken när anropet till OpenAI kastar i stället för att svara. De flesta
 * rutter kallade det "api_error", samma som när OpenAI svarade med fel, så
 * reservintrona i betatestet 2026-09-16 gick inte att förklara: slog de i
 * tidsgränsen, eller svarade OpenAI fel? Ett avbrutet anrop räknas som
 * timeout. Klienten avbryter också anrop själv, men rapporterar aldrig dem.
 */
export function requestErrorReason(error: unknown) {
  return error instanceof Error && error.name === "AbortError" ? "timeout" : "network_error";
}
