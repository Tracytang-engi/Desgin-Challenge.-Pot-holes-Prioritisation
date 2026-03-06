/**
 * Ensure dashboard_data exists before starting. Runs Python pipeline if needed.
 */
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(ROOT, "dashboard_data");
const GEO_PATH = join(DATA_DIR, "roads_geojson.json");

function hasValidData() {
  if (!existsSync(GEO_PATH)) return false;
  try {
    const data = JSON.parse(readFileSync(GEO_PATH, "utf-8"));
    return data?.features?.length > 0;
  } catch {
    return false;
  }
}

if (hasValidData()) {
  console.log("Dashboard data found.");
  process.exit(0);
}

console.log("No dashboard data. Running Python pipeline... (first run may take 1-3 min)");
const pip = spawnSync("pip", ["install", "-q", "-r", "requirements.txt"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
});
if (pip.status !== 0) {
  console.warn("pip install failed, trying anyway...");
}

let py = spawnSync("python", ["pothole_system/main.py"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
});
if (py.status !== 0) {
  py = spawnSync("py", ["-3.11", "pothole_system/main.py"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });
}
if (py.status !== 0) {
  console.warn("Python pipeline failed. Using existing data if any.");
}

process.exit(0);
