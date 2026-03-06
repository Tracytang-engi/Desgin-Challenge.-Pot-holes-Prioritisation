/**
 * Inject simulated pothole counts into dashboard data when most roads show 0.
 * Run when Python pipeline hasn't been re-run after simulate_road_potholes changes.
 * Usage: node dashboard/scripts/inject-potholes.js
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "dashboard_data");

function haversineLengthM(coords) {
  const R = 6371000; // m
  let len = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    len += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return len;
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function injectPotholes() {
  const geojsonPath = join(DATA_DIR, "roads_geojson.json");
  if (!existsSync(geojsonPath)) {
    console.log("No roads_geojson.json found. Run Python pipeline first.");
    return false;
  }

  const geojson = JSON.parse(readFileSync(geojsonPath, "utf-8"));
  const features = geojson.features || [];
  if (features.length === 0) return false;

  const roadsWithPotholes = features.filter((f) => (f.properties?.pothole_count || 0) > 0).length;
  if (roadsWithPotholes > features.length * 0.5) {
    console.log("Pothole data looks fine. No injection needed.");
    return false;
  }

  const tMax = Math.max(1, ...features.map((f) => f.properties?.traffic || 0));
  const rand = seededRandom(42);

  let psiMax = 0;
  const updated = features.map((f) => {
    const p = f.properties || {};
    let potholeCount = p.pothole_count || 0;
    let avgSeverity = p.avg_severity || 0;
    let severitySum = 0;

    if (potholeCount === 0) {
      const traffic = p.traffic || 0;
      const trafficF = tMax > 0 ? 0.9 + 0.3 * (traffic / tMax) : 0.95;
      const base = 2 + Math.floor(3 * rand());
      potholeCount = Math.max(1, Math.min(15, Math.round(base * trafficF)));
      avgSeverity = 1.2 + 1.4 * rand();
      severitySum = potholeCount * avgSeverity;
    } else {
      severitySum = potholeCount * (p.avg_severity || 1.8);
    }

    const coords = f.geometry?.coordinates || [];
    const lengthM = coords.length > 1 ? haversineLengthM(coords) : 50;
    const psi = lengthM > 0 ? severitySum / lengthM : 0;
    psiMax = Math.max(psiMax, psi);

    return {
      ...f,
      properties: {
        ...p,
        pothole_count: potholeCount,
        avg_severity: Math.round(avgSeverity * 100) / 100,
        psi: Math.round(psi * 100) / 100,
      },
    };
  });

  const tMaxFinal = Math.max(1, ...updated.map((f) => f.properties.traffic || 0));
  updated.forEach((f) => {
    const p = f.properties;
    const psiNorm = psiMax > 0 ? p.psi / psiMax : 0;
    const tNorm = tMaxFinal > 0 ? (p.traffic || 0) / tMaxFinal : 0;
    p.priority_score = Math.round((0.6 * psiNorm + 0.4 * tNorm) * 10000) / 10000;
  });

  updated.sort((a, b) => (b.properties.priority_score || 0) - (a.properties.priority_score || 0));

  writeFileSync(geojsonPath, JSON.stringify({ type: "FeatureCollection", features: updated }, null, 2));

  const priorityRoads = updated.map((f) => ({
    road_id: f.properties.road_id,
    road_name: f.properties.road_name || "Unknown",
    traffic: f.properties.traffic || 0,
    pothole_count: f.properties.pothole_count,
    psi: f.properties.psi,
    priority_score: f.properties.priority_score,
    avg_severity: f.properties.avg_severity,
  }));

  writeFileSync(join(DATA_DIR, "priority_roads.json"), JSON.stringify(priorityRoads, null, 2));

  // Enrich potholes.json with road_name (nearest road)
  const potholesPath = join(DATA_DIR, "potholes.json");
  if (existsSync(potholesPath)) {
    try {
      const potholes = JSON.parse(readFileSync(potholesPath, "utf-8"));
      const enriched = potholes.map((p) => {
        if (p.road_name) return p;
        let best = null;
        let bestD = Infinity;
        for (const f of updated) {
          const coords = f.geometry?.coordinates || [];
          for (const [lon, lat] of coords) {
            const d = (p.latitude - lat) ** 2 + (p.longitude - lon) ** 2;
            if (d < bestD) {
              bestD = d;
              best = f.properties?.road_name || "Unknown";
            }
          }
        }
        return { ...p, road_name: best || "—" };
      });
      writeFileSync(potholesPath, JSON.stringify(enriched, null, 2));
    } catch {}
  }

  console.log(`Injected potholes: ${updated.filter((f) => f.properties.pothole_count > 0).length} roads now have data`);
  return true;
}

injectPotholes();
