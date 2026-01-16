"use client";

import { useMemo, useState } from "react";

import { useApiStatus } from "@/components/ApiStatusProvider";
import ImageCard from "@/components/Image/ImageCard";
import { cn } from "@/lib/cn";
import type { GeneratedImage } from "@/types/image";

type AspectPreset = "square" | "portrait" | "landscape";

type GalleryItem = {
  id: string;
  image: GeneratedImage;
  prompt: string;
  createdAt: number;
};

const PROJECT_TITLE = "Gemini Chat + Image";

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function aspectHint(preset: AspectPreset): string {
  if (preset === "portrait") return "Aspect ratio: 3:4";
  if (preset === "landscape") return "Aspect ratio: 16:9";
  return "Aspect ratio: 1:1";
}

const SD_PRESETS: Array<{
  title: string;
  subtitle: string;
  prompt: string;
  negative: string;
}> = [
  {
    title: "Poster key visual",
    subtitle: "Bold composition + negative space",
    prompt:
      "poster key visual, bold graphic composition, strong negative space for headline, clean shapes, limited color palette, high contrast lighting, sharp edges, editorial design",
    negative:
      "blurry, lowres, bad composition, messy layout, illegible text, watermark, signature, jpeg artifacts",
  },
  {
    title: "Product photo",
    subtitle: "Studio lighting",
    prompt:
      "product photography of [product], studio lighting, softbox key light, clean backdrop, realistic materials, sharp focus, commercial photo",
    negative:
      "blurry, lowres, deformed, unrealistic reflections, watermark, logo, text",
  },
  {
    title: "UI moodboard",
    subtitle: "Futuristic app direction",
    prompt:
      "UI design moodboard, [app type], modern minimal interface, grid system, clean spacing, subtle gradients, high-end product design, shot on a desk mockup",
    negative:
      "blurry, lowres, clutter, inconsistent style, unreadable text, watermark",
  },
  {
    title: "Editorial photo",
    subtitle: "Fashion / magazine",
    prompt:
      "editorial photography, magazine cover style, cinematic lighting, carefully styled scene, shallow depth of field, premium aesthetic",
    negative:
      "blurry, lowres, bad anatomy, bad hands, watermark, signature, text",
  },
  {
    title: "Material study",
    subtitle: "Surface + lighting",
    prompt:
      "material study, macro close-up of [material], realistic texture, directional lighting, crisp detail, photoreal",
    negative:
      "blurry, lowres, noisy, over-sharpened, jpeg artifacts, watermark",
  },
  {
    title: "Concept art",
    subtitle: "Environment sketch",
    prompt:
      "concept art, [scene], atmospheric perspective, strong silhouette design, volumetric lighting, detailed, cohesive style",
    negative:
      "blurry, lowres, messy, incoherent, watermark, text",
  },
];

