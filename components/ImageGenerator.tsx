"use client";

import { useMemo, useState } from "react";

import ImageCard from "@/components/ImageCard";
import type { GeneratedImage } from "@/types/image";

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaReached, setQuotaReached] = useState(false);

  const canGenerate = useMemo(() => {
    return !isLoading && prompt.trim().length > 0;
  }, [isLoading, prompt]);

  async function generate() {
    if (!canGenerate) return;

    setIsLoading(true);
    setError(null);
    setQuotaReached(false);

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: "gemini-2.5-flash-image",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        setQuotaReached(true);
        setError(data?.error || "Quota reached. Please wait and try again.");
        return;
      }

      if (!res.ok) {
        setError(data?.error || "Image generation failed.");
        return;
      }

      const next = Array.isArray(data?.images) ? (data.images as GeneratedImage[]) : [];
      if (next.length === 0) {
        setError("No images returned.");
        return;
      }

      setImages((prev) => [...next, ...prev]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Image Generator</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Generates 1 image per request (free-friendly).
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <label className="text-sm font-medium">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder='e.g., "a cozy coffee shop interior, cinematic lighting, ultra-detailed"'
          className="mt-2 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
        />

        {error ? (
          <div
            className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
              quotaReached
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {error}
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={!canGenerate}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Generating…" : "Generate image"}
          </button>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
              <span>Working…</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img, idx) => (
          <ImageCard key={`${idx}-${img.mimeType}`} image={img} index={idx} />
        ))}
      </div>
    </div>
  );
}
