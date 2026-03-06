"""Visualise road network, potholes, and priority roads."""
import matplotlib.pyplot as plt
import geopandas as gpd
import pandas as pd


def plot_map(edges: gpd.GeoDataFrame, potholes_df: pd.DataFrame,
             priority_df: pd.DataFrame, output_path: str = "ladywood_map.png"):
    """Plot Ladywood map with roads, potholes, and high-priority segments."""
    fig, ax = plt.subplots(figsize=(12, 10))
    
    # Road network (gray)
    edges.plot(ax=ax, color="gray", linewidth=0.5, alpha=0.7)
    
    # High priority roads (top 20%, thick red)
    if not priority_df.empty:
        top_n = max(1, len(priority_df) // 5)
        top_roads = priority_df.head(top_n)["road_id"].tolist()
        high_prio = edges[edges["road_id"].isin(top_roads)]
        high_prio.plot(ax=ax, color="red", linewidth=3, alpha=0.8)
    
    # Potholes (red dots)
    if not potholes_df.empty:
        potholes_gdf = gpd.GeoDataFrame(
            potholes_df,
            geometry=gpd.points_from_xy(potholes_df["longitude"], potholes_df["latitude"]),
            crs="EPSG:4326"
        ).to_crs(edges.crs)
        potholes_gdf.plot(ax=ax, color="red", markersize=20, alpha=0.8)
    
    ax.set_title("Ladywood Pothole Detection & Repair Priority")
    ax.set_axis_off()
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Map saved to {output_path}")
