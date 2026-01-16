"use client";

import type { GeneratedImage } from "@/types/image";

export default function ImageCard({
  image,
  index,
}: {
  image: GeneratedImage;
  index: number;
}) {
  const filename = `gemini-image-${index + 1}.png`;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="relative aspect-square bg-zinc-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.dataUrl}
          alt={`Generated image ${index + 1}`}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <div className="truncate text-xs text-zinc-500">{image.mimeType}</div>
        </div>
        <a
          href={image.dataUrl}
          download={filename}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          Download
        </a>
      </div>
    </div>
  );
}
