import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  minify: true,
  treeshake: true,
  clean: true,
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".js" : ".cjs",
      dts: format === "esm" ? ".d.ts" : ".d.cts",
    };
  },
});
