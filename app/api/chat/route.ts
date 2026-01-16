import { NextResponse } from "next/server";

import { getGenAI } from "@/lib/genai";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { parseChatRequest } from "@/types/chat";

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

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const limit = rateLimit({
    id: `${ip}:chat`,
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

  let parsed: ReturnType<typeof parseChatRequest>;
  try {
    parsed = parseChatRequest(body);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const ai = getGenAI();

    const systemText = parsed.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n")
      .trim();

    const contents = parsed.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    if (contents.length === 0) {
      return NextResponse.json(
        { error: "At least one non-system message is required." },
        { status: 400 },
      );
    }

    const result = await ai.models.generateContent({
      model: parsed.model,
      contents,
      config: {
        temperature: parsed.temperature,
        ...(systemText
          ? {
              systemInstruction: {
                role: "user",
                parts: [{ text: systemText }],
              },
            }
          : {}),
      },
    });

    const text = result.text?.trim() ?? "";

    if (!text) {
      return NextResponse.json(
        { error: "No text response returned by the model." },
        { status: 502 },
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/chat error:", err);

    if (message.includes("Missing GEMINI_API_KEY")) {
      return NextResponse.json(
        { error: "Server is missing GEMINI_API_KEY." },
        { status: 500 },
      );
    }

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
        error: "Chat request failed. Please try again.",
        ...(process.env.NODE_ENV !== "production" ? { debug: message } : {}),
      },
      { status: 500 },
    );
  }
}
