import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import AdvisorChat from "./AdvisorChat";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useTenant } from "@/context/TenantContext";

type AdvisorDockProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
};

export default function AdvisorDock({ open, onClose, title = "Advisor" }: AdvisorDockProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const { tenantId } = useTenant();

  // Focus trap ao abrir
  useFocusTrap(panelRef as any, open);

  // Esc para fechar
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Trava scroll do body quando aberto
  useEffect(() => {
    const original = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Foco inicial no botão fechar
  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  return (
    <>
      {/* Backdrop (sempre acima da Topbar/Sidebar) */}
      <div
        className={`fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
        onClick={onClose}
      />

      {/* Painel (acima do backdrop) */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advisor-dock-title"
        className={`fixed inset-y-0 right-0 z-[70] w-full max-w-lg bg-white border-l shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b p-4">
          <h2 id="advisor-dock-title" className="text-sm font-medium text-slate-700">
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Fechar chat do Advisor"
            className="rounded-lg p-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-[calc(100%-56px)]">
          <AdvisorChat tenantId={tenantId} />
        </div>
      </div>
    </>
  );
}
