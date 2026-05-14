import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  // Vercel deploys TanStack Start through Nitro. The Lovable helper's Cloudflare
  // build plugin is correct for Lovable hosting, but it produces dist/server on
  // Vercel, which leaves the deployment without Vercel route output.
  cloudflare: process.env.VERCEL === "1" ? false : undefined,
  tanstackStart: {
    server: { entry: "server" },
  },
  plugins: process.env.VERCEL === "1" ? [nitro({ preset: "vercel" })] : [],
});
