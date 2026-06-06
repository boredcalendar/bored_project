import { readFileSync } from "node:fs";

import { defineConfig } from "astro/config";

// https://astro.build/config
import react from "@astrojs/react";

// Tailwind 4 is wired in through its Vite plugin, not an Astro integration.
import tailwindcss from "@tailwindcss/vite";

// Jazz sync PoC (issue #22). The plugin handles WASM/worker bundling and, in
// dev, can register the schema with the sync server using the admin secret.
import { jazzPlugin } from "jazz-tools/dev/vite";

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

// Read .env into a plain object so build-time tooling (the Jazz plugin) can see
// the unprefixed admin secret. We parse the file directly rather than import
// Vite's loadEnv, which isn't a direct dependency. The file is absent in CI,
// which is fine: the plugin still applies its build wiring (worker format / ssr
// externals) and simply skips schema registration when no secret is present.
function readDotEnv() {
  const merged = { ...process.env };
  try {
    for (const line of readFileSync(new URL("./.env", import.meta.url), "utf8").split("\n")) {
      const match = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/.exec(line);
      if (match && !line.trimStart().startsWith("#")) {
        merged[match[1]] = (match[2] ?? "").replace(/^["']|["']$/g, "").trim();
      }
    }
  } catch {
    // No .env (e.g. CI) — fall back to process.env only.
  }
  return merged;
}

const env = readDotEnv();

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [
      tailwindcss(),
      jazzPlugin({
        appId: env.PUBLIC_JAZZ_APP_ID,
        adminSecret: env.JAZZ_ADMIN_SECRET,
        schemaDir: "src/lib/jazz",
      }),
    ],
    server: {
      allowedHosts: portlessTailscaleHost ? [portlessTailscaleHost] : [],
    },
  },
});
