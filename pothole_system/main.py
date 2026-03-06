"""
Pothole Detection & Repair Prioritisation System - Ladywood, Birmingham.
Uses bus-mounted sensors + traffic data to prioritise road repairs.
"""
import os
import sys

# Allow running from project root: python pothole_system/main.py
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from osm_loader import load_road_network
from traffic_loader import load_traffic, match_traffic_to_roads
from pothole_simulator import simulate_multiple_days
from map_matching import match_potholes_to_roads, aggregate_potholes_per_road
from simulate_road_potholes import simulate_road_potholes, merge_simulated_with_real
from priority_model import compute_psi, compute_priority, rank_roads
from visualize import plot_map
from export_json import export_for_dashboard


def run(traffic_csv: str = None, n_days: int = 7, output_dir: str = None):
    """Run full pipeline."""
    if output_dir is None:
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        output_dir = os.path.join(base, "dashboard_data")
    os.makedirs(output_dir, exist_ok=True)
    print("Loading Ladywood road network...")
    G, nodes, edges = load_road_network("Ladywood, Birmingham, UK")
    
    # Bounding box for Ladywood (filter traffic data) - use WGS84
    # Expand bbox by ~1.5km to capture AADF count points near Ladywood
    edges_wgs84 = edges.to_crs("EPSG:4326")
    minx, miny, maxx, maxy = edges_wgs84.total_bounds
    buffer = 0.015  # ~1.5 km in degrees
    bbox = (minx - buffer, miny - buffer, maxx + buffer, maxy + buffer)

    # Traffic data
    traffic_gdf = None
    traffic_per_road = None
    
    if traffic_csv and os.path.exists(traffic_csv):
        print("Loading traffic data...")
        traffic_gdf = load_traffic(traffic_csv, bbox=bbox)
        if not traffic_gdf.empty:
            traffic_per_road = match_traffic_to_roads(traffic_gdf, edges)
            n_with_traffic = (traffic_per_road["traffic"] > 0).sum()
            print(f"  {len(traffic_gdf)} count points in bbox -> {n_with_traffic} roads with traffic")
        else:
            traffic_per_road = None
    if traffic_per_road is None:
        traffic_per_road = edges[["road_id"]].drop_duplicates().copy()
        traffic_per_road["traffic"] = 0
        traffic_per_road["road_name"] = ""
    
    # Simulate pothole detection
    print("Simulating bus sensor data...")
    potholes, visited_road_ids = simulate_multiple_days(edges, n_days=n_days, trips_per_day=30)
    
    if potholes.empty:
        print("No potholes detected in simulation. Adding sample for demo.")
        potholes, visited_road_ids = simulate_multiple_days(edges, n_days=1, trips_per_day=100)
    
    print(f"Detected {len(potholes)} potholes")
    
    # Map matching
    print("Matching potholes to road segments...")
    matched = match_potholes_to_roads(potholes, G)
    pothole_agg = aggregate_potholes_per_road(matched)
    # Add simulated pothole count & severity for all roads (avg ~5, trend: traffic + age)
    sim_df = simulate_road_potholes(edges, traffic_per_road=traffic_per_road)
    pothole_agg = merge_simulated_with_real(pothole_agg, sim_df)

    # Priority model
    print("Computing priority scores...")
    roads_with_psi = compute_psi(edges, pothole_agg)
    priority_df = compute_priority(roads_with_psi, traffic_per_road)
    ranked = rank_roads(priority_df)
    
    # Filter to roads with potholes for output
    ranked_output = ranked[ranked["pothole_count"] > 0]
    if ranked_output.empty:
        ranked_output = ranked.head(20)
    
    # Export
    out_path = os.path.join(output_dir, "priority_roads.csv")
    ranked_output.to_csv(out_path, index=False)
    print(f"Results saved to {out_path}")
    
    # Visualisation
    plot_map(edges, potholes, ranked_output,
             output_path=os.path.join(output_dir, "ladywood_map.png"))

    # Export JSON for Dashboard
    export_for_dashboard(edges, ranked, potholes, output_dir, visited_road_ids, matched_potholes=matched)

    return ranked_output, potholes, edges


if __name__ == "__main__":
    # Use parent directory for traffic CSV if in pothole_system/
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    traffic_path = os.path.join(base, "dft_traffic_counts_aadf.csv")
    if not os.path.exists(traffic_path):
        traffic_path = "dft_traffic_counts_aadf.csv"
    
    ranked, potholes, edges = run(traffic_csv=traffic_path, n_days=7)
    print("\nTop 10 roads for repair:")
    print(ranked.head(10).to_string())
