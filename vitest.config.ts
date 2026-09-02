import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Tests deliberately do NOT reuse vite.config.ts.
 *
 * The app config loads the Nitro / TanStack Start SSR plugins, which resolve a
 * server build of React. Under that config a component that calls a hook gets a
 * different React instance from the one react-dom renders with, and every
 * useState throws "Cannot read properties of null". Deduping react here keeps a
 * single instance for component tests.
 *
 * Environment is per-file: pure logic runs in node, component tests opt in with
 * a `// @vitest-environment jsdom` docblock.
 */
export default defineConfig({
	plugins: [viteTsConfigPaths({ projects: ["./tsconfig.json"] }), viteReact()],
	resolve: {
		dedupe: ["react", "react-dom"],
	},
	test: {
		environment: "node",
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
		restoreMocks: true,
	},
});
