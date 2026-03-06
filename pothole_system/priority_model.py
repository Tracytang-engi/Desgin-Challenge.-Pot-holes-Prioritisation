"""Compute Pothole Severity Index and repair priority scores."""
import pandas as pd
import numpy as np


W1, W2 = 0.6, 0.4  # Weights for PSI and traffic


def compute_psi(edges: pd.DataFrame, pothole_agg: pd.DataFrame) -> pd.DataFrame:
    """PSI = sum(severity) / segment_length per road."""
    edges = edges.copy()
    merged = edges.merge(pothole_agg, on="road_id", how="left")
    merged["pothole_count"] = merged["pothole_count"].fillna(0).astype(int)
    merged["severity_sum"] = merged["severity_sum"].fillna(0)
    merged["length"] = merged.geometry.length
    merged["psi"] = np.where(
        merged["length"] > 0,
        merged["severity_sum"] / merged["length"],
        0
    )
    return merged


def compute_priority(roads_df: pd.DataFrame, traffic_df: pd.DataFrame) -> pd.DataFrame:
    """Priority = w1*PSI_norm + w2*T_norm."""
    df = roads_df.merge(traffic_df, on="road_id", how="left")
    df["traffic"] = df["traffic"].fillna(0)
    
    psi_max = df["psi"].max()
    t_max = df["traffic"].max()
    
    df["psi_norm"] = df["psi"] / psi_max if psi_max > 0 else 0
    df["t_norm"] = df["traffic"] / t_max if t_max > 0 else 0
    
    df["priority_score"] = W1 * df["psi_norm"] + W2 * df["t_norm"]
    
    if "road_name" not in df.columns:
        df["road_name"] = "Unknown"
    mask = df["road_name"].isna() | (df["road_name"] == "")
    if mask.any() and "name" in df.columns:
        df.loc[mask, "road_name"] = df.loc[mask, "name"].apply(
            lambda x: x[0] if isinstance(x, list) else (str(x) if pd.notna(x) else "Unknown")
        )
    df["road_name"] = df["road_name"].fillna("Unknown")
    
    cols = ["road_id", "road_name", "traffic", "pothole_count", "psi", "priority_score"]
    if "avg_severity" in df.columns:
        cols.append("avg_severity")
    return df[cols]


def rank_roads(priority_df: pd.DataFrame) -> pd.DataFrame:
    """Sort by priority_score descending."""
    return priority_df.sort_values("priority_score", ascending=False).reset_index(drop=True)
