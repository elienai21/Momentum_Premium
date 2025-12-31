/**
 * Minimal stub of vite-plugin-pwa to emit a manifest and a basic service worker
 * without external dependencies. This keeps builds working in restricted environments.
 */

export function VitePWA(options = {}) {
  const manifest = options.manifest || {};
  const swFileName = (options.workbox && options.workbox.swDest) || "sw.js";

  return {
    name: "vite-plugin-pwa-stub",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "manifest.webmanifest",
        source: JSON.stringify(manifest, null, 2),
      });

      const swSource = `
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', () => {
  // Passthrough cache stub
});
`;

      this.emitFile({
        type: "asset",
        fileName: swFileName,
        source: swSource,
      });
    },
  };
}

export default VitePWA;
