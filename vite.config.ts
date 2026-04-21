import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import type { Plugin } from "vite";

function prependBundleBanner() {
  return {
    name: "prepend-bundle-banner",
    writeBundle(outputOptions: {
      dir?: string;
      file?: string;
    }, bundle: Record<string, {
      type: "chunk" | "asset";
      fileName: string;
    }>) {
      const bundleBanner = `/* PolarLearn V2 */\n/* We are open source! https://github.com/polarnl/polarlearn*/\n/* Licensed under AGPL3 */\n\n`;
      const outDir = outputOptions.dir ?? (outputOptions.file ? dirname(outputOptions.file) : undefined);

      if (!outDir) {
        return;
      }

      for (const asset of Object.values(bundle)) {
        if (asset.type !== "chunk" || !asset.fileName.endsWith(".js")) {
          continue;
        }

        const filePath = resolve(outDir, asset.fileName);
        const currentCode = readFileSync(filePath, "utf8");

        if (currentCode.startsWith(bundleBanner)) {
          continue;
        }

        writeFileSync(filePath, `${bundleBanner}${currentCode}`);
      }
    },
  } as Plugin;
}

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths(), prependBundleBanner()],
  optimizeDeps: {
    exclude: [
      '@napi-rs/snappy-linux-x64-gnu',
      '@napi-rs/snappy-linux-x64-musl',
      'snappy'
    ]
  },
  build: {
    target: "esnext"
  }
});
