import { defineConfig as defineLovableConfig } from "@lovable.dev/vite-tanstack-config";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// Vercel deploys TanStack Start through Nitro; Lovable hosting uses the
// preconfigured Cloudflare build path from @lovable.dev/vite-tanstack-config.
export default process.env.VERCEL === "1"
  ? defineConfig({
      plugins: [
        tailwindcss(),
        tsConfigPaths({ projects: ["./tsconfig.json"] }),
        tanstackStart({ server: { entry: "server" } }),
        nitro({ preset: "vercel" }),
        viteReact(),
      ],
      resolve: {
        alias: { "@": new URL("./src", import.meta.url).pathname },
        dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
      },
    })
  : defineLovableConfig({
      tanstackStart: {
        server: { entry: "server" },
      },
    });
