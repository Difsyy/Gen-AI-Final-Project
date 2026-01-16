"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";

export type ToastVariant = "default" | "success" | "error";

export type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  createdAt: number;
  durationMs: number;
};

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function randomId(): string {
  // Small, collision-resistant enough for UI toasts.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timerId = timersRef.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      timersRef.current.delete(id);
    }
  }, []);

  const pushToast = useCallback((input: ToastInput) => {
    const id = randomId();
    const toast: Toast = {
      id,
      title: input.title,
      description: input.description,
      variant: input.variant ?? "default",
      createdAt: Date.now(),
      durationMs: input.durationMs ?? 1800,
    };

    setToasts((prev) => [toast, ...prev].slice(0, 4));

    const timerId = window.setTimeout(() => removeToast(id), toast.durationMs);
    timersRef.current.set(id, timerId);
  }, [removeToast]);

  const value = useMemo<ToastContextValue>(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 top-3 z-50 mx-auto flex w-full max-w-5xl flex-col gap-2 px-3"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start justify-between gap-3 rounded-xl border bg-white px-3 py-2 shadow-sm",
            {
              "border-emerald-200": t.variant === "success",
              "border-red-200": t.variant === "error",
              "border-(--brand-200)": t.variant === "default",
            }
          )}
        >
          <div className="min-w-0">
            <div className="text-sm font-medium text-(--brand-900)">{t.title}</div>
            {t.description ? (
              <div className="mt-0.5 text-sm text-[rgba(11,46,51,0.72)]">{t.description}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="-m-1 rounded-md p-1 text-[rgba(11,46,51,0.6)] hover:bg-[rgba(184,227,233,0.55)] hover:text-(--brand-900) focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(79,124,130,0.35)]"
            aria-label="Dismiss notification"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      ))}
    </div>
  );
}
