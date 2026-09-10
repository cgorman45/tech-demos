/**
 * MapLibre v6 loads its web worker via `new URL("./maplibre-gl-worker.mjs",
 * import.meta.url)`, which bundlers (Turbopack included) can't resolve from
 * the pre-built dist file — the request 404s and the map renders nothing.
 * Copy the worker (and the shared chunk it imports) into public/ so we can
 * point `setWorkerUrl` at a real URL. Runs automatically before dev/build.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "node_modules", "maplibre-gl", "dist");
const pub = join(root, "public");

mkdirSync(pub, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(dist, file), join(pub, file));
}
console.log("synced maplibre worker files to public/");
