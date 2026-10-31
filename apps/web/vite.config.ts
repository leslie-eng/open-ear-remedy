import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "node:path";

const base = process.env.BASE_PATH || "/";
const isPreview = process.env.IS_PREVIEW ? true : false;
// https://vite.dev/config/
export default defineConfig({
  define: {
    __BASE_PATH__: JSON.stringify(base),
    __IS_PREVIEW__: JSON.stringify(isPreview),
  },
  plugins: [react()],
  base,
  build: {
    sourcemap: false,
    outDir: "out",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true },
      "/uploads": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
});
