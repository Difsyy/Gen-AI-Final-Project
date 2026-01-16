"use client";

import { useMemo, useState } from "react";

import type { ChatMessage } from "@/types/chat";

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const bubbleClass = useMemo(() => {
    if (isUser) {
      return "bg-zinc-900 text-white";
    }
    return "bg-white text-zinc-900 border border-zinc-200";
  }, [isUser]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className="max-w-[85%]">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap ${bubbleClass}`}
        >
          {message.content}
        </div>
        {isAssistant ? (
          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md px-2 py-1 hover:bg-zinc-100"
              aria-label="Copy assistant message"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
