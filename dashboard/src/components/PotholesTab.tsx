import { usePotholes } from "../hooks/useApi";

export default function PotholesTab() {
  const { data, loading } = usePotholes();

  if (loading) return <div style={{ padding: "24px" }}>Loading...</div>;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #b1b4b6",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 20px", background: "#f3f2f1", fontWeight: 700, fontSize: "16px" }}>
        Potholes ({data.length})
      </div>
      <div style={{ maxHeight: 400, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ position: "sticky", top: 0, background: "#fff" }}>
            <tr style={{ borderBottom: "1px solid #b1b4b6" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Road name</th>
              <th style={thStyle}>Latitude</th>
              <th style={thStyle}>Longitude</th>
              <th style={thStyle}>Severity</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #b1b4b6" }}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>{p.road_name || "—"}</td>
                <td style={tdStyle}>{p.latitude.toFixed(6)}</td>
                <td style={tdStyle}>{p.longitude.toFixed(6)}</td>
                <td style={tdStyle}>{p.severity.toFixed(2)}</td>
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
