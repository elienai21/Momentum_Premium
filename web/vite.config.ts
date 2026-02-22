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
      includeAssets: ["assets/brand/momentum-logo.png"],
      manifest: {
        name: "Momentum Premium",
        short_name: "Momentum",
        description: "Gestão Financeira e Imobiliária Profissional",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "assets/brand/momentum-logo.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "assets/brand/momentum-logo.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.momentum\.com\/.*/i,
            handler: "NetworkOnly",
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
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate large chart library (183KB)
          charts: ["chart.js", "react-chartjs-2"],
          // Firebase SDK chunks
          firebase: [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/storage",
          ],
          // React core and routing
          vendor: ["react", "react-dom", "react-router-dom"],
          // State management and animations
          query: ["@tanstack/react-query"],
          motion: ["framer-motion"],
          // Icons library
          icons: ["lucide-react"],
        },
      },
    },
  },
});
