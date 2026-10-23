import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command, isPreview }) => ({
  // Keep local development at /; build and preview exercise the real Pages path.
  base: command === "build" || isPreview ? "/CisternLab/" : "/",
  plugins: [react(), tailwindcss()],
  server: { host: "127.0.0.1", port: 4317, strictPort: true },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
}));
