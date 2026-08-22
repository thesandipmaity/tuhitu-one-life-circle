import { access } from "node:fs/promises";
import { pathToFileURL } from "node:url";

await access("dist/index.html");
await access("dist/server/index.js");
await access("dist/server/index.js.map");
await access("dist/supabase/schema.sql");

const workerUrl = pathToFileURL(`${process.cwd()}/dist/server/index.js`);
workerUrl.searchParams.set("validate", `${Date.now()}`);
const worker = await import(workerUrl.href);
if (!worker.default || typeof worker.default.fetch !== "function") {
  throw new Error("Server bundle must export default.fetch");
}

console.log("Validated Vite client, server bundle, and Supabase schema.");
