# Local Preview

Use `portless` when the user needs to inspect a local app preview from another device.

## Start A Phone-Ready Preview

Run from the repo root:

```bash
portless bored-calendar --tailscale vp run dev
```

This starts Astro through `vp run dev`, proxies it through Portless, and prints a Tailscale URL. Use the URL printed by your local Portless process; do not commit or document private tailnet hostnames.

The app route is:

```text
<tailscale-url>/app/
```

The exact hostname and port may change. Confirm active routes with:

```bash
portless list
```

## Vite Allowed Host Gotcha

If the phone shows this error:

```text
Blocked request. This host ("<tailscale-host>") is not allowed.
```

For local preview only, add the printed Tailscale hostname to the Vite dev-server `allowedHosts` config, restart the Portless preview, and do not commit the private hostname.

Example shape:

```js
server: {
  allowedHosts: ["<tailscale-host>"],
}
```

## Browser QA From The VM

The Tailscale hostname may not resolve from inside the VM. If agent-browser cannot open the Tailscale URL, use the direct local app port printed by Portless instead:

```bash
agent-browser open http://localhost:<port>/app/
agent-browser snapshot -i
```

This still tests the same running app; the phone should use the Tailscale URL.
