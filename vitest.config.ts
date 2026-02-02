import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use no-isolate to run in the same process, avoiding fork/thread issues
    // with node:sqlite experimental flag and top-level await
    isolate: false,
  },
});
