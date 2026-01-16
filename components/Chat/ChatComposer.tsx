"use client";

import { useMemo } from "react";

import { cn } from "@/lib/cn";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  error: string | null;
  onDismissError: () => void;
};

export default function ChatComposer({
  value,
  onChange,
  onSend,
  isLoading,
  error,
  onDismissError,
}: Props) {
  const canSend = useMemo(() => !isLoading && value.trim().length > 0, [isLoading, value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend();
    }
  }

  return (
    <div className="border-t border-[color:rgba(11,46,51,0.16)] bg-white">
      {error ? (
        <div className="px-4 pt-3">
          <div
            className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
            role="alert"
          >
            <div className="min-w-0">{error}</div>
            <button
              type="button"
              onClick={onDismissError}
              className="-m-1 rounded-md p-1 text-red-800/70 hover:bg-red-100 hover:text-red-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-900/20"
              aria-label="Dismiss error"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2 p-4">
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <textarea
          id="chat-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={2}
          className={cn(
            "min-h-[44px] flex-1 resize-none rounded-xl border border-[var(--brand-200)] bg-white px-3 py-2 text-sm",
            "outline-none focus:ring-2 focus:ring-[color:rgba(79,124,130,0.35)]"
          )}
        />

        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className={cn(
            "h-fit rounded-xl bg-[var(--brand-900)] px-4 py-2.5 text-sm font-medium text-white shadow-sm",
            "hover:bg-[var(--brand-500)] active:bg-[var(--brand-900)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(79,124,130,0.35)]"
          )}
          aria-label="Send message"
        >
          Send
        </button>
      </div>

      <div className="px-4 pb-4 text-xs text-[color:rgba(11,46,51,0.6)]">
        Enter to send · Shift+Enter for newline
      </div>
    </div>
  );
}
