import "dotenv/config";
import express from "express";
import cors from "cors";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "dashboard_data");

// Auto-inject simulated potholes if most roads show 0 (e.g. stale data before pipeline re-run)
try {
  const r = spawnSync("node", [join(__dirname, "..", "scripts", "inject-potholes.js")], {
    cwd: join(__dirname, "..", ".."),
    stdio: "pipe",
  });
  if (r.status === 0 && r.stdout?.toString().includes("Injected")) {
    console.log("Dashboard data updated with simulated potholes.");
  }
} catch {}
const BUSMAPS_BASE = "https://capi.busmaps.com:8443";

const app = express();
app.use(cors());

function readJson(path, fallback = []) {
  const fullPath = join(DATA_DIR, path);
  if (!existsSync(fullPath)) return fallback;
  try {
    return JSON.parse(readFileSync(fullPath, "utf-8"));
  } catch {
    return fallback;
  }
}

app.get("/api/priority-roads", (req, res) => {
  const data = readJson("priority_roads.json", []);
  res.json(data);
});

app.get("/api/potholes", (req, res) => {
  const data = readJson("potholes.json", []);
  res.json(data);
});

app.get("/api/roads-geojson", (req, res) => {
  const data = readJson("roads_geojson.json", { type: "FeatureCollection", features: [] });
  res.json(data);
});

async function fetchBusRoutes() {
  const key = process.env.BUSMAPS_API_KEY;
  if (!key) return null;
  const headers = { "capi-key": `Bearer ${key}`, "capi-host": "busmaps.com" };
  try {
    let origin = "52.47,-1.93", dest = "52.48,-1.90";
    const lat = 52.47, lon = -1.93, radius = 800;
    const stopsRes = await fetch(`${BUSMAPS_BASE}/stopsInRadius?lat=${lat}&lon=${lon}&radius=${radius}`, { headers });
    if (stopsRes.ok) {
      const stopsData = await stopsRes.json();
      const stops = stopsData?.stops || stopsData?.data || [];
      if (stops.length >= 2) {
        const s1 = stops[0], s2 = stops[stops.length - 1];
        const o1 = s1.lat ?? s1.latitude ?? s1.y, o2 = s1.lon ?? s1.longitude ?? s1.x;
        const d1 = s2.lat ?? s2.latitude ?? s2.y, d2 = s2.lon ?? s2.longitude ?? s2.x;
        if (o1 != null && o2 != null && d1 != null && d2 != null) {
          origin = `${o1},${o2}`;
          dest = `${d1},${d2}`;
        }
      }
    }
    const routesRes = await fetch(`${BUSMAPS_BASE}/routes?origin=${origin}&destination=${dest}`, { headers });
    if (!routesRes.ok) return null;
    const routesData = await routesRes.json();
    const routes = routesData?.routes || routesData?.data || routesData?.trips || [];
    const result = [];
    for (const r of (Array.isArray(routes) ? routes : [routes]).slice(0, 2)) {
      const legs = r.legs || r.segments || [];
      let coords = [];
      for (const leg of legs) {
        const pts = leg.points || leg.coordinates || leg.geometry?.coordinates || [];
        for (const p of pts) {
          if (Array.isArray(p)) coords.push([p[1], p[0]]);
          else if (p.lat != null) coords.push([p.lat, p.lon ?? p.lng]);
        }
      }
      const start = coords[0] || [52.47, -1.93];
      const end = coords[coords.length - 1] || [52.48, -1.92];
      result.push({ route_id: r.route_id ?? r.id ?? "route", route_name: r.route_name ?? r.name ?? "Bus Route", start, end, coordinates: coords });
    }
    return result.length ? result : null;
  } catch {
    return null;
  }
}

function getSimulatedRoutes() {
  return [{ route_id: "sim", route_name: "Simulated Route", start: [52.46, -1.94], end: [52.49, -1.90], coordinates: [] }];
}

app.get("/api/bus-routes", async (req, res) => {
  const cachePath = join(DATA_DIR, "bus_routes.json");
  if (existsSync(cachePath)) {
    try {
      const cached = JSON.parse(readFileSync(cachePath, "utf-8"));
      if (Array.isArray(cached) && cached.length) return res.json(cached);
    } catch {}
  }
  const routes = await fetchBusRoutes();
  const data = routes || getSimulatedRoutes();
  try {
    writeFileSync(cachePath, JSON.stringify(data, null, 2));
  } catch {}
  res.json(data);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Dashboard API running at http://localhost:${PORT}`);
});
