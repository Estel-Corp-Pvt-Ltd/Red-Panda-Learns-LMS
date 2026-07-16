// workers/src/lib/gemini.ts — thin Gemini REST client (no SDK, matches the
// project's "HTTP client only" pattern). Uses generateContent with JSON output.

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GenerateOptions {
  model?: string;
  responseSchema?: object; // Gemini responseSchema to constrain output shape
  temperature?: number;
}

/**
 * Ask Gemini for JSON. Returns the parsed object/array.
 * Throws on HTTP error or unparseable output.
 */
export async function generateJson(
  apiKey: string,
  prompt: string,
  opts: GenerateOptions = {}
): Promise<unknown> {
  const model = opts.model ?? "gemini-3.5-flash";
  const url = `${BASE}/${model}:generateContent?key=${apiKey}`;

  const generationConfig: Record<string, unknown> = {
    responseMimeType: "application/json",
    temperature: opts.temperature ?? 0.9,
  };
  if (opts.responseSchema) generationConfig.responseSchema = opts.responseSchema;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${text}`);
  }

  const data = (await resp.json()) as any;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text");

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Gemini output was not valid JSON: ${text.slice(0, 200)}`);
  }
}
