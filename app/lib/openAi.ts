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
