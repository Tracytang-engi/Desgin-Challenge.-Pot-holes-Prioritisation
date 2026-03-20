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
  const needRoadInject = roadsWithPotholes <= features.length * 0.5;
  if (!needRoadInject) {
    console.log("Road pothole data looks fine.");
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

  if (needRoadInject) {
    writeFileSync(geojsonPath, JSON.stringify({ type: "FeatureCollection", features: updated }, null, 2));
  }

  const priorityRoads = updated.map((f) => ({
    road_id: f.properties.road_id,
    road_name: f.properties.road_name || "Unknown",
    traffic: f.properties.traffic || 0,
    pothole_count: f.properties.pothole_count,
    psi: f.properties.psi,
    priority_score: f.properties.priority_score,
    avg_severity: f.properties.avg_severity,
  }));

  if (needRoadInject) {
    writeFileSync(join(DATA_DIR, "priority_roads.json"), JSON.stringify(priorityRoads, null, 2));
  }

  // Always generate potholes.json: avg 5/road, total >200
  const potholesPath = join(DATA_DIR, "potholes.json");
  const potholesList = [];
  const targetTotal = 250;
  for (const f of updated) {
    if (potholesList.length >= targetTotal) break;
    const p = f.properties || {};
    const count = Math.min(8, Math.max(1, p.pothole_count || 5));
    const coords = f.geometry?.coordinates || [];
    if (coords.length < 2) continue;
    const roadName = p.road_name || "Unknown";
    const avgSev = p.avg_severity || 1.9;
    for (let i = 0; i < count; i++) {
      const frac = (i + 1) / (count + 1);
      const idx = Math.min(Math.floor(frac * (coords.length - 1)), coords.length - 1);
      const [lon, lat] = coords[idx];
      const severity = Math.round((avgSev + (rand() - 0.5) * 0.6) * 100) / 100;
      potholesList.push({
        latitude: Math.round(lat * 1e6) / 1e6,
        longitude: Math.round(lon * 1e6) / 1e6,
        severity: Math.max(1, Math.min(2.8, severity)),
        timestamp: new Date().toISOString(),
        road_name: roadName,
      });
    }
  }
  writeFileSync(potholesPath, JSON.stringify(potholesList, null, 2));
  console.log(`Potholes: ${potholesList.length} total (avg ~5/road)`);
  return needRoadInject;
}

injectPotholes();
