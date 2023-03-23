import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: ["./src/index.ts"],
      formats: ["es"],
    },
    target: "node16",
    minify: false,
    rollupOptions: {
      external: ["fs", "path"],
      output: {
        minifyInternalExports: false,
      },
    },
  },
});
