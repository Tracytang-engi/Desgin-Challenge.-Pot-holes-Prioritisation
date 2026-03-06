# Quick Start

Get the pothole detection system and dashboard running in a few minutes.

## One-click launch (Windows)

**Double-click `quickstart.bat`** — it will:

1. Generate data (if needed)
2. Install dependencies (if needed)
3. Start the dashboard
4. Open http://localhost:5173 in your browser with data loaded

---

## Prerequisites

- **Python 3.10–3.12** (avoid 3.14 due to NumPy issues)
- **Node.js 18+** (for the dashboard)

---

## Option 1: Python only

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the pipeline
cd pothole_system
python main.py
```

Output: `priority_roads.csv`, `ladywood_map.png`, and `dashboard_data/` in the project root.

---

## Option 2: Full demo (Python + Dashboard)

```bash
# 1. Install dashboard dependencies
cd dashboard
npm install

# 2. Start (runs Python pipeline automatically if no data; first run ~1–3 min)
npm run demo

# 3. Open http://localhost:5173 in your browser
```

Or run Python first manually: `pip install -r requirements.txt && python pothole_system/main.py`

---

## Optional: Real bus routes

Create `dashboard/.env` with your [busmaps.com](https://busmaps.com/en/developers/profile#api) API key:

```
BUSMAPS_API_KEY=your_key_here
```

Without it, simulated start/end markers are used.

---

## Traffic data

Place `dft_traffic_counts_aadf.csv` (UK AADF) in the project root for real traffic volumes. Otherwise, traffic defaults to 0.
