"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

const ToastContext = createContext<(message: string, variant?: ToastVariant) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-emerald-300 text-emerald-800",
  error: "border-red-300 text-red-800",
  info: "border-zinc-300 text-zinc-700",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto rounded-md border bg-white px-4 py-3 text-sm shadow-lg ${VARIANT_STYLES[toast.variant]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
