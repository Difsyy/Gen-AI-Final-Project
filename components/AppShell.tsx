"use client";

import Link from "next/link";

import { useApiStatus } from "@/components/ApiStatusProvider";
import TabsNav from "@/components/TabsNav";
import { cn } from "@/lib/cn";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-(--brand-50) text-(--brand-900)">
      <Header />

      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="overflow-hidden rounded-2xl border border-[rgba(11,46,51,0.16)] bg-white shadow-sm">
          {children}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-8 text-xs text-[rgba(11,46,51,0.6)]">
        Uses Google AI Studio API key server-side only.
      </footer>
    </div>
  );
}

function Header() {
  const { status } = useApiStatus();

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(11,46,51,0.16)] bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="truncate text-sm font-semibold tracking-tight text-(--brand-900) focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(79,124,130,0.35)]"
          >
            Gemini Chat + Image
          </Link>
          <StatusBadge health={status.health} />
        </div>
        <TabsNav />
      </div>
    </header>
  );
}

function StatusBadge({ health }: { health: "connected" | "error" }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium",
        health === "connected"
          ? "border-(--brand-500) bg-[rgba(79,124,130,0.16)] text-(--brand-900)"
          : "border-red-200 bg-red-50 text-red-800"
      )}
      aria-label={`API status: ${health === "connected" ? "Connected" : "Error"}`}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          health === "connected" ? "bg-(--brand-900)" : "bg-red-600"
        )}
        aria-hidden="true"
      />
      {health === "connected" ? "Connected" : "Error"}
    </div>
  );
}
