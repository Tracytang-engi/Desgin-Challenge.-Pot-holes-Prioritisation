import { useState } from "react";
import TabNav from "./components/TabNav";
import OverviewTab from "./components/OverviewTab";
import PriorityTableTab from "./components/PriorityTableTab";
import MapTab from "./components/MapTab";
import PotholesTab from "./components/PotholesTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "map", label: "Map" },
  { id: "roads", label: "Priority roads" },
  { id: "potholes", label: "Potholes" },
] as const;

export default function App() {
  const [active, setActive] = useState<string>("overview");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header
        style={{
          background: "#0b0c0c",
          color: "#fff",
          padding: "12px 20px",
          borderBottom: "4px solid #1d70b8",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700 }}>
          Pothole detection and repair prioritisation
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: "16px", opacity: 0.9 }}>
          Ladywood, Birmingham — Bus-mounted sensor data and traffic (AADF)
        </p>
      </header>
      <TabNav tabs={TABS} active={active} onSelect={setActive} />
      <main style={{ flex: 1, padding: "24px 30px", overflow: "auto", background: "#f3f2f1" }}>
        {active === "overview" && <OverviewTab />}
        {active === "map" && <MapTab />}
        {active === "roads" && <PriorityTableTab />}
        {active === "potholes" && <PotholesTab />}
      </main>
    </div>
  );
}
