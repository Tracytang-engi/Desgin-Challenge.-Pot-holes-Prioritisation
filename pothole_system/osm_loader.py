"""Load road network from OpenStreetMap via OSMnx."""
import osmnx as ox
import geopandas as gpd
from typing import Tuple


def load_road_network(place: str = "Ladywood, Birmingham, UK") -> Tuple:
    """Download drivable road network and convert to GeoDataFrames."""
    G = ox.graph_from_place(place, network_type="drive")
    nodes, edges = ox.graph_to_gdfs(G)
    
    # Add road_id and ensure required columns
    edges = edges.reset_index()
    edges["road_id"] = edges.apply(
        lambda r: f"{r['u']}_{r['v']}_{r['key']}", axis=1
    )
    edges["length"] = edges.geometry.length
    if "highway" not in edges.columns:
        edges["highway"] = "unknown"
    elif len(edges) > 0 and isinstance(edges["highway"].iloc[0], list):
        edges["highway"] = edges["highway"].apply(
            lambda x: x[0] if isinstance(x, list) else str(x)
        )
    
    return G, nodes, edges
