import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    plugins: ["react", "react-perf", "jsx-a11y", "import", "typescript", "unicorn", "oxc"],
    categories: {
      correctness: "error",
    },
    rules: {
      "no-unused-vars": "error",
      "jsx-a11y/alt-text": "error",
      "react/rules-of-hooks": "error",
      "react/exhaustive-deps": "error",
    },
  },
});
