export type ImageRequestBody = {
  prompt: string;
  model?: string;
};

export type GeneratedImage = {
  mimeType: string;
  dataUrl: string;
};

export type ImageResponseBody = {
  images: GeneratedImage[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseImageRequest(body: unknown): {
  prompt: string;
  model: string;
} {
  if (!isRecord(body)) throw new Error("Invalid JSON body");

  const prompt = body.prompt;
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new Error("'prompt' must be a non-empty string");
  }

  if (prompt.length > 4000) {
    throw new Error("'prompt' is too long (max 4000 chars)");
  }

  const modelRaw = body.model;
  const model =
    typeof modelRaw === "string" && modelRaw.trim()
      ? modelRaw
      : "gemini-2.5-flash-image";

  return { prompt, model };
}
