import { GoogleGenAI } from "@google/genai";

declare global {
  var __genaiClient: GoogleGenAI | undefined;
}

export function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY. Add it to .env.local (local) or Vercel environment variables.",
    );
  }

  if (!globalThis.__genaiClient) {
    globalThis.__genaiClient = new GoogleGenAI({ apiKey });
  }

  return globalThis.__genaiClient;
}
