import { defineConfig } from "astro/config";

// https://astro.build/config
import react from "@astrojs/react";

// Tailwind 4 is wired in through its Vite plugin, not an Astro integration.
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
