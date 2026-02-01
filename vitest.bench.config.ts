import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
        execArgv: ["--experimental-sqlite"],
      },
    },
    benchmark: {
      reporters: ["default"],
    },
  },
});
