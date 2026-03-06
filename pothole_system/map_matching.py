"""Map match pothole coordinates to road segments."""
import numpy as np
import osmnx as ox
import pandas as pd


def match_potholes_to_roads(potholes_df: pd.DataFrame, G) -> pd.DataFrame:
    """Match each pothole to nearest road segment using OSMnx."""
    if potholes_df.empty:
        return pd.DataFrame(columns=["pothole_id", "u", "v", "key", "road_id", "severity"])
    
    lons = potholes_df["longitude"].values
    lats = potholes_df["latitude"].values
    
    nearest = ox.distance.nearest_edges(G, lons, lats)
    # OSMnx returns array of (u,v,key) for multiple points, or (u,v,key) for single
    if isinstance(nearest, tuple) and len(nearest) == 3:
        u = np.array([nearest[0]])
        v = np.array([nearest[1]])
        key = np.array([nearest[2]])
    else:
        u = np.array([e[0] for e in nearest])
        v = np.array([e[1] for e in nearest])
        key = np.array([e[2] for e in nearest])
    
    result = potholes_df.copy()
    result["u"] = u
    result["v"] = v
    result["key"] = key
    result["road_id"] = [f"{a}_{b}_{c}" for a, b, c in zip(u, v, key)]
    
    return result


def aggregate_potholes_per_road(matched_df: pd.DataFrame) -> pd.DataFrame:
    """Count potholes and sum severity per road segment."""
    if matched_df.empty:
        return pd.DataFrame(columns=["road_id", "pothole_count", "severity_sum"])
    
    agg = matched_df.groupby("road_id").agg(
        pothole_count=("severity", "count"),
        severity_sum=("severity", "sum")
    ).reset_index()
    return agg
