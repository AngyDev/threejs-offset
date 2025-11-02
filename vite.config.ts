import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ command, mode }) => {
  const baseConfig = {
    plugins: [tsconfigPaths()],
    test: {
      root: "./src",
    },
  };

  if (mode === "test") {
    return baseConfig;
  }

  if (mode === "demo" || command === "serve") {
    return {
      ...baseConfig,
      root: "demo",
      build: {
        outDir: path.resolve(__dirname, "dist/demo"),
        emptyOutDir: true,
      },
      server: {
        port: 9000,
      },
    };
  }

  return {
    ...baseConfig,
    plugins: [
      ...baseConfig.plugins,
      dts({
        insertTypesEntry: true,
        rollupTypes: true,
      }),
    ],
    build: {
      lib: {
        entry: path.resolve(__dirname, "src/index.ts"),
        name: "threejsOffset",
        fileName: (format) => `index.${format}.js`,
        formats: ["es", "umd"],
      },
      rollupOptions: {
        external: ["three"],
        output: {
          globals: {
            three: "THREE",
          },
        },
      },
      outDir: path.resolve(__dirname, "dist/lib"),
      emptyOutDir: true,
    },
  };
});
