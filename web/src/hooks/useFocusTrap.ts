import { useEffect } from "react";

/**
 * Mantém o foco dentro de um container (ex.: modal/drawer).
 * - Captura Tab / Shift+Tab.
 * - Foca o primeiro elemento focável ao abrir.
 */
export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return;

    const root = ref.current;
    const selector = [
      "a[href]", "button:not([disabled])", "textarea:not([disabled])",
      "input:not([disabled])", "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const getNodes = () => Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(el =>
      !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden")
    );

    const focusFirst = () => {
      const els = getNodes();
      if (els.length) els[0].focus();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = getNodes();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];

      const current = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (current === first || !root.contains(current)) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (current === last || !root.contains(current)) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    const onFocusOut = (e: FocusEvent) => {
      if (!root.contains(e.relatedTarget as Node)) {
        // Se foco saiu do container, traz de volta.
        focusFirst();
      }
    };

    // Foco inicial
    requestAnimationFrame(focusFirst);
    // Listeners
    document.addEventListener("keydown", onKeyDown);
    root.addEventListener("focusout", onFocusOut as any);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      root.removeEventListener("focusout", onFocusOut as any);
    };
  }, [ref, active]);
}
