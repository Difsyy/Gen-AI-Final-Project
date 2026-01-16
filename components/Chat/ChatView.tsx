"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useApiStatus } from "@/components/ApiStatusProvider";
import ChatComposer from "@/components/Chat/ChatComposer";
import MessageBubble from "@/components/Chat/MessageBubble";
import { cn } from "@/lib/cn";
import type { ChatMessage } from "@/types/chat";

type UiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

const PROJECT_TITLE = "Gemini Chat + Image";

const STORAGE_KEY = "chatMessages.v2";

const SYSTEM_MESSAGE: ChatMessage = {
  role: "system",
  content:
    "You are a helpful assistant. Be concise, accurate, and safe. Format lists clearly.",
};

const RECOMMENDATIONS: Array<{ title: string; subtitle: string; prompt: string }> = [
  {
    title: "Study plan",
    subtitle: "Make a 7-day plan for a topic",
    prompt: "Create a 7-day study plan to learn [topic]. Include daily goals and quick quizzes.",
  },
  {
    title: "Summarize notes",
    subtitle: "Turn text into bullet points",
    prompt: "Summarize the following into 8 bullets and 3 key takeaways:\n\n[Paste text here]",
  },
  {
    title: "Draft an email",
    subtitle: "Polite, clear, professional",
    prompt: "Draft a professional email to [recipient] about [topic]. Keep it concise.",
  },
  {
    title: "Brainstorm ideas",
    subtitle: "Generate options + pros/cons",
    prompt: "Brainstorm 10 ideas for [project]. For each, add one pro and one con.",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isStoredUiMessage(value: unknown): value is UiChatMessage {
  if (!isRecord(value)) return false;
  return (
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    typeof value.id === "string" &&
    typeof value.createdAt === "number"
  );
}

function isStoredLegacyMessage(
  value: unknown
): value is { role: "user" | "assistant"; content: string } {
  if (!isRecord(value)) return false;
  return (
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string"
  );
}

export default function ChatView() {
  const { markConnected, markError } = useApiStatus();

  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const restored: UiChatMessage[] = [];
      for (const item of parsed) {
        if (isStoredUiMessage(item)) {
          restored.push(item);
          continue;
        }
        if (isStoredLegacyMessage(item)) {
          restored.push({
            id: randomId(),
            role: item.role,
            content: item.content,
            createdAt: Date.now(),
          });
        }
      }

      setMessages(restored);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const canSend = useMemo(() => !isLoading && input.trim().length > 0, [input, isLoading]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 120;
  }

  async function sendMessage() {
    if (!canSend) return;

    const text = input.trimEnd();
    setInput("");
    setError(null);

    const userMessage: UiChatMessage = {
      id: randomId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [SYSTEM_MESSAGE, ...nextMessages.map((m) => ({ role: m.role, content: m.content }))],
          temperature: 0.7,
          model: "gemini-2.5-flash",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        markError();
        setError(typeof data?.error === "string" ? data.error : "Something went wrong. Please try again.");
        return;
      }

      const assistantText = typeof data?.text === "string" ? data.text : "";
      if (!assistantText) {
        markError();
        setError("Empty response from server.");
        return;
      }

      markConnected();
      setMessages((prev) => [
        ...prev,
        {
          id: randomId(),
          role: "assistant",
          content: assistantText,
          createdAt: Date.now(),
        },
      ]);
    } catch {
      markError();
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function requestNewChat() {
    setConfirmOpen(true);
  }

  function confirmNewChat() {
    setConfirmOpen(false);
    setMessages([]);
    setError(null);
    setInput("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  function dismissError() {
    setError(null);
  }

  function applyRecommendation(text: string) {
    setInput(text);
    queueMicrotask(() => {
      const el = document.getElementById("chat-input") as HTMLTextAreaElement | null;
      el?.focus();
      if (el) {
        const end = el.value.length;
        el.setSelectionRange(end, end);
      }
    });
  }

  return (
    <div className={cn("flex flex-col", "h-[calc(100dvh-10.5rem)]")}>
      <div className="flex items-start justify-between gap-3 border-b border-[rgba(11,46,51,0.16)] bg-white px-4 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="text-base font-semibold tracking-tight">{PROJECT_TITLE}</h1>
            <span className="inline-flex items-center rounded-full border border-(--brand-200) bg-[rgba(184,227,233,0.35)] px-2 py-0.5 text-xs font-medium text-(--brand-900)">
              Chat
            </span>
          </div>
          <p className="mt-1 text-sm text-[rgba(11,46,51,0.72)]">Concise, server-side Gemini chat.</p>
        </div>
        <button
          type="button"
          onClick={requestNewChat}
          className={cn(
            "rounded-xl border border-(--brand-200) bg-white px-3 py-2 text-sm font-medium text-(--brand-900)",
            "hover:bg-[rgba(184,227,233,0.35)] active:bg-[rgba(184,227,233,0.55)]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(79,124,130,0.35)]"
          )}
        >
          New chat
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto bg-[rgba(184,227,233,0.30)] px-4 py-4"
      >
        <div className="flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-(--brand-200) bg-white p-4">
              <div className="text-sm text-[rgba(11,46,51,0.72)]">
                Ask anything. Your chat is saved locally in this browser.
              </div>

              <div className="mt-3">
                <div className="text-xs font-medium text-[rgba(11,46,51,0.72)]">Recommendations</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {RECOMMENDATIONS.map((r) => (
                    <button
                      key={r.title}
                      type="button"
                      onClick={() => applyRecommendation(r.prompt)}
                      className={cn(
                        "rounded-xl border border-(--brand-200) bg-white p-3 text-left",
                        "hover:bg-[rgba(184,227,233,0.35)] active:bg-[rgba(184,227,233,0.55)]",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(79,124,130,0.35)]"
                      )}
                    >
                      <div className="text-sm font-medium text-(--brand-900)">{r.title}</div>
                      <div className="mt-1 text-sm text-[rgba(11,46,51,0.72)]">{r.subtitle}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {isLoading ? <TypingIndicator /> : null}
        </div>
      </div>

      <ChatComposer
        value={input}
        onChange={setInput}
        onSend={() => void sendMessage()}
        isLoading={isLoading}
        error={error}
        onDismissError={dismissError}
      />

      {confirmOpen ? (
        <ConfirmDialog
          title="Start a new chat?"
          description="This will clear your current conversation from this device."
          confirmText="Clear chat"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={confirmNewChat}
        />
      ) : null}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl border border-[rgba(11,46,51,0.16)] bg-white px-4 py-3 text-sm text-[rgba(11,46,51,0.8)] shadow-sm">
        <div className="flex items-center gap-2">
          <span className="sr-only">Assistant is typing</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--brand-500) [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--brand-500) [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--brand-500)" />
          </span>
          <span className="text-[rgba(11,46,51,0.72)]">Typing…</span>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  description,
  confirmText,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmText: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    cancelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-950/20" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="relative w-full max-w-sm rounded-2xl border border-[rgba(11,46,51,0.16)] bg-white p-4 shadow-lg"
      >
        <div className="text-sm font-semibold" id="confirm-title">
          {title}
        </div>
        <div className="mt-1 text-sm text-[rgba(11,46,51,0.72)]" id="confirm-desc">
          {description}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className={cn(
              "rounded-xl border border-(--brand-200) bg-white px-3 py-2 text-sm font-medium",
              "hover:bg-[rgba(184,227,233,0.35)] active:bg-[rgba(184,227,233,0.55)]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(79,124,130,0.35)]"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "rounded-xl bg-(--brand-900) px-3 py-2 text-sm font-medium text-white",
              "hover:bg-(--brand-500) active:bg-(--brand-900)",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(79,124,130,0.35)]"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
