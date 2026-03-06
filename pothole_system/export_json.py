"""Export data to JSON for Dashboard consumption."""
import json
import os
import pandas as pd
import geopandas as gpd


def _geom_to_coords(geom):
    """Convert shapely geometry to GeoJSON LineString coordinates."""
    if geom is None or geom.is_empty:
        return []
    if geom.geom_type == "LineString":
        return [[round(c[0], 6), round(c[1], 6)] for c in geom.coords]
    if geom.geom_type == "MultiLineString":
        first = next(iter(geom.geoms), None)
        return [[round(c[0], 6), round(c[1], 6)] for c in first.coords] if first else []
    return []


def _get_road_name(edges, priority_df, road_id):
    """Get road name from priority_df or edges by road_id."""
    if priority_df is not None:
        pr = priority_df[priority_df["road_id"] == road_id]
        if not pr.empty:
            rn = pr.iloc[0].get("road_name")
            if pd.notna(rn) and str(rn).strip():
                return str(rn)
    row = edges[edges["road_id"] == road_id]
    if row.empty:
        return "Unknown"
    name = row.iloc[0].get("name")
    if isinstance(name, list):
        return name[0] if name else "Unknown"
    return str(name) if pd.notna(name) else "Unknown"


def export_for_dashboard(edges, priority_df, potholes_df, output_dir: str, visited_road_ids: set = None, matched_potholes=None):
    """Export priority_roads, potholes, and roads GeoJSON for Dashboard."""
    visited_road_ids = visited_road_ids or set()
    os.makedirs(output_dir, exist_ok=True)

    # 1. priority_roads.json
    priority_list = priority_df.to_dict(orient="records")
    for r in priority_list:
        for k, v in r.items():
            if isinstance(v, (float,)) and pd.isna(v):
                r[k] = 0
            elif hasattr(v, "item"):
                r[k] = v.item() if hasattr(v, "item") else float(v)
    with open(os.path.join(output_dir, "priority_roads.json"), "w") as f:
        json.dump(priority_list, f, indent=2)

    # 2. potholes.json (use matched_potholes if available for road_name)
    potholes_export = []
    df = matched_potholes if matched_potholes is not None and not matched_potholes.empty else potholes_df
    if not df.empty:
        for _, row in df.iterrows():
            road_id = row.get("road_id")
            road_name = _get_road_name(edges, priority_df, road_id) if road_id else "Unknown"
            potholes_export.append({
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"]),
                "severity": float(row["severity"]),
                "timestamp": str(row.get("timestamp", "")),
                "road_name": road_name,
            })
    with open(os.path.join(output_dir, "potholes.json"), "w") as f:
        json.dump(potholes_export, f, indent=2)

    # 3. roads_geojson.json - merge edges with priority_df, convert to WGS84
    edges_wgs84 = edges.to_crs("EPSG:4326")
    priority_by_road = priority_df.set_index("road_id").to_dict(orient="index")

    features = []
    for _, row in edges_wgs84.iterrows():
        road_id = row["road_id"]
        geom = row.geometry
        coords = _geom_to_coords(geom)
        if not coords:
            continue

        props = priority_by_road.get(road_id, {})
        road_name = props.get("road_name", "Unknown")
        if isinstance(road_name, list):
            road_name = road_name[0] if road_name else "Unknown"
        traffic = float(props.get("traffic", 0) or 0)
        pothole_count = int(props.get("pothole_count", 0) or 0)
        psi = float(props.get("psi", 0) or 0)
        priority_score = float(props.get("priority_score", 0) or 0)
        avg_severity = float(props.get("avg_severity", 0) or 0)
        has_bus_data = road_id in visited_road_ids

        features.append({
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": coords},
            "properties": {
                "road_id": road_id,
                "road_name": str(road_name),
                "traffic": traffic,
                "pothole_count": pothole_count,
                "psi": round(psi, 2),
                "priority_score": round(priority_score, 4),
                "avg_severity": round(avg_severity, 2),
                "has_bus_data": has_bus_data,
            },
        })

    geojson = {"type": "FeatureCollection", "features": features}
    with open(os.path.join(output_dir, "roads_geojson.json"), "w") as f:
        json.dump(geojson, f, indent=2)

    print(f"Dashboard data exported to {output_dir}")
