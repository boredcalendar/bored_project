import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    plugins: ["react", "react-perf", "jsx-a11y", "import", "typescript", "unicorn", "oxc"],
    categories: {
      correctness: "warn",
    },
    rules: {
      "no-unused-vars": "warn",
      "jsx-a11y/alt-text": "warn",
      "react/rules-of-hooks": "warn",
      "react/exhaustive-deps": "warn",
    },
  },
});
