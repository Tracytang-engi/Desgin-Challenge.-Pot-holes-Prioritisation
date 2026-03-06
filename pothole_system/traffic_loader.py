"""Load AADF traffic data and match to road segments."""
import pandas as pd
import geopandas as gpd
from geopandas.tools import sjoin_nearest


def load_traffic(csv_path: str, bbox=None) -> gpd.GeoDataFrame:
    """Load traffic CSV and convert to GeoDataFrame."""
    df = pd.read_csv(csv_path)
    
    # Handle different CSV formats (simple vs DFT full)
    if "aadt" in df.columns:
        aadt_col = "aadt"
    elif "all_motor_vehicles" in df.columns:
        aadt_col = "all_motor_vehicles"
        df = df[df["year"] == df["year"].max()]
        df = df.groupby(["count_point_id", "latitude", "longitude", "road_name"]).agg(
            {aadt_col: "max"}
        ).reset_index()
    else:
        raise ValueError("CSV must have 'aadt' or 'all_motor_vehicles' column")
    
    gdf = gpd.GeoDataFrame(
        df,
        geometry=gpd.points_from_xy(df["longitude"], df["latitude"]),
        crs="EPSG:4326"
    )
    
    if bbox is not None:
        minx, miny, maxx, maxy = bbox
        gdf = gdf.cx[minx:maxx, miny:maxy]
    
    gdf["aadt"] = gdf[aadt_col].astype(float)
    return gdf[["count_point_id", "road_name", "aadt", "geometry"]]


def match_traffic_to_roads(traffic_gdf: gpd.GeoDataFrame, 
                          edges: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Assign traffic volume to road segments via nearest neighbour."""
    # Use projected CRS for accurate sjoin_nearest (avoids geographic CRS warning)
    crs = edges.crs if edges.crs and not edges.crs.is_geographic else "EPSG:32630"
    traffic_proj = traffic_gdf.to_crs(crs)
    edges_proj = edges.to_crs(crs) if edges.crs != crs else edges
    nearest = sjoin_nearest(traffic_proj, edges_proj[["road_id", "geometry"]], 
                           how="left", distance_col="dist")
    traffic_per_road = nearest.groupby("road_id").agg(
        traffic=("aadt", "sum"),
        road_name=("road_name", "first")
    ).reset_index()
    return traffic_per_road
