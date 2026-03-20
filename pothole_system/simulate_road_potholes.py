"""Simulate pothole count and severity per road for demo/estimation."""
import numpy as np
import pandas as pd


def _age_factor(highway: str) -> float:
    """Older road types tend to have more potholes (trend, not rule)."""
    if pd.isna(highway) or highway == "unknown":
        return 1.0
    h = str(highway).lower()
    if h in ("motorway", "trunk", "primary"):
        return 0.85  # better maintained
    if h in ("residential", "service", "unclassified", "living_street"):
        return 1.15  # older / less maintained
    return 1.0


def simulate_road_potholes(edges, traffic_per_road: pd.DataFrame = None, seed=42) -> pd.DataFrame:
    """
    Generate simulated pothole count and severity for each road.
    Target average ~5 potholes. Trend: more traffic + older road types -> more potholes.
    """
    np.random.seed(seed)
    edges = edges.copy()

    traffic_by_road = {}
    if traffic_per_road is not None and not traffic_per_road.empty:
        traffic_by_road = traffic_per_road.set_index("road_id")["traffic"].to_dict()
    t_max = max(traffic_by_road.values(), default=1)

    result = []
    for _, row in edges.iterrows():
        road_id = row["road_id"]
        highway = row.get("highway", "unknown")

        # Base count: target mean ~5, range 2–10
        base = 2 + int(np.random.poisson(3))
        age_f = _age_factor(highway)
        traffic = traffic_by_road.get(road_id, 0) or 0
        traffic_f = 0.9 + 0.3 * (traffic / t_max) if t_max > 0 else 0.95  # higher traffic -> more potholes

        count = max(1, int(base * age_f * traffic_f))
        count = min(count, 15)

        severities = np.random.uniform(0.2, 0.95, count)  # 0 ≤ S ≤ 1
        severity_sum = float(severities.sum())
        avg_severity = float(severities.mean())

        result.append({
            "road_id": road_id,
            "pothole_count_sim": count,
            "severity_sum_sim": severity_sum,
            "avg_severity_sim": avg_severity,
        })
    return pd.DataFrame(result)


def merge_simulated_with_real(pothole_agg: pd.DataFrame, sim_df: pd.DataFrame) -> pd.DataFrame:
    """Merge bus-sensor data with simulated road data. Real data takes precedence where available."""
    merged = sim_df.merge(pothole_agg, on="road_id", how="left")
    merged["pothole_count"] = merged["pothole_count"].fillna(0).astype(int)
    merged["severity_sum"] = merged["severity_sum"].fillna(0)
    merged["pothole_count"] = merged["pothole_count"] + merged["pothole_count_sim"]
    merged["severity_sum"] = merged["severity_sum"] + merged["severity_sum_sim"]
    merged["avg_severity"] = np.where(
        merged["pothole_count"] > 0,
        merged["severity_sum"] / merged["pothole_count"],
        0,
    )
    return merged[["road_id", "pothole_count", "severity_sum", "avg_severity"]]
