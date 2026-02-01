import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "vmThreads",
    poolOptions: {
      vmThreads: {
        singleThread: true,
        execArgv: ["--experimental-sqlite", "--max-old-space-size=4096"],
      },
    },
    benchmark: {
      reporters: ["verbose"],
    },
  },
});
