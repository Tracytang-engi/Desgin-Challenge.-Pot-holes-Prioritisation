/**
 * Copy dashboard_data to public for static serving (Vercel + local dev).
 * Runs inject-potholes first if data looks stale.
 */
import { cpSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const SRC = join(ROOT, "dashboard_data");
const DST = join(ROOT, "dashboard", "public", "dashboard_data");

if (!existsSync(SRC)) {
  console.warn("dashboard_data not found. Run Python pipeline first.");
  process.exit(0);
}

// Fix stale data (most roads show 0)
spawnSync("node", [join(ROOT, "dashboard", "scripts", "inject-potholes.js")], {
  cwd: ROOT,
  stdio: "pipe",
});

mkdirSync(DST, { recursive: true });
cpSync(SRC, DST, { recursive: true });
console.log("Copied dashboard_data to public/");
