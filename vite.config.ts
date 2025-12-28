import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/services": path.resolve(__dirname, "./src/services"), // ✅ novo alias
    },
  },
  build: {
    outDir: "../hosting/public",
    emptyOutDir: true,
    rollupOptions: {
      input: "./index.html",
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
