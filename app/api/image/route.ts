import { NextResponse } from "next/server";

import { getGenAI } from "@/lib/genai";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { parseImageRequest } from "@/types/image";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseUpstreamError(message: string): {
  code?: number;
  status?: string;
  message?: string;
  retryAfterSeconds?: number;
} {
  try {
    const parsed: unknown = JSON.parse(message);
    const err = isRecord(parsed) && isRecord(parsed.error) ? parsed.error : undefined;
    const code = typeof err?.code === "number" ? err.code : undefined;
    const status = typeof err?.status === "string" ? err.status : undefined;
    const msg = typeof err?.message === "string" ? err.message : undefined;

    let retryAfterSeconds: number | undefined;
    const details = Array.isArray(err?.details) ? err.details : [];
    for (const d of details) {
      if (!isRecord(d)) continue;
      const type = typeof d["@type"] === "string" ? d["@type"] : "";
      const retryDelay = typeof d.retryDelay === "string" ? d.retryDelay : "";
      if (type.includes("RetryInfo") && retryDelay) {
        const m = retryDelay.match(/^(\d+)s$/);
        if (m) retryAfterSeconds = Number(m[1]);
      }
    }

    return { code, status, message: msg, retryAfterSeconds };
  } catch {
    return {};
  }
}

function toDataUrl(mimeType: string, base64Data: string) {
  return `data:${mimeType};base64,${base64Data}`;
}

async function generateOneImage(params: {
  prompt: string;
  model: string;
  responseModalities?: string[];
}): Promise<{ mimeType: string; dataUrl: string } | null> {
  const ai = getGenAI();

  const result = await ai.models.generateContent({
    model: params.model,
    contents: [
      {
        role: "user",
        parts: [{ text: params.prompt }],
      },
    ],
    ...(params.responseModalities
      ? { config: { responseModalities: params.responseModalities } }
      : {}),
  });

  const parts = result.candidates?.flatMap((c) => c.content?.parts ?? []) ?? [];
  for (const part of parts) {
    const inlineData = part.inlineData;
    const mimeType = inlineData?.mimeType;
    const data = inlineData?.data;
    if (typeof mimeType === "string" && typeof data === "string") {
      return { mimeType, dataUrl: toDataUrl(mimeType, data) };
    }
  }

  return null;
}

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const limit = rateLimit({
    id: `${ip}:image`,
    limit: 10,
    windowMs: 60_000,
  });

  if (!limit.ok) {
    return NextResponse.json(
      {
        error: "Quota reached: please wait a minute and try again.",
        resetAt: limit.resetAt,
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  let parsed: ReturnType<typeof parseImageRequest>;
  try {
    parsed = parseImageRequest(body);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request." },
      { status: 400 },
    );
  }

  try {
    // Try requested model first.
    let image: { mimeType: string; dataUrl: string } | null = null;
    try {
      image = await generateOneImage({
        prompt: parsed.prompt,
        model: parsed.model,
        responseModalities: ["IMAGE"],
      });
    } catch (firstErr) {
      const firstMsg = firstErr instanceof Error ? firstErr.message : String(firstErr);
      const upstream = parseUpstreamError(firstMsg);

      const isZeroQuota =
        upstream.code === 429 || upstream.status === "RESOURCE_EXHAUSTED";

      // If this specific image model has zero free-tier quota, try the experimental
      // free-tier image-generation model (different modalities requirements).
      if (isZeroQuota && parsed.model === "gemini-2.5-flash-image") {
        try {
          image = await generateOneImage({
            prompt: parsed.prompt,
            model: "gemini-2.0-flash-exp-image-generation",
            responseModalities: ["TEXT", "IMAGE"],
          });
        } catch (secondErr) {
          const secondMsg = secondErr instanceof Error ? secondErr.message : String(secondErr);
          // Some configs reject responseModalities entirely; try once without.
          if (secondMsg.toLowerCase().includes("response modalities")) {
            image = await generateOneImage({
              prompt: parsed.prompt,
              model: "gemini-2.0-flash-exp-image-generation",
            });
          } else {
            throw secondErr;
          }
        }
      } else {
        throw firstErr;
      }
    }

    if (image) return NextResponse.json({ images: [image] });

    return NextResponse.json(
      {
        error:
          "No image data returned by the model. Try a different prompt or model.",
      },
      { status: 502 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/image error:", err);

    const lower = message.toLowerCase();
    if (lower.includes("api_key_invalid") || lower.includes("api key not valid")) {
      return NextResponse.json(
        {
          error:
            "Invalid API key. Create a key in Google AI Studio and set GEMINI_API_KEY in .env.local / Vercel.",
        },
        { status: 401 },
      );
    }

    const upstream = parseUpstreamError(message);
    if (upstream.code === 429 || upstream.status === "RESOURCE_EXHAUSTED") {
      return NextResponse.json(
        {
          error:
            "Quota reached. Please wait a bit and try again (or check your AI Studio quota).",
          ...(process.env.NODE_ENV !== "production" ? { debug: upstream.message ?? message } : {}),
        },
        {
          status: 429,
          headers:
            typeof upstream.retryAfterSeconds === "number"
              ? { "Retry-After": String(upstream.retryAfterSeconds) }
              : undefined,
        },
      );
    }

    return NextResponse.json(
      {
        error: "Image request failed. Please try again.",
        ...(process.env.NODE_ENV !== "production" ? { debug: message } : {}),
      },
      { status: 500 },
    );
  }
}
