"use client";

import { useMemo } from "react";

import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/cn";

type UiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export default function MessageBubble({ message }: { message: UiChatMessage }) {
  const { pushToast } = useToast();

  const isUser = message.role === "user";
  const timeLabel = useMemo(() => {
    try {
      return new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, [message.createdAt]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      pushToast({ title: "Copied", description: "Message copied to clipboard.", variant: "success" });
    } catch {
      pushToast({ title: "Copy failed", description: "Your browser blocked clipboard access.", variant: "error" });
    }
  }

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("group max-w-[85%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap shadow-sm",
            isUser
              ? "bg-[var(--brand-900)] text-white"
              : "border border-[color:rgba(11,46,51,0.16)] bg-white text-[var(--brand-900)]"
          )}
        >
          {message.content}
        </div>

        <div className={cn("mt-1 flex items-center gap-2 text-xs", isUser ? "justify-end" : "justify-start")}>
          <span className="text-[color:rgba(11,46,51,0.55)]" aria-label={`Sent at ${timeLabel}`}>
            {timeLabel}
          </span>

          {!isUser ? (
            <button
              type="button"
              onClick={() => void handleCopy()}
              className={cn(
                "rounded-md px-2 py-1 text-[color:rgba(11,46,51,0.6)] transition-colors",
                "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                "hover:bg-[color:rgba(184,227,233,0.55)] hover:text-[var(--brand-900)]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(79,124,130,0.35)]"
              )}
              aria-label="Copy assistant message"
            >
              Copy
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
