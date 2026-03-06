import { useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import { useRoadsGeoJSON, usePotholes, useBusRoutes } from "../hooks/useApi";
import type { RoadProperties } from "../types";

const PRIORITY_COLORS: [number, string][] = [
  [0, "#d1d5db"],
  [0.2, "#fef08a"],
  [0.4, "#fdba74"],
  [0.6, "#f97316"],
  [0.8, "#dc2626"],
  [1.01, "#991b1b"],
];

function getColor(score: number): string {
  if (score <= 0) return PRIORITY_COLORS[0][1];
  for (let i = 1; i < PRIORITY_COLORS.length; i++) {
    if (score < PRIORITY_COLORS[i][0]) return PRIORITY_COLORS[i - 1][1];
  }
  return PRIORITY_COLORS[PRIORITY_COLORS.length - 1][1];
}

const potholeIcon = L.divIcon({
  className: "pothole-marker",
  html: '<div style="width:12px;height:12px;border-radius:50%;background:#dc2626;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const startIcon = L.divIcon({
  className: "route-marker",
  html: '<div style="width:24px;height:24px;border-radius:50%;background:#1d70b8;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:11px">起</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const endIcon = L.divIcon({
  className: "route-marker",
  html: '<div style="width:24px;height:24px;border-radius:50%;background:#0b0c0c;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:11px">终</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapContent({
  roadsData,
  potholes,
  busRoutes,
  selectedRoadId,
  onRoadClick,
}: {
  roadsData: { type: string; features: unknown[] } | null;
  potholes: { latitude: number; longitude: number; severity: number }[];
  busRoutes: { start: [number, number]; end: [number, number]; coordinates?: [number, number][]; route_name?: string }[];
  selectedRoadId: string | null;
  onRoadClick: (id: string | null) => void;
}) {
  const baseStyle = useCallback(() => ({ color: "#9ca3af", weight: 1, opacity: 0.8, smoothFactor: 1, className: "clickable-road" }), []);
  const overlayStrokeStyle = useCallback(
    () => ({ color: "#ffffff", weight: 14, opacity: 1, smoothFactor: 1, className: "clickable-road" }),
    []
  );
  const overlayFillStyle = useCallback(
    (f: { properties?: RoadProperties } | undefined) => {
      const p = f?.properties;
      const score = p?.priority_score ?? 0;
      const isSelected = p?.road_id === selectedRoadId;
      return {
        color: isSelected ? "#1d70b8" : getColor(score),
        weight: isSelected ? 9 : 7,
        opacity: 1,
        smoothFactor: 1,
        className: "clickable-road",
      };
    },
    [selectedRoadId]
  );

  const baseFeatures = useMemo(() => {
    if (!roadsData?.features) return null;
    return { type: "FeatureCollection" as const, features: roadsData.features };
  }, [roadsData]);

  const overlayFeatures = useMemo(() => {
    if (!roadsData?.features) return null;
    return { type: "FeatureCollection" as const, features: roadsData.features };
  }, [roadsData]);

  const onEachFeature = useCallback(
    (feature: { properties?: RoadProperties }, layer: L.Layer) => {
      const p = feature.properties;
      if (!p) return;
      layer.on({ click: () => onRoadClick(p.road_id) });
      const dataSource = p.has_bus_data ? "Bus sensor + simulated" : "Simulated estimate";
      const content = `<div style="min-width:200px"><strong>${p.road_name || "Unknown"}</strong><span style="font-size:11px;color:#6b7280;display:block;margin-top:2px">${dataSource}</span><table style="width:100%;margin-top:8px;font-size:13px"><tr><td>Traffic</td><td>${(p.traffic ?? 0).toLocaleString()}</td></tr><tr><td>Potholes</td><td>${p.pothole_count ?? 0}</td></tr><tr><td>Avg severity</td><td>${(p.avg_severity ?? 0).toFixed(2)}</td></tr><tr><td>PSI</td><td>${(p.psi ?? 0).toFixed(2)}</td></tr><tr><td>Priority</td><td>${(p.priority_score ?? 0).toFixed(4)}</td></tr></table></div>`;
      layer.bindPopup(content);
    },
    [onRoadClick]
  );

  if (!roadsData?.features?.length) {
    return (
      <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f2f1", borderRadius: 0 }}>
        No road data. Run the Python pipeline to generate dashboard_data.
      </div>
    );
  }

  const center: [number, number] = [52.475, -1.925];

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, background: "#fff", padding: "10px 14px", border: "1px solid #b1b4b6", fontSize: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Priority legend</div>
        {PRIORITY_COLORS.slice(1).map(([max, color], i) => {
          const min = PRIORITY_COLORS[i][0];
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 20, height: 4, background: color, borderRadius: 2 }} />
              <span>{min.toFixed(1)}–{max === 1.01 ? "1.0" : max.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
      <MapContainer center={center} zoom={16} minZoom={14} maxBounds={[[52.44, -1.98], [52.51, -1.86]]} style={{ height: 520, borderRadius: 0 }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <GeoJSON data={baseFeatures as GeoJSON.FeatureCollection} style={baseStyle as (f: unknown) => Record<string, unknown>} onEachFeature={onEachFeature} />
        {overlayFeatures && overlayFeatures.features.length > 0 && (
          <>
            <GeoJSON data={overlayFeatures as unknown as GeoJSON.FeatureCollection} style={overlayStrokeStyle as (f: unknown) => Record<string, unknown>} onEachFeature={onEachFeature} />
            <GeoJSON data={overlayFeatures as unknown as GeoJSON.FeatureCollection} style={overlayFillStyle as (f: unknown) => Record<string, unknown>} onEachFeature={onEachFeature} />
          </>
        )}
        {potholes.map((p, i) => (
          <Marker key={`p-${i}`} position={[p.latitude, p.longitude]} icon={potholeIcon}>
            <Popup>Severity: {p.severity.toFixed(2)}</Popup>
          </Marker>
        ))}
        {busRoutes.flatMap((r, i) => {
          const parts = [
            <Marker key={`s-${i}`} position={r.start} icon={startIcon}><Popup>Start</Popup></Marker>,
            <Marker key={`e-${i}`} position={r.end} icon={endIcon}><Popup>End</Popup></Marker>,
          ];
          if (r.coordinates && r.coordinates.length > 1) {
            parts.push(<Polyline key={`line-${i}`} positions={r.coordinates.map(([lat, lon]) => [lat, lon] as [number, number])} pathOptions={{ color: "#1d70b8", weight: 4, opacity: 0.9 }} />);
          }
          return parts;
        })}
      </MapContainer>
    </div>
  );
}

export default function MapTab() {
  const { data: roadsData, loading: roadsLoading } = useRoadsGeoJSON();
  const { data: potholes, loading: potholesLoading } = usePotholes();
  const { data: busRoutes } = useBusRoutes();
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(null);

  if (roadsLoading || potholesLoading) {
    return <div style={{ padding: "2rem" }}>Loading...</div>;
  }

  return (
    <MapContent
      roadsData={roadsData}
      potholes={potholes}
      busRoutes={busRoutes}
      selectedRoadId={selectedRoadId}
      onRoadClick={setSelectedRoadId}
    />
  );
}
