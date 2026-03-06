import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "dashboard_data");

const FALLBACK = [{ route_id: "sim", route_name: "Simulated Route", start: [52.46, -1.94], end: [52.49, -1.90], coordinates: [] }];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const cachePath = join(DATA_DIR, "bus_routes.json");
  if (existsSync(cachePath)) {
    try {
      const cached = JSON.parse(readFileSync(cachePath, "utf-8"));
      if (Array.isArray(cached) && cached.length) return res.status(200).json(cached);
    } catch {}
  }
  // Serverless: no file write for cache
  const key = process.env.BUSMAPS_API_KEY;
  if (!key) return res.status(200).json(FALLBACK);
  try {
    const routesRes = await fetch(
      `https://capi.busmaps.com:8443/routes?origin=52.47,-1.93&destination=52.48,-1.90`,
      { headers: { "capi-key": `Bearer ${key}`, "capi-host": "busmaps.com" } }
    );
    if (!routesRes.ok) return res.status(200).json(FALLBACK);
    const routesData = await routesRes.json();
    const routes = routesData?.routes || routesData?.data || routesData?.trips || [];
    const result = (Array.isArray(routes) ? routes : [routes]).slice(0, 2).map((r) => ({
      route_id: r.route_id ?? r.id ?? "route",
      route_name: r.route_name ?? r.name ?? "Bus Route",
      start: [52.47, -1.93],
      end: [52.48, -1.92],
      coordinates: [],
    }));
    res.status(200).json(result.length ? result : FALLBACK);
  } catch {
    res.status(200).json(FALLBACK);
  }
}
