import { defineConfig } from "vitest/config";

// e2e は Playwright(*.spec.ts)で別に動かす。ここでは *.test.ts だけを対象にする。
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
