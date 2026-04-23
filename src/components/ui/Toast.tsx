import React, { createContext, useContext, useCallback, useState } from "react";

type ToastVariant = "ok" | "pending" | "excess" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

const variantColor: Record<ToastVariant, string> = {
  ok: "var(--status-ok)",
  pending: "var(--status-pending)",
  excess: "var(--status-excess)",
  info: "var(--accent)",
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  let nextId = React.useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 2000,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background: "var(--bg-surface)",
              borderLeft: `3px solid ${variantColor[t.variant]}`,
              padding: "10px 16px",
              fontFamily: "var(--font-heading)",
              fontSize: "13px",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderLeftColor: variantColor[t.variant],
              animation: "toast-in 200ms ease-out",
              minWidth: "240px",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