export default function ImageView() {
  const { markConnected, markError } = useApiStatus();

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [numberOfImages, setNumberOfImages] = useState<1 | 2>(1);
  const [aspect, setAspect] = useState<AspectPreset>("square");
  const [seed, setSeed] = useState("");

  const canGenerate = useMemo(() => !isLoading && prompt.trim().length > 0, [isLoading, prompt]);

  function dismissError() {
    setError(null);
  }

  async function generateOne(finalPrompt: string): Promise<GeneratedImage[]> {
    const res = await fetch("/api/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: finalPrompt,
        model: "gemini-2.5-flash-image",
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = typeof data?.error === "string" ? data.error : "Image generation failed.";
      throw new Error(msg);
    }

    const next = Array.isArray(data?.images) ? (data.images as GeneratedImage[]) : [];
    if (next.length === 0) throw new Error("No images returned.");

    return next;
  }

  async function generate() {
    if (!canGenerate) return;

    setIsLoading(true);
    setError(null);

    const basePrompt = prompt.trim();
    const neg = negativePrompt.trim();
    const seedClean = seed.trim();

    const finalPrompt = [
      basePrompt,
      neg ? `Negative prompt:\n${neg}` : null,
      aspectHint(aspect),
      seedClean ? `Seed: ${seedClean}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const created: GalleryItem[] = [];

    try {
      for (let i = 0; i < numberOfImages; i++) {
        const images = await generateOne(finalPrompt);

        created.push({
          id: randomId(),
          image: images[0],
          prompt: finalPrompt,
          createdAt: Date.now(),
        });
      }

      markConnected();

      setItems((prev) => {
        const newestFirst = [...created].reverse();
        return [...newestFirst, ...prev];
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Image generation failed.";
      setError(msg);
      markError();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[360px,1fr]">
      <section className="rounded-2xl border border-[rgba(11,46,51,0.16)] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h1 className="text-base font-semibold tracking-tight">{PROJECT_TITLE}</h1>
          <span className="inline-flex items-center rounded-full border border-(--brand-200) bg-[rgba(184,227,233,0.35)] px-2 py-0.5 text-xs font-medium text-(--brand-900)">
            Image
          </span>
        </div>
        <p className="mt-1 text-sm text-[rgba(11,46,51,0.72)]">Stable Diffusion-style panel layout (prompt + settings).</p>

        <div className="mt-4">
          <div className="mb-4">
            <div className="text-sm font-semibold text-(--brand-900)">Presets</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {SD_PRESETS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => {
                    setPrompt(p.prompt);
                    setNegativePrompt(p.negative);
                    queueMicrotask(() => {
                      const el = document.getElementById("image-prompt") as HTMLTextAreaElement | null;
                      el?.focus();
                    });
                  }}
                  className={cn(
                    "rounded-xl border border-(--brand-200) bg-white p-3 text-left",
                    "hover:bg-[rgba(184,227,233,0.35)] active:bg-[rgba(184,227,233,0.55)]",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(79,124,130,0.35)]"
                  )}
                >
                  <div className="text-sm font-medium text-(--brand-900)">{p.title}</div>
                  <div className="mt-1 text-sm text-[rgba(11,46,51,0.72)]">{p.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          <label className="text-sm font-medium text-zinc-900" htmlFor="image-prompt">
            Prompt
          </label>
          <textarea
            id="image-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            placeholder='e.g., "poster design, strong negative space for headline, clean shapes, studio lighting"'
            className={cn(
              "mt-2 w-full resize-none rounded-xl border border-(--brand-200) bg-white px-3 py-2 text-sm",
              "outline-none focus:ring-2 focus:ring-[rgba(79,124,130,0.35)]"
            )}
          />

          <div className="mt-4">
            <label className="text-sm font-medium text-zinc-900" htmlFor="image-negative">
              Negative prompt
            </label>
            <textarea
              id="image-negative"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              rows={3}
              placeholder='e.g., "blurry, lowres, watermark, text, bad composition"'
              className={cn(
                "mt-2 w-full resize-none rounded-xl border border-(--brand-200) bg-white px-3 py-2 text-sm",
                "outline-none focus:ring-2 focus:ring-[rgba(79,124,130,0.35)]"
              )}
            />
            <div className="mt-1 text-xs text-[rgba(11,46,51,0.6)]">This is appended to the prompt (no API change).</div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void generate()}
              disabled={!canGenerate}
              className={cn(
                "rounded-xl bg-(--brand-900) px-4 py-2.5 text-sm font-medium text-white shadow-sm",
                "hover:bg-(--brand-500) active:bg-(--brand-900)",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(79,124,130,0.35)]"
              )}
            >
              {isLoading ? "Generating…" : "Generate"}
            </button>

            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className={cn(
                "rounded-xl border border-(--brand-200) bg-white px-3 py-2.5 text-sm font-medium",
                "hover:bg-[rgba(184,227,233,0.35)] active:bg-[rgba(184,227,233,0.55)]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(79,124,130,0.35)]"
              )}
              aria-expanded={advancedOpen}
              aria-controls="advanced-panel"
            >
              Settings
            </button>

            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-(--brand-200) border-t-(--brand-900)" />
                <span className="text-[rgba(11,46,51,0.72)]">Working…</span>
              </div>
            ) : null}
          </div>

          {advancedOpen ? (
            <div id="advanced-panel" className="mt-3 rounded-xl border border-(--brand-200) bg-[rgba(184,227,233,0.35)] p-3">
              <div className="grid gap-3">
                <div>
                  <label className="text-sm font-medium text-zinc-900" htmlFor="seed">
                    Seed (optional)
                  </label>
                  <input
                    id="seed"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="e.g., 12345"
                    className={cn(
                      "mt-1 w-full rounded-xl border border-(--brand-200) bg-white px-3 py-2 text-sm",
                      "outline-none focus:ring-2 focus:ring-[rgba(79,124,130,0.35)]"
                    )}
                  />
                  <p className="mt-1 text-xs text-[rgba(11,46,51,0.6)]">Stored as a hint in the prompt text.</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-900" htmlFor="num-images">
                    Batches (1–2)
                  </label>
                  <select
                    id="num-images"
                    value={numberOfImages}
                    onChange={(e) => setNumberOfImages(e.target.value === "2" ? 2 : 1)}
                    className={cn(
                      "mt-1 w-full rounded-xl border border-(--brand-200) bg-white px-3 py-2 text-sm",
                      "outline-none focus:ring-2 focus:ring-[rgba(79,124,130,0.35)]"
                    )}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                  <p className="mt-1 text-xs text-[rgba(11,46,51,0.6)]">2 batches = 2 requests (free-friendly).</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-900" htmlFor="aspect">
                    Aspect
                  </label>
                  <select
                    id="aspect"
                    value={aspect}
                    onChange={(e) => setAspect(e.target.value as AspectPreset)}
                    className={cn(
                      "mt-1 w-full rounded-xl border border-(--brand-200) bg-white px-3 py-2 text-sm",
                      "outline-none focus:ring-2 focus:ring-[rgba(79,124,130,0.35)]"
                    )}
                  >
                    <option value="square">1:1</option>
                    <option value="portrait">3:4</option>
                    <option value="landscape">16:9</option>
                  </select>
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-3">
              <div
                className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
                role="alert"
              >
                <div className="min-w-0">{error}</div>
                <button
                  type="button"
                  onClick={dismissError}
                  className="-m-1 rounded-md p-1 text-red-800/70 hover:bg-red-100 hover:text-red-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-900/20"
                  aria-label="Dismiss error"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[rgba(11,46,51,0.16)] bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-[rgba(11,46,51,0.16)] p-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-(--brand-900)">Gallery</div>
            <div className="mt-1 text-sm text-[rgba(11,46,51,0.72)]">Latest generations appear first.</div>
          </div>
        </div>

        <div className="p-4">
          {items.length === 0 && !isLoading ? (
            <div className="rounded-xl border border-dashed border-(--brand-200) bg-white p-5 text-sm text-[rgba(11,46,51,0.72)]">
              No images yet. Write a prompt in the left panel and click Generate.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading
              ? Array.from({ length: numberOfImages }).map((_, idx) => <SkeletonCard key={`sk-${idx}`} />)
              : null}

            {items.map((item, idx) => (
              <ImageCard key={item.id} item={item} index={idx} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(11,46,51,0.16)] bg-white shadow-sm">
      <div className="aspect-square animate-pulse bg-[rgba(184,227,233,0.35)]" />
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="h-3 w-24 animate-pulse rounded bg-[rgba(184,227,233,0.55)]" />
        <div className="flex gap-2">
          <div className="h-8 w-16 animate-pulse rounded-lg bg-[rgba(184,227,233,0.55)]" />
          <div className="h-8 w-20 animate-pulse rounded-lg bg-[rgba(184,227,233,0.55)]" />
        </div>
      </div>
    </div>
  );
}
