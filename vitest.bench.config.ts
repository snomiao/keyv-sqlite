import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    benchmark: {
      reporters: ["verbose"],
    },
    pool: "forks",
    poolOptions: {
      forks: {
        execArgv: ["--experimental-sqlite", "--max-old-space-size=4096"],
      },
    },
  },
});
