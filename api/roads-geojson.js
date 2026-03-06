import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "dashboard_data");

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const path = join(DATA_DIR, "roads_geojson.json");
  if (!existsSync(path)) return res.status(200).json({ type: "FeatureCollection", features: [] });
  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    res.status(200).json(data);
  } catch {
    res.status(200).json({ type: "FeatureCollection", features: [] });
  }
}
