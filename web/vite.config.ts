// web/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Momentum CFO",
        short_name: "Momentum",
        theme_color: "#0f172a",
        icons: [
          {
            src: "/assets/brand/momentum-logo.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/assets/brand/momentum-logo.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "virtual:pwa-register": resolve(__dirname, "src/pwaRegisterStub.ts"),
    },
  },
  build: {
    // 👉 manda o build para a mesma pasta que o Hosting usa
    outDir: "../hosting/public",
    emptyOutDir: true,
  },
});
