import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Carting from "./Carting";
import ImportDestuffing from "./Destuffing";
import GPMDelivery from "./Delivery";
import ExportStuffing from "./Stuffing";

const modules = [
  { label: "Carting",      icon: "📦", path: "/carting",  color: "#2563eb" },
  { label: "Destuffing",   icon: "📥", path: "/destuffing",     color: "#0d9488" },
  { label: "Delivery",     icon: "🚚", path: "/delivery", color: "#16a34a" },
  { label: "Stuffing",     icon: "📤", path: "/stuffing", color: "#7c3aed" },
];

function Home() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: "100vh", background: "#0f172a",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 16px", fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 style={{ color: "#fff", margin: 0, fontSize: 22, fontWeight: 800 }}>Sunic Warehouse</h1>
     
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 16, width: "100%", maxWidth: 380,
      }}>
        {modules.map(({ label, icon, path, color }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              background: "#1e293b", border: `1.5px solid #334155`,
              borderRadius: 16, padding: "28px 16px",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 12,
              cursor: "pointer", transition: "all .18s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = color + "22";
              e.currentTarget.style.borderColor = color;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "#1e293b";
              e.currentTarget.style.borderColor = "#334155";
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: color + "22", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 26,
            }}>{icon}</div>
            <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 13, textAlign: "center", lineHeight: 1.4 }}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<Home />} />
        <Route path="/carting"  element={<Carting />} />
        <Route path="/destuffing"     element={<ImportDestuffing />} />
        <Route path="/delivery" element={<GPMDelivery />} />
        <Route path="/stuffing" element={<ExportStuffing />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;