import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // Only our unit tests — the repo's test-server/ holds pre-existing
        // jest integration specs that aren't part of this harness.
        include: ["tests/**/*.test.ts"],
        coverage: {
            provider: "v8",
            // The units we unit-test: the discovery tool builder, the
            // auto-discovery harness, and the HTTP transport. The generated
            // store/admin services + bootstrap need a live backend, so they're
            // out of scope for this gate.
            include: [
                "src/services/competitor-discovery.ts",
                "src/tools/**",
                "src/http.ts"
            ],
            reporter: ["text", "lcov"],
            thresholds: {
                lines: 90,
                functions: 90,
                branches: 75,
                statements: 90
            }
        }
    }
});
