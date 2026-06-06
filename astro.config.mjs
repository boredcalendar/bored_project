import { defineConfig } from "astro/config";

// https://astro.build/config
import react from "@astrojs/react";

// Tailwind 4 is wired in through its Vite plugin, not an Astro integration.
import tailwindcss from "@tailwindcss/vite";

function getHostname(url) {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

const portlessTailscaleHost = getHostname(process.env.PORTLESS_TAILSCALE_URL);

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: portlessTailscaleHost ? [portlessTailscaleHost] : [],
    },
  },
});
