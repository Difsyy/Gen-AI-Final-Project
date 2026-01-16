"use client";

import { useMemo } from "react";

import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/cn";
import type { GeneratedImage } from "@/types/image";

type GalleryItem = {
  id: string;
  image: GeneratedImage;
  prompt: string;
  createdAt: number;
};

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function ImageCard({ item, index }: { item: GalleryItem; index: number }) {
  const { pushToast } = useToast();

  const filename = useMemo(() => {
    const ext = item.image.mimeType.includes("png") ? "png" : "img";
    return `gemini-image-${index + 1}.${ext}`;
  }, [index, item.image.mimeType]);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(item.prompt);
      pushToast({ title: "Copied", description: "Prompt copied to clipboard.", variant: "success" });
    } catch {
      pushToast({ title: "Copy failed", description: "Your browser blocked clipboard access.", variant: "error" });
    }
  }

  function download() {
    try {
      downloadDataUrl(item.image.dataUrl, filename);
      pushToast({ title: "Downloading…", description: filename, variant: "success" });
    } catch {
      pushToast({ title: "Download failed", description: "Could not start download.", variant: "error" });
    }
  }

  return (
    <div className="group overflow-hidden rounded-2xl border border-[color:rgba(11,46,51,0.16)] bg-white shadow-sm">
      <div className="relative aspect-square bg-zinc-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image.dataUrl}
          alt="Generated image"
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <div className="truncate text-xs text-zinc-500">{item.image.mimeType}</div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void copyPrompt()}
            className={cn(
              "rounded-lg border border-[var(--brand-200)] bg-white px-2.5 py-1.5 text-sm text-[var(--brand-900)]",
              "hover:bg-[color:rgba(184,227,233,0.35)] active:bg-[color:rgba(184,227,233,0.55)]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(79,124,130,0.35)]"
            )}
            aria-label="Copy prompt"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={download}
            className={cn(
              "rounded-lg bg-[var(--brand-900)] px-2.5 py-1.5 text-sm font-medium text-white",
              "hover:bg-[var(--brand-500)] active:bg-[var(--brand-900)]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(79,124,130,0.35)]"
            )}
            aria-label="Download image"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
