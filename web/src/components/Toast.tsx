// web/src/components/Toast.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  type?: ToastType;
  message: string;
};

type ToastContextValue = {
  notify: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<Toast[]>([]);

  const notify = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, ...toast }]);

    // remove o toast após 4 segundos
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}

      {/* Área de toasts – acessível para leitores de tela */}
      <div
        className="fixed bottom-4 right-4 z-50 space-y-2"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => {
          let classes =
            "rounded-xl px-4 py-3 shadow-md border text-sm bg-white";

          if (item.type === "success") {
            classes += " border-emerald-300 bg-emerald-50 text-emerald-900";
          } else if (item.type === "error") {
            classes += " border-rose-300 bg-rose-50 text-rose-900";
          } else {
            classes += " border-slate-200 bg-white text-slate-900";
          }

          return (
            <div key={item.id} className={classes}>
              <span>{item.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
