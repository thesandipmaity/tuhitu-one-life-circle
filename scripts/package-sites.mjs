import { access, cp, mkdir, rm } from "node:fs/promises";
import { build as viteBuild } from "vite";

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

await rm("dist/server", { recursive: true, force: true });
await rm("dist/supabase", { recursive: true, force: true });
await mkdir("dist/server", { recursive: true });
await mkdir("dist/supabase", { recursive: true });
await viteBuild({
  configFile: false,
  logLevel: "warn",
  build: {
    outDir: "dist/server",
    emptyOutDir: true,
    target: "es2022",
    minify: false,
    sourcemap: true,
    lib: {
      entry: "worker/index.js",
      formats: ["es"],
      fileName: () => "index.js",
    },
  },
});
if (await exists("supabase")) {
  await cp("supabase/schema.sql", "dist/supabase/schema.sql");
}
