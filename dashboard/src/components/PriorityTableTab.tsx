import { useState, useMemo } from "react";
import { usePriorityRoads } from "../hooks/useApi";
import type { PriorityRoad } from "../types";

type SortKey = keyof PriorityRoad;
type SortDir = "asc" | "desc";

export default function PriorityTableTab() {
  const { data, loading } = usePriorityRoads();
  const [sortKey, setSortKey] = useState<SortKey>("priority_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp = typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else setSortKey(k);
  };

  if (loading) return <div style={{ padding: "24px" }}>Loading...</div>;

  const cols: { key: SortKey; label: string }[] = [
    { key: "road_name", label: "Road name" },
    { key: "traffic", label: "Traffic" },
    { key: "pothole_count", label: "Potholes" },
    { key: "psi", label: "PSI" },
    { key: "priority_score", label: "Priority" },
  ];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #b1b4b6",
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f2f1" }}>
              <th style={thStyle}>#</th>
              {cols.map(({ key, label }) => (
                <th
                  key={key}
                  style={{ ...thStyle, cursor: "pointer" }}
                  onClick={() => toggleSort(key)}
                >
                  {label} {sortKey === key && (sortDir === "asc" ? " ↑" : " ↓")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.road_id} style={{ borderBottom: "1px solid #b1b4b6" }}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>{r.road_name || "Unknown"}</td>
                <td style={tdStyle}>{r.traffic.toLocaleString()}</td>
                <td style={tdStyle}>{r.pothole_count}</td>
                <td style={tdStyle}>{r.psi.toFixed(2)}</td>
                <td style={tdStyle}>{r.priority_score.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "left",
  fontWeight: 700,
  fontSize: "16px",
};
const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: "16px",
};
