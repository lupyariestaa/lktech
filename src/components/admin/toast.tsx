"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: number;
  variant: ToastVariant;
  message: string;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLE: Record<ToastVariant, { icon: typeof CheckCircle2; cls: string }> = {
  success: { icon: CheckCircle2, cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  error: { icon: AlertCircle, cls: "border-rose-200 bg-rose-50 text-rose-700" },
  info: { icon: Info, cls: "border-slate-200 bg-white text-secondary" },
};

let counter = 0;

/** Provider toast untuk dashboard admin (pojok kanan bawah). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // Bersihkan timer yang belum sempat berjalan saat provider unmount.
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((ls) => ls.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++counter;
      setToasts((ls) => [...ls, { id, variant, message }]);
      const timer = setTimeout(() => {
        setToasts((ls) => ls.filter((t) => t.id !== id));
        timers.current.delete(id);
      }, 3500);
      timers.current.set(id, timer);
    },
    [],
  );

  const success = useCallback((m: string) => toast(m, "success"), [toast]);
  const error = useCallback((m: string) => toast(m, "error"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[12000] flex w-full max-w-sm flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const { icon: Icon, cls } = VARIANT_STYLE[t.variant];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.96 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg shadow-slate-900/5",
                  cls,
                )}
                role={t.variant === "error" ? "alert" : "status"}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="flex-1 text-sm font-medium">{t.message}</p>
                <button
                  onClick={() => remove(t.id)}
                  className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
                  aria-label="Tutup"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/** Hook akses toast. Aman dipanggil walau tanpa provider (no-op). */
export function useToast() {
  const ctx = useContext(ToastContext);
  return (
    ctx ?? {
      toast: () => {},
      success: () => {},
      error: () => {},
    }
  );
}
