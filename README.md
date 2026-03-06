# Pothole Detection & Repair Prioritisation System

A Python prototype for Ladywood, Birmingham that combines bus-mounted sensor pothole detection with traffic data (AADF) to prioritise road repairs.

**[Quick Start](QUICKSTART.md)** — Get running in a few minutes.

---

## Data Sources (数据来源)

| Source | Description |
|--------|-------------|
| **OpenStreetMap (OSMnx)** | Road network for Ladywood, Birmingham. Downloaded via `osmnx.graph_from_place()`. |
| **UK AADF** | Annual Average Daily Flow traffic counts. Optional CSV (`dft_traffic_counts_aadf.csv`) with columns `aadt` or `all_motor_vehicles`. Matched to roads via nearest-neighbour. |
| **Bus Maps API** | [busmaps.com](https://busmaps.com/en/developers/profile#api) — optional real bus routes for the dashboard. Without API key, simulated start/end markers are used. |
| **Simulated bus sensor** | Pothole detection simulated along random bus trips. Vertical acceleration `a_z ~ N(0,1)` in g; pothole when \|a_z\| > 3g. |
| **Simulated road potholes** | Per-road pothole count and severity for roads without bus coverage. Poisson(λ = length/120), severity ~ U(1.0, 2.8). |

---

## Formulas (使用的公式)

### Pothole Severity (坑洞严重程度)

- **Bus sensor detection**: When vertical acceleration \|a_z\| > 3g:
  $$\text{severity} = \frac{|a_z|}{3}$$

### Pothole Severity Index (PSI)

$$\text{PSI} = \frac{\sum \text{severity}}{\text{segment length (m)}}$$

Per-road: sum of all pothole severities on that segment divided by segment length.

### Priority Score (优先级得分)

$$\text{priority\_score} = 0.6 \cdot \text{PSI}_{norm} + 0.4 \cdot T_{norm}$$

Where:
- \(\text{PSI}_{norm} = \text{PSI} / \max(\text{PSI})\)
- \(T_{norm} = \text{traffic} / \max(\text{traffic})\)

### Simulated Road Potholes (道路模拟坑洞)

- **Count**: \(\text{count} \sim \text{Poisson}(\lambda = \text{length}/120)\), capped at 12
- **Severity per pothole**: \(\text{severity} \sim \text{Uniform}(1.0, 2.8)\)
- **Average severity**: \(\text{avg\_severity} = \frac{\sum \text{severity}}{\text{pothole\_count}}\)

---

## Program Functionality (程序功能)

### Python Pipeline (`pothole_system/`)

1. **Load road network** (`osm_loader.py`) — Download Ladywood roads from OSM via OSMnx.
2. **Load traffic** (`traffic_loader.py`) — Load AADF CSV, match count points to nearest road segments.
3. **Simulate bus sensor** (`pothole_simulator.py`) — Simulate bus trips, detect potholes when acceleration exceeds threshold.
4. **Simulate road potholes** (`simulate_road_potholes.py`) — Add per-road pothole count and severity for all roads (merge with bus-detected data).
5. **Map matching** (`map_matching.py`) — Match pothole coordinates to nearest road segments (OSMnx `nearest_edges`).
6. **Priority model** (`priority_model.py`) — Compute PSI, normalise PSI and traffic, compute priority score, rank roads.
7. **Visualise** (`visualize.py`) — Generate map PNG.
8. **Export** (`export_json.py`) — Export JSON for dashboard (priority_roads, potholes, roads GeoJSON).

### Dashboard (`dashboard/`)

- **Overview** — Summary statistics.
- **Map** — Roads coloured by priority (grey → yellow → orange → red), click for details (traffic, pothole count, avg severity, PSI, priority). Data source: "Bus sensor + simulated" or "Simulated estimate".
- **Priority Roads** — Ranked table.
- **Potholes** — List of detected potholes with coordinates and severity.

---

## Setup

```bash
pip install -r requirements.txt
```

**Note:** Use Python 3.10–3.12. Python 3.14 may have NumPy compatibility issues.

## Run

From the project root:

```bash
cd pothole_system
python main.py
```

Or with a specific Python version:

```bash
py -3.11 pothole_system/main.py
```

The first run downloads the Ladywood road network from OpenStreetMap (~1–3 min).

## Output

- `priority_roads.csv` – Ranked list of roads needing repair
- `ladywood_map.png` – Map with road network, potholes, and high-priority roads
- `dashboard_data/` – JSON exports for the Dashboard (priority_roads.json, potholes.json, roads_geojson.json)

## Dashboard

A Node.js + Vite dashboard for visualising results:

1. **Generate data** (run Python pipeline first):
   ```bash
   cd pothole_system && python main.py
   ```

2. **Start the dashboard**:
   ```bash
   cd dashboard
   npm install
   npm run demo
   ```
   This starts the API server (port 3001) and Vite dev server (port 5173).

   **Optional:** Add `dashboard/.env` with `BUSMAPS_API_KEY=your_key` for real bus routes (from [busmaps.com](https://busmaps.com/en/developers/profile#api)). Without it, simulated start/end markers are used.

3. **Or run separately**:
   ```bash
   npm run server   # API only
   npm run dev     # Frontend only (proxies /api to backend)
   ```

4. Open **http://localhost:5173** in your browser.

## Traffic Data

Place `dft_traffic_counts_aadf.csv` (UK AADF dataset) in the project root, or the system runs with traffic=0 for all roads. Download from [DfT Road Traffic Statistics](https://roadtraffic.dft.gov.uk/downloads) (file exceeds GitHub limit, not included in repo).

**Why many roads show traffic=0:** UK AADF has count points only at specific locations (~46k nationwide). Each count point is matched to its *nearest* road segment. Roads without a nearby count point get traffic=0. The bbox is expanded by ~1.5 km to capture count points near Ladywood.

## Project Structure

| Module | Purpose |
|--------|---------|
| `osm_loader.py` | Download road network via OSMnx |
| `traffic_loader.py` | Load AADF data, match to roads |
| `pothole_simulator.py` | Simulate bus sensor pothole detection |
| `simulate_road_potholes.py` | Simulate per-road pothole count & severity |
| `map_matching.py` | Match potholes to road segments |
| `priority_model.py` | PSI and priority scoring |
| `visualize.py` | Map visualisation |
| `export_json.py` | Export JSON for Dashboard |
