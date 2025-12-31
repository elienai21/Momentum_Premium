export function registerSW(_options?: { immediate?: boolean }) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  // Evita carregar o sw.js em desenvolvimento para não gerar erro de MIME type
  if (import.meta.env.DEV) {
    console.log("PWA: Registro de Service Worker pulado em ambiente de desenvolvimento.");
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("SW registration failed", err));
  });
}

export default registerSW;
