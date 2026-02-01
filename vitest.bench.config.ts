import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "vmThreads",
    poolOptions: {
      vmThreads: {
        singleThread: true,
        execArgv: ["--experimental-sqlite"],
      },
    },
    benchmark: {
      reporters: ["verbose"],
    },
  },
});
