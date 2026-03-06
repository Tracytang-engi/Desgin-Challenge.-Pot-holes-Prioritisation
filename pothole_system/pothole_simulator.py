"""Simulate bus-mounted sensor pothole detection."""
import numpy as np
import pandas as pd
import geopandas as gpd
from datetime import datetime, timedelta


THRESHOLD_G = 3.0  # Acceleration threshold in g


def simulate_bus_trip(edges_gdf, samples_per_km=50) -> tuple[pd.DataFrame, str]:
    """Simulate one bus trip: sample points along a random road, detect potholes. Returns (potholes_df, road_id)."""
    edge = edges_gdf.sample(1).iloc[0]
    road_id = edge["road_id"]
    geom = edge.geometry
    if edges_gdf.crs and edges_gdf.crs.to_epsg() != 4326:
        geom = gpd.GeoSeries([geom], crs=edges_gdf.crs).to_crs(4326).iloc[0]
    length_m = edge["length"]
    n_samples = max(10, int(length_m / 1000 * samples_per_km))
    
    potholes = []
    for i in range(n_samples):
        frac = i / (n_samples - 1) if n_samples > 1 else 0
        point = geom.interpolate(frac, normalized=True)
        lon, lat = point.x, point.y
        
        # Simulate vertical acceleration: Normal(0,1) in g
        a_z = np.random.normal(0, 1)
        if abs(a_z) > THRESHOLD_G:
            severity = abs(a_z) / THRESHOLD_G
            potholes.append({
                "latitude": lat, "longitude": lon,
                "severity": severity,
                "timestamp": datetime.now() - timedelta(days=np.random.randint(0, 30))
            })
    
    return pd.DataFrame(potholes), road_id


def simulate_multiple_days(edges_gdf, n_days=7, trips_per_day=20) -> tuple[pd.DataFrame, set]:
    """Simulate bus sensor data over multiple days. Returns (potholes_df, visited_road_ids)."""
    all_potholes = []
    visited_road_ids = set()
    for day in range(n_days):
        for _ in range(trips_per_day):
            trip_potholes, road_id = simulate_bus_trip(edges_gdf)
            visited_road_ids.add(road_id)
            trip_potholes["timestamp"] = datetime.now() - timedelta(days=day)
            all_potholes.append(trip_potholes)
    
    if not all_potholes:
        return pd.DataFrame(columns=["latitude", "longitude", "severity", "timestamp"]), visited_road_ids
    
    df = pd.concat(all_potholes, ignore_index=True)
    df["pothole_id"] = range(1, len(df) + 1)
    return df, visited_road_ids
