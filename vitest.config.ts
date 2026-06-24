import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // Only our unit tests — the repo's test-server/ holds pre-existing
        // jest integration specs that aren't part of this harness.
        include: ["tests/**/*.test.ts"]
    }
});
