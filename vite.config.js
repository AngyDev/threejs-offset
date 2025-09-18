import { defineConfig } from "vite"
import path from "path"

export default defineConfig(({ command, mode }) => {
  if (mode === "demo" || command === "serve") {
    return {
      root: "demo",
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "src"),
        },
      },
      build: {
        outDir: path.resolve(__dirname, "dist/demo"),
        emptyOutDir: true,
      },
      server: {
        port: 9000,
      },
    }
  } else {
    return {
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "src"),
        },
      },
      build: {
        lib: {
          entry: path.resolve(__dirname, "src/index.js"),
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
    }
  }
})
