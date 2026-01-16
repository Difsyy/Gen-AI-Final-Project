"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type ApiHealth = "connected" | "error";

export type ApiStatus = {
  health: ApiHealth;
  updatedAt: number;
};

type ApiStatusContextValue = {
  status: ApiStatus;
  markConnected: () => void;
  markError: () => void;
};

const ApiStatusContext = createContext<ApiStatusContextValue | null>(null);

export function ApiStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ApiStatus>({
    health: "connected",
    updatedAt: 0,
  });

  const markConnected = useCallback(() => {
    setStatus({ health: "connected", updatedAt: Date.now() });
  }, []);

  const markError = useCallback(() => {
    setStatus({ health: "error", updatedAt: Date.now() });
  }, []);

  const value = useMemo<ApiStatusContextValue>(
    () => ({ status, markConnected, markError }),
    [status, markConnected, markError]
  );

  return <ApiStatusContext.Provider value={value}>{children}</ApiStatusContext.Provider>;
}

export function useApiStatus(): ApiStatusContextValue {
  const ctx = useContext(ApiStatusContext);
  if (!ctx) throw new Error("useApiStatus must be used within ApiStatusProvider");
  return ctx;
}
