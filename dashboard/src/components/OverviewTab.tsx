import type { ReactNode } from "react";
import { usePriorityRoads } from "../hooks/useApi";
import { usePotholes } from "../hooks/useApi";

export default function OverviewTab() {
  const { data: roads, loading: roadsLoading } = usePriorityRoads();
  const { data: potholes, loading: potholesLoading } = usePotholes();

  const loading = roadsLoading || potholesLoading;
  const totalPotholes = potholes.length;
  const roadsWithPotholes = roads.filter((r) => r.pothole_count > 0).length;
  const topRoad = roads.find((r) => r.priority_score > 0);

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading...</div>;
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        <Card title="Potholes detected" value={totalPotholes} />
        <Card title="Roads needing repair" value={roadsWithPotholes} />
        <Card
          title="Highest priority road"
          value={topRoad?.road_name || "—"}
          subtitle={topRoad ? `Score: ${topRoad.priority_score.toFixed(2)}` : undefined}
        />
      </div>
      <div
        style={{
          background: "#fff",
          padding: "24px",
          border: "1px solid #b1b4b6",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "24px", fontWeight: 700 }}>About this service</h2>
        <p style={{ color: "#0b0c0c", lineHeight: 1.6, marginBottom: 24 }}>
          This system simulates bus-mounted sensors detecting potholes in Ladywood, Birmingham.
          Use the Map tab to view roads coloured by priority. Click a road to see details.
        </p>

        <h3 style={{ fontSize: "18px", fontWeight: 700, marginTop: 24, marginBottom: 12 }}>Modelling formulas</h3>

        <Section title="1. Pothole detection (IMU vertical acceleration)">
          <p><strong>Anomaly condition:</strong> |a<sub>z</sub>| &gt; a<sub>threshold</sub> ≈ 1.5g</p>
          <p><strong>Roughness index:</strong> RI = (1/N) Σ a<sub>z,i</sub>²</p>
          <p><strong>Detection confidence:</strong> C = N<sub>d</sub> / N<sub>p</sub> (detections / bus passes)</p>
        </Section>

        <Section title="2. Pothole severity estimation">
          <p>S = |a<sub>z,max</sub>| / g, or normalised: S = (|a<sub>z,max</sub>| − a<sub>min</sub>) / (a<sub>max</sub> − a<sub>min</sub>), 0 ≤ S ≤ 1</p>
        </Section>

        <Section title="3. Traffic weighting">
          <p>T = V / V<sub>max</sub> (daily traffic / network max)</p>
        </Section>

        <Section title="4. Road importance factor">
          <p>R = 1.0 (bus corridor), 0.8 (major), 0.5 (secondary), 0.3 (residential)</p>
        </Section>

        <Section title="5. Water risk factor">
          <p>W = D / D<sub>max</sub> (drainage risk indicator)</p>
        </Section>

        <Section title="6. Priority score (core)">
          <p>P = w<sub>s</sub>S + w<sub>t</sub>T + w<sub>r</sub>R + w<sub>w</sub>W</p>
          <p>Weights: w<sub>s</sub>=0.4, w<sub>t</sub>=0.3, w<sub>r</sub>=0.2, w<sub>w</sub>=0.1 (Σw<sub>i</sub>=1)</p>
        </Section>

        <Section title="7. Repair decision threshold">
          <p>P &gt; 0.8 → Immediate repair</p>
          <p>0.6 &lt; P &lt; 0.8 → Scheduled repair</p>
          <p>P &lt; 0.6 → Monitoring</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: "15px" }}>{title}</div>
      <div style={{ fontSize: "14px", color: "#0b0c0c", lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function Card({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        padding: "20px",
        border: "1px solid #b1b4b6",
      }}
    >
      <div style={{ fontSize: "14px", color: "#505a5f", marginBottom: "8px" }}>
        {title}
      </div>
      <div style={{ fontSize: "24px", fontWeight: 700 }}>{value}</div>
      {subtitle && (
        <div style={{ fontSize: "14px", color: "#505a5f", marginTop: "4px" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
