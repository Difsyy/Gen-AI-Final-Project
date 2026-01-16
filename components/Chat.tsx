"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import MessageBubble from "@/components/MessageBubble";
import type { ChatMessage } from "@/types/chat";

const STORAGE_KEY = "chatMessages.v1";

const SYSTEM_MESSAGE: ChatMessage = {
  role: "system",
  content:
    "You are a helpful assistant. Be concise, accurate, and safe. Format lists clearly.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStoredMessage(value: unknown): value is ChatMessage {
  if (!isRecord(value)) return false;
  const role = value.role;
  const content = value.content;
  return (role === "user" || role === "assistant") && typeof content === "string";
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaReached, setQuotaReached] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const restored = parsed.filter(isStoredMessage);
      setMessages(restored);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      const toStore = messages.filter((m) => m.role !== "system");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const canSend = useMemo(() => {
    return !isLoading && input.trim().length > 0;
  }, [input, isLoading]);

  async function sendMessage() {
    if (!canSend) return;

    const text = input.trimEnd();
    setInput("");
    setError(null);
    setQuotaReached(false);

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [SYSTEM_MESSAGE, ...nextMessages],
          temperature: 0.7,
          model: "gemini-2.5-flash",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        setQuotaReached(true);
        setError(data?.error || "Quota reached. Please wait and try again.");
        return;
      }

      if (!res.ok) {
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }

      const assistantText = typeof data?.text === "string" ? data.text : "";
      if (!assistantText) {
        setError("Empty response from server.");
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  function handleNewChat() {
    setMessages([]);
    setError(null);
    setQuotaReached(false);
    setInput("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Chat</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Text chatbot powered by Gemini (server-side only).
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewChat}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
        >
          New Chat
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-100/50 p-3">
        <div className="h-[55dvh] overflow-y-auto rounded-xl bg-zinc-50 p-3">
          <div className="flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                Ask anything. Your chat is saved in localStorage.
              </div>
            ) : null}

            {messages.map((m, idx) => (
              <MessageBubble key={idx} message={m} />
            ))}

            {isLoading ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
                    <span>Typing…</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>
        </div>

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

        <div className="mt-3 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={3}
            className="flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={!canSend}
            className="h-fit rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          Enter to send · Shift+Enter for newline
        </div>
      </div>
    </div>
  );
}
