type Tab = { id: string; label: string };

export default function TabNav({
  tabs,
  active,
  onSelect,
}: {
  tabs: readonly Tab[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav
      style={{
        display: "flex",
        gap: 0,
        background: "#fff",
        borderBottom: "1px solid #b1b4b6",
        padding: "0 20px",
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          style={{
            padding: "12px 20px",
            border: "none",
            background: "transparent",
            borderBottom: active === t.id ? "4px solid #1d70b8" : "4px solid transparent",
            color: active === t.id ? "#1d70b8" : "#0b0c0c",
            cursor: "pointer",
            fontWeight: active === t.id ? 700 : 400,
            fontSize: "16px",
            marginBottom: -1,
          }}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
