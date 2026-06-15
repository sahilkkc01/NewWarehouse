import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";

const socket = io("http://10.40.40.208:5002", { transports: ["websocket"] });
const BASE = "http://10.40.40.208:5002";

const fmt = (n, d = 2) => (Number(n) || 0).toFixed(d);

/* ── Badge ── */
const Badge = ({ status }) => {
  const map = {
    Pending:   { bg: "#fff3cd", color: "#856404", border: "#ffc107" },
    Started:   { bg: "#cfe2ff", color: "#084298", border: "#0d6efd" },
    Completed: { bg: "#d1e7dd", color: "#0a3622", border: "#198754" },
  };
  const s = map[status] || map.Pending;
  return (
    <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  );
};

/* ══════════════════════ TALLY SHEET ══════════════════════ */
const TallySheet = ({ tallyData, onClose }) => {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>Tally Sheet</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; font-size: 12px; color: #000; background: #fff; padding: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #999; padding: 7px 10px; text-align: left; }
        th { background: #e9ecef; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
        td { font-size: 12px; }
        .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 40px; margin-bottom: 20px; }
        .header-row { display: flex; gap: 8px; font-size: 12px; padding: 2px 0; }
        .lbl { color: #555; min-width: 200px; }
        .val { font-weight: 600; color: #000; }
        .title-block { text-align: center; margin-bottom: 18px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .title-block h2 { font-size: 16px; font-weight: 700; }
        .title-block p { font-size: 13px; color: #333; margin-top: 3px; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; }
        tfoot td { font-weight: 700; background: #f1f3f5; }
        @media print { body { padding: 12px; } }
      </style>
      </head><body>${content}</body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const d = tallyData;
  const trucks = d.trucks || [];
const totalPkgs = trucks.reduce(
  (s, t) => s + Number(t.packets || 0),
  0
);

const totalWt = trucks.reduce(
  (s, t) => s + Number(t.weight || 0),
  0
);
  const totalArea = trucks.reduce((sum, truck) => {
  const areas = (truck.area || "")
    .split(",")
    .map(a => Number(a.trim()) || 0);

  return sum + areas.reduce((s, a) => s + a, 0);
}, 0);
  const excessShort = Number(d.totalPackagesDeclared || 0) - totalPkgs;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ background: "#f8f9fa", width: "98%", maxWidth: "1200px", maxHeight: "94vh", overflowY: "auto", borderRadius: "12px", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>

        {/* Header bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px", background: "#1a1a2e", borderRadius: "12px 12px 0 0", position: "sticky", top: 0, zIndex: 10 }}>
          <h3 style={{ color: "#fff", margin: 0, fontSize: "16px" }}>📄 Container Delivery Tally Sheet</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handlePrint} style={{ background: "#0d6efd", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}>
              🖨️ Print
            </button>
            <button onClick={onClose} style={{ background: "#dc3545", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* Tally content */}
        <div ref={printRef} style={{ padding: "28px 32px", background: "#fff", margin: "16px", borderRadius: "8px", border: "1px solid #dee2e6" }}>

          {/* Meta row */}
          <div className="meta" style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
            <div><b>S.No:</b> {d.sNo || "-"}&nbsp;&nbsp;&nbsp;<b>Date:</b> {d.tallyDate
  ? new Date(d.tallyDate).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  : "-"}</div>
           
          </div>

          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: "20px", borderBottom: "2px solid #1a1a2e", paddingBottom: "12px" }}>
            <div style={{ fontWeight: 700, fontSize: "17px", letterSpacing: "0.5px" }}>Cargo Handling Operator</div>
            <div style={{ fontSize: "14px", color: "#444", marginTop: "3px" }}>Container Delivery Tally Sheet</div>
          </div>

          {/* Info Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 48px", marginBottom: "22px" }}>
            {[
              ["GPM Number", d.gpmNo],
              ["Total No Of Trucks", d.totalTrucks],
              ["Bill Of Entry", d.boeNo],
              ["Sline Code", d.slineCode],
              ["Container Number", d.containerNo],
              ["Declared Gross Weight", d.declaredGrossWeight ? `${d.declaredGrossWeight} Tons` : "-"],
              ["Container Size", d.containerSize],
             [
  "Start Date & Time",
  d.startDateTime
    ? new Date(d.startDateTime).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "-"
],


              ["Cha Code", d.chaCode],
             [
  "End Date & Time",
  d.endDateTime
    ? new Date(d.endDateTime).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "-"
],
              ["Total No. of Packages Declared", d.totalPackagesDeclared],
              ["Excess / Short Packages", excessShort !== 0 ? excessShort : "0"],
              ["Handling Type", d.handlingType],
              ["Importer Name", d.importerName || "-"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", fontSize: "13px", padding: "3px 0", borderBottom: "1px solid #f0f0f0" }}>
                <span style={{ color: "#555", minWidth: "220px" }}>{label}</span>
                <span style={{ fontWeight: 600, color: "#000" }}>: {value || "-"}</span>
              </div>
            ))}
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#e9ecef" }}>
                {["TRUCK NUMBER", "BILL OF ENTRY NO", "PKG CODE", "CARGO DESCRIPTION (CODE)", "NO OF PKGS", "PKG WEIGHT", "GRID LOCATIONS", "AREA (SQM)"].map((h) => (
                  <th key={h} style={{ border: "1px solid #ccc", padding: "9px 12px", textAlign: "center", fontWeight: 700, fontSize: "12px", letterSpacing: "0.3px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
             {trucks.map((t, i) => (
  <tr
    key={i}
    style={{
      background: i % 2 === 0 ? "#fff" : "#f9fafb",
    }}
  >
    <td
      style={{
        border: "1px solid #ddd",
        padding: "8px 12px",
        textAlign: "center",
        fontWeight: 600,
      }}
    >
      {t.truckNo}
    </td>

    <td
      style={{
        border: "1px solid #ddd",
        padding: "8px 12px",
        textAlign: "center",
      }}
    >
      {d.boeNo}
    </td>

    <td
      style={{
        border: "1px solid #ddd",
        padding: "8px 12px",
        textAlign: "center",
      }}
    >
      {d.pkgCode || "PK"}
    </td>

    <td
      style={{
        border: "1px solid #ddd",
        padding: "8px 12px",
        textAlign: "center",
      }}
    >
      {d.commodityDesc}
    </td>

    <td
      style={{
        border: "1px solid #ddd",
        padding: "8px 12px",
        textAlign: "center",
      }}
    >
      {t.packets}
    </td>

    <td
      style={{
        border: "1px solid #ddd",
        padding: "8px 12px",
        textAlign: "center",
      }}
    >
      {t.weight}
    </td>

    <td
      style={{
        border: "1px solid #ddd",
        padding: "8px 12px",
        textAlign: "center",
        color: "#0d6efd",
        fontWeight: 500,
      }}
    >
      {t.gridLocation}
    </td>

    <td
      style={{
        border: "1px solid #ddd",
        padding: "8px 12px",
        textAlign: "center",
      }}
    >
      {t.area}
    </td>
  </tr>
))}
              {/* Empty rows to fill (like in screenshot) */}
              {Array.from({ length: Math.max(0, 6 - trucks.length) }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} style={{ border: "1px solid #ddd", padding: "8px 12px", height: "34px" }}></td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f1f3f5" }}>
                <td colSpan={4} style={{ border: "1px solid #ccc", padding: "9px 12px", fontWeight: 700, textAlign: "right" }}>Total</td>
                <td style={{ border: "1px solid #ccc", padding: "9px 12px", textAlign: "center", fontWeight: 700 }}>{totalPkgs}</td>
                <td style={{ border: "1px solid #ccc", padding: "9px 12px", textAlign: "center", fontWeight: 700 }}>{fmt(totalWt)} Tons</td>
                <td style={{ border: "1px solid #ccc", padding: "9px 12px" }}></td>
                <td style={{ border: "1px solid #ccc", padding: "9px 12px", textAlign: "center", fontWeight: 700 }}>{totalArea}</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ marginTop: "18px", fontSize: "13px" }}>
            <b>Remarks :</b>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════ SAVE CONFIRM MODAL ══════════════════════ */
const SaveConfirmModal = ({ bill, billKey, selectedDelivery, selectedRow, onConfirm, onCancel, saving }) => {
  const minDateTime = bill.bill_date
    ? new Date(bill.bill_date).toISOString().slice(0, 16)
    : "";

  const [handlingType, setHandlingType] = useState("LCH");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!startDateTime) e.start = "Start date & time is required";
    else if (minDateTime && startDateTime < minDateTime)
      e.start = `Start time cannot be before Bill Date (${new Date(bill.bill_date).toLocaleDateString("en-GB")})`;
    if (!endDateTime) e.end = "End date & time is required";
    else if (startDateTime && endDateTime <= startDateTime)
      e.end = "End time must be after start time";
    return e;
  };

  const handleConfirm = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onConfirm({ handlingType, startDateTime, endDateTime });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 99998, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ background: "#fff", width: "96%", maxWidth: "480px", borderRadius: "12px", boxShadow: "0 8px 40px rgba(0,0,0,0.25)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: "#1a1a2e", padding: "16px 22px" }}>
          <h3 style={{ color: "#fff", margin: 0, fontSize: "16px" }}>💾 Confirm Bill Save</h3>
          <div style={{ color: "#adb5bd", fontSize: "12px", marginTop: "4px" }}>
            {bill.boe_number ? `BOE: ${bill.boe_number}` : `BOL: ${bill.bol_number}`}
          </div>
        </div>

        <div style={{ padding: "22px" }}>

          {/* Bill date info */}
          {bill.bill_date && (
            <div style={{ background: "#e8f4fd", border: "1px solid #bee3f8", borderRadius: "6px", padding: "9px 14px", marginBottom: "18px", fontSize: "13px", color: "#1a5276" }}>
              ℹ️ Bill Date: <b>{new Date(bill.bill_date).toLocaleDateString("en-GB")}</b> — Start time must be on or after this date.
            </div>
          )}

          {/* Handling Type */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: "13px", color: "#333", marginBottom: "8px" }}>
              Handling Type <span style={{ color: "#dc3545" }}>*</span>
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              {["LCH", "MCH"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setHandlingType(opt)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "8px", border: "2px solid",
                    borderColor: handlingType === opt ? "#0d6efd" : "#dee2e6",
                    background: handlingType === opt ? "#e8f0fe" : "#fff",
                    color: handlingType === opt ? "#0d6efd" : "#555",
                    fontWeight: handlingType === opt ? 700 : 500,
                    cursor: "pointer", fontSize: "14px", transition: "all 0.15s",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Start DateTime */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: "13px", color: "#333", marginBottom: "6px" }}>
              Start Date & Time <span style={{ color: "#dc3545" }}>*</span>
            </label>
            <input
              type="datetime-local"
              value={startDateTime}
              min={minDateTime}
              onChange={(e) => { setStartDateTime(e.target.value); setErrors((p) => ({ ...p, start: undefined })); }}
              style={{
                width: "100%", padding: "9px 12px", border: `1.5px solid ${errors.start ? "#dc3545" : "#ced4da"}`,
                borderRadius: "7px", fontSize: "13px", outline: "none", boxSizing: "border-box",
              }}
            />
            {errors.start && <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>⚠ {errors.start}</div>}
          </div>

          {/* End DateTime */}
          <div style={{ marginBottom: "22px" }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: "13px", color: "#333", marginBottom: "6px" }}>
              End Date & Time <span style={{ color: "#dc3545" }}>*</span>
            </label>
            <input
              type="datetime-local"
              value={endDateTime}
              min={startDateTime || minDateTime}
              onChange={(e) => { setEndDateTime(e.target.value); setErrors((p) => ({ ...p, end: undefined })); }}
              style={{
                width: "100%", padding: "9px 12px", border: `1.5px solid ${errors.end ? "#dc3545" : "#ced4da"}`,
                borderRadius: "7px", fontSize: "13px", outline: "none", boxSizing: "border-box",
              }}
            />
            {errors.end && <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>⚠ {errors.end}</div>}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onCancel}
              style={{ flex: 1, padding: "10px", borderRadius: "7px", border: "1.5px solid #dee2e6", background: "#fff", color: "#555", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              style={{
                flex: 2, padding: "10px", borderRadius: "7px", border: "none",
                background: saving ? "#6c757d" : "#198754", color: "#fff",
                cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "14px",
                boxShadow: saving ? "none" : "0 2px 8px rgba(25,135,84,0.3)",
              }}
            >
              {saving ? "💾 Saving..." : "💾 Confirm & Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════ MAIN COMPONENT ══════════════════════ */
const GPMDelivery = () => {
    const navigate = useNavigate();
  const [rows, setRows]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [syncing, setSyncing]         = useState(false);
  const [lastSync, setLastSync]       = useState(null);
  const [showModal, setShowModal]     = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [bolBoeDetails, setBolBoeDetails] = useState([]);
  const [billTrucks, setBillTrucks]   = useState({});
  const [truckInputs, setTruckInputs] = useState({});
  const [savedBills, setSavedBills]   = useState({});
  const [billMode, setBillMode]       = useState({});
  const [savingBill, setSavingBill]   = useState({});

  // Save confirm modal state
  const [saveModalOpen, setSaveModalOpen]   = useState(false);
  const [saveModalBill, setSaveModalBill]   = useState(null);   // { bill, matches, billKey, totalPackages, totalWeight }

  // Tally sheet state
  const [tallyOpen, setTallyOpen]   = useState(false);
  const [tallyData, setTallyData]   = useState(null);
  const [loadingTally, setLoadingTally] = useState({});
const pendingCount   = rows.filter(r => r.DONE_STATUS === "Pending").length;
const startedCount   = rows.filter(r => r.DONE_STATUS === "Started").length;
const completedCount = rows.filter(r => r.DONE_STATUS === "Completed").length;
  /* ── fetch ── */
  const getGPMData = async () => {
    try {
      const res = await axios.get(`${BASE}/import-delivery`);
      if (res.data.success) setRows(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const syncGPM = async () => {
    try {
      setSyncing(true);
      const res = await axios.post(`${BASE}/sync-gpm`);
      if (res.data.success)
        alert(`Sync Completed\nInserted: ${res.data.data.insertedCount || 0}`);
    } catch { alert("Sync Failed"); }
    finally { setSyncing(false); }
  };

  const startDelivery = async (id) => {
    try {
      await axios.post(`${BASE}/import-delivery/start/${id}`);
      alert("Delivery Started");
      getGPMData();
    } catch { alert("Failed"); }
  };

  const viewDelivery = async (row) => {
    try {
      const data = typeof row.DEL_DATA === "string" ? JSON.parse(row.DEL_DATA) : row.DEL_DATA;
      const bolBoeNos = [];
      data.bills?.forEach((bill) => {
        if (bill.boe_number) bolBoeNos.push(bill.boe_number);
        if (bill.bol_number) bolBoeNos.push(bill.bol_number);
      });
      const detailRes = await axios.post(`${BASE}/import-delivery/bol-boe-details`, { bolBoeNos });
      setBolBoeDetails(detailRes.data.data || []);
      setSelectedDelivery(data);
      setSelectedRow(row);
      setBillTrucks({});
      setTruckInputs({});
      setSavedBills({});
      setBillMode({});
      const savedMap = {};
      const modeMap  = {};
      for (const bill of data.bills || []) {
        const key = bill.boe_number || bill.bol_number;
        if (!key) continue;
        try {
          const res = await axios.get(`${BASE}/import-delivery/saved-bills/${key}`);
          if (res.data.success && res.data.data.length > 0) {
           const grouped = {};

res.data.data.forEach((row) => {
  const truckKey = row.TRUCK_NO;

  if (!grouped[truckKey]) {
    grouped[truckKey] = {
      ...row,
      GRID_LOCATION: [],
      AREA: [],
    };
  }

  grouped[truckKey].GRID_LOCATION.push(
    row.GRID_LOCATION
  );

  grouped[truckKey].AREA.push(
    row.AREA
  );
});

savedMap[key] = Object.values(grouped).map(
  (truck) => ({
    ...truck,
    GRID_LOCATION:
      truck.GRID_LOCATION.join(", "),
    AREA:
      truck.AREA.join(", "),
  })
);
            modeMap[key]  = "view";
          } else {
            modeMap[key]  = "edit";
          }
        } catch { modeMap[key] = "edit"; }
      }
      setSavedBills(savedMap);
      setBillMode(modeMap);
      setShowModal(true);
    } catch { alert("Unable to load details"); }
  };

  useEffect(() => {
    getGPMData();
    socket.on("gpm_sync_complete", () => {
      setLastSync(new Date().toLocaleString());
      getGPMData();
    });
    return () => socket.off("gpm_sync_complete");
  }, []);

  /* ── truck helpers ── */
  const addTruck = async (billKey, totalPackages, totalWeight) => {
    const truckNo = truckInputs[billKey]?.trim();
    if (!truckNo) { alert("Enter Truck Number"); return; }
    try {
      const vRes = await axios.post(`${BASE}/validate-truck`, { truckNo });
      if (!vRes.data.success) { alert(vRes.data.message); return; }
      setBillTrucks((prev) => {
        const existing = prev[billKey] || [];
        const updated  = [...existing, { truckNo, packages: 0, weight: 0 }];
        const perTruck  = Math.floor(totalPackages / updated.length);
        const remainder = totalPackages % updated.length;
        const final = updated.map((t, i) => {
          const pkgs = i === 0 ? perTruck + remainder : perTruck;
          return { ...t, packages: pkgs, weight: totalPackages > 0 ? fmt((pkgs * totalWeight) / totalPackages) : 0 };
        });
        return { ...prev, [billKey]: final };
      });
      setTruckInputs((prev) => ({ ...prev, [billKey]: "" }));
    } catch (err) { alert(err?.response?.data?.message || "Truck Validation Failed"); }
  };

  const removeTruck = (billKey, truckIndex, totalPackages, totalWeight) => {
    setBillTrucks((prev) => {
      const trucks = [...(prev[billKey] || [])];
      trucks.splice(truckIndex, 1);
      if (trucks.length > 0) {
        const perTruck  = Math.floor(totalPackages / trucks.length);
        const remainder = totalPackages % trucks.length;
        trucks.forEach((t, i) => {
          t.packages = i === 0 ? perTruck + remainder : perTruck;
          t.weight   = totalPackages > 0 ? fmt((t.packages * totalWeight) / totalPackages) : 0;
        });
      }
      return { ...prev, [billKey]: trucks };
    });
  };

  const updateTruckPackages = (billKey, truckIndex, value, totalPackages, totalWeight) => {
    setBillTrucks((prev) => {
      const trucks  = [...(prev[billKey] || [])];
      const packets = Number(value) || 0;
      const allocated = trucks.reduce((s, t, i) => i === truckIndex ? s + packets : s + Number(t.packages || 0), 0);
      if (allocated > totalPackages) { alert(`Total packets cannot exceed ${totalPackages}`); return prev; }
      trucks[truckIndex].packages = packets;
      trucks[truckIndex].weight   = totalPackages > 0 ? fmt((packets * totalWeight) / totalPackages) : 0;
      return { ...prev, [billKey]: trucks };
    });
  };

  /* ── Open save confirm modal (instead of saving directly) ── */
  const openSaveModal = (bill, matches, billKey, totalPackages, totalWeight) => {
    const trucks = billTrucks[billKey] || [];
    if (trucks.length === 0) { alert("Add at least one truck before saving"); return; }
    setSaveModalBill({ bill, matches, billKey, totalPackages, totalWeight });
    setSaveModalOpen(true);
  };

  /* ── SAVE BILL (called from confirm modal) ── */
  const saveBill = async ({ handlingType, startDateTime, endDateTime }) => {
    const { bill, matches, billKey, totalPackages, totalWeight } = saveModalBill;
    const trucks = billTrucks[billKey] || [];

 const totalTruckCount = trucks.length;

const trucksPayload = trucks.map((truck, truckIndex) => {

  // const gridLocations = matches
  //   .map((l) => l.LOCATION_CODE)
  //   .join(", ");

  // const area = matches
  //   .map((loc) => {
  //     const a = Number(loc.AREA || 0);

  //     const base = Math.floor(
  //       a / totalTruckCount
  //     );

  //     const rem = a % totalTruckCount;

  //     return (
  //       base +
  //       (truckIndex < rem ? 1 : 0)
  //     );
  //   })
  //   .join(", ");

  const gridData = matches.map((loc) => {
  const a = Number(loc.AREA || 0);

  const base = Math.floor(
    a / totalTruckCount
  );

  const rem = a % totalTruckCount;

  return {
    gridLocation: loc.LOCATION_CODE,
    area:
      base +
      (truckIndex < rem ? 1 : 0),
  };
});

return {
  truckNo: truck.truckNo,
  packages: truck.packages,
  weight: truck.weight,
  gridData,
};
});

    const payload = {
      gpmNo: selectedDelivery.gpm_number,
      bolNo: bill.bol_number,
      boeNo: bill.boe_number,
      deliveryDate: selectedRow?.DEL_DATE,
      billDate: bill.bill_date,
      containerNo: selectedDelivery.container?.number,
      commodityDesc: bill.commodity_description,
      totalPackages,
      totalWeight,
      trucks: trucksPayload,
      handlingType,
      startDateTime,
      endDateTime,
    };

    try {
      setSavingBill((prev) => ({
  ...prev,
  [billKey]: true,
}));

const res = await axios.post(
  `${BASE}/import-delivery/save-bill`,
  payload
);

if (res.data.success) {
  setSaveModalOpen(false);
  setSaveModalBill(null);

  await viewDelivery(selectedRow);
} else {
  alert("Failed to save bill");
}
    } catch (err) {
      alert(err?.response?.data?.message || "Save Failed");
    } finally {
      setSavingBill((prev) => ({ ...prev, [billKey]: false }));
    }
  };

  /* ── View Tally ── */
  const viewTally = async (billKey) => {
    try {
      setLoadingTally((p) => ({ ...p, [billKey]: true }));
      const res = await axios.get(`${BASE}/import-delivery/tally/${billKey}`);
      console.log("Tally data:", res.data);
      if (res.data.success) {

  const data = res.data.data;

  const grouped = {};

  (data.trucks || []).forEach((row) => {

    const key = row.truckNo;

    if (!grouped[key]) {
      grouped[key] = {
        ...row,
        gridLocation: [],
        area: [],
      };
    }

    grouped[key].gridLocation.push(
      row.gridLocation
    );

    grouped[key].area.push(
      row.area
    );
  });

  data.trucks = Object.values(grouped).map(
    (truck) => ({
      ...truck,
      gridLocation:
        truck.gridLocation.join(", "),
      area:
        truck.area.join(", "),
    })
  );

  setTallyData(data);
  setTallyOpen(true);
}else {
        alert("Unable to load tally");
      }
    } catch { alert("Tally load failed"); }
    finally { setLoadingTally((p) => ({ ...p, [billKey]: false })); }
  };

  /* ══════════════════════ RENDER ══════════════════════ */
  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "24px", marginBottom: "10px" }}>⏳</div>
        <div style={{ color: "#666" }}>Loading...</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "24px", fontFamily: "'Segoe UI', sans-serif", background: "#f8f9fa", minHeight: "100vh" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", background: "#fff", padding: "16px 20px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", color: "#1a1a2e" }}>Import Delivery (GPM)</h2>
          {lastSync && <div style={{ fontSize: "12px", color: "#28a745", marginTop: "4px" }}>Last Sync: {lastSync}</div>}
        </div>
          <button
  onClick={() => navigate("/")}
  style={{
    background: "rgba(0, 0, 0, 0.93)", border: "none", color: "#fff",
    padding: "6px 13px", borderRadius: 7, cursor: "pointer",
    fontWeight: 600, fontSize: 12,
  }}
>
  ← Home
</button>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#666" }}><b style={{ color: "#333" }}>{rows.length}</b> Records</span>
          <button onClick={syncGPM} disabled={syncing} style={{ background: syncing ? "#6c757d" : "#28a745", color: "#fff", border: "none", padding: "9px 18px", borderRadius: "6px", cursor: syncing ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 500 }}>
            {syncing ? "⟳ Syncing..." : "⟳ Sync GPM"}
          </button>
        </div>
      </div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
  {[
    { label: "Total",     value: rows.length,    color: "#0d6efd" },
    { label: "Pending",   value: pendingCount,   color: "#856404" },
    { label: "Started",   value: startedCount,   color: "#084298" },
    { label: "Completed", value: completedCount, color: "#0a3622" },
  ].map(s => (
    <div key={s.label} style={{
      background: "#fff", border: "1px solid #dee2e6",
      borderRadius: 10, padding: "14px 18px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
      <div style={{ fontSize: 13, color: "#6c757d", marginTop: 2 }}>{s.label}</div>
    </div>
  ))}
</div>
      {/* ── Table ── */}
      <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#1a1a2e", color: "#fff" }}>
                {["ID","GPM No","Delivery Date","PRMS No","Container No","BOE No","GP DO No","Commodity","Pkgs","Weight","GP Status","Done Status","Action"]
                  .map((h) => (
                    <th key={h} style={{ padding: "12px 10px", textAlign: "left", whiteSpace: "nowrap", fontWeight: 600 }}>{h}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan="13" style={{ textAlign: "center", padding: "40px", color: "#999" }}>No Records Found</td></tr>
              ) : rows.map((row, ri) => (
                <tr key={row.ID} style={{ background: ri % 2 === 0 ? "#fff" : "#f8f9fa", borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "10px" }}>{row.ID}</td>
                  <td style={{ padding: "10px", fontWeight: 600, color: "#0d6efd" }}>{row.GPM_NO}</td>
                  <td style={{ padding: "10px", whiteSpace: "nowrap" }}>{row.DEL_DATE ? new Date(row.DEL_DATE).toLocaleDateString("en-GB") : ""}</td>
                  <td style={{ padding: "10px" }}>{row.PRMS_NO}</td>
                  <td style={{ padding: "10px" }}>{row.CONTAINER_NO}</td>
                  <td style={{ padding: "10px" }}>{row.BOL_BOE_NO}</td>
                  <td style={{ padding: "10px" }}>{row.GP_DO_NO}</td>
                  <td style={{ padding: "10px" }}>{row.COMM_DESC}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}>{row.NO_PKGS}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}>{row.CRG_WT}</td>
                  <td style={{ padding: "10px" }}>{row.GP_STAT}</td>
                  <td style={{ padding: "10px" }}><Badge status={row.DONE_STATUS} /></td>
                  <td style={{ padding: "10px" }}>
                    {row.DONE_STATUS === "Pending" && (
                      <button onClick={() => startDelivery(row.ID)} style={{ background: "#28a745", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: 500 }}>▶ Start</button>
                    )}
                    {row.DONE_STATUS === "Started" && (
                      <button onClick={() => viewDelivery(row)} style={{ background: "#0d6efd", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: 500 }}>👁 View</button>
                    )}
                    {row.DONE_STATUS === "Completed" && (
                      <span style={{ color: "#28a745", fontWeight: 600, fontSize: "12px" }}>✓ Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════ DELIVERY DETAILS MODAL ══════════════ */}
      {showModal && selectedDelivery && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: "#f8f9fa", width: "96%", maxWidth: "1100px", maxHeight: "92vh", overflowY: "auto", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>

            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "#1a1a2e", borderRadius: "12px 12px 0 0", position: "sticky", top: 0, zIndex: 10 }}>
              <div>
                <h2 style={{ margin: 0, color: "#fff", fontSize: "18px" }}>Delivery Details</h2>
                <div style={{ color: "#adb5bd", fontSize: "13px", marginTop: "2px" }}>GPM: {selectedDelivery.gpm_number}</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "#dc3545", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: 500 }}>✕ Close</button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Top Info Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                <InfoCard title="GPM Information" color="#0d6efd">
                  <InfoRow label="GPM Number"    value={selectedDelivery.gpm_number} />
                  <InfoRow label="Status"        value={selectedDelivery.gp_stat} />
                  <InfoRow label="Created"       value={selectedDelivery.gpm_created_date} />
                  <InfoRow label="Valid Till"    value={selectedDelivery.gpm_valid_date} />
                  <InfoRow label="Shipping Line" value={selectedDelivery.shipping_line_code} />
                  <InfoRow label="Gross Weight"  value={selectedDelivery.gross_weight} />
                  <InfoRow label="ICD Location"  value={selectedDelivery.icd_location_code} />
                </InfoCard>
                <InfoCard title="Container Details" color="#6f42c1">
                  <InfoRow label="Container No" value={selectedDelivery.container?.number} />
                  <InfoRow label="Size"         value={selectedDelivery.container?.size} />
                  <InfoRow label="Type"         value={selectedDelivery.container?.type} />
                  <InfoRow label="Life"         value={selectedDelivery.container?.life} />
                </InfoCard>
                <InfoCard title="CHA Details" color="#fd7e14">
                  <InfoRow label="Code" value={selectedDelivery.cha?.code} />
                  <InfoRow label="Name" value={selectedDelivery.cha?.name} />
                </InfoCard>
              </div>

              {/* Bills */}
              <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #dee2e6", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", background: "#198754", color: "#fff", fontWeight: 600, fontSize: "15px" }}>
                  📋 Bill Details
                </div>

                {selectedDelivery.bills?.map((bill, index) => {
                  const matches       = bolBoeDetails.filter((x) => x.BOL_BOE_NO === bill.boe_number || x.BOL_BOE_NO === bill.bol_number);
                  const billKey       = bill.boe_number || bill.bol_number;
                  const totalPackages = matches.reduce((s, r) => s + Number(r.NO_OF_PACKAGES_ACTUAL || 0), 0);
                  const totalWeight   = matches.reduce((s, r) => s + Number(r.PACKAGES_WEIGHT_ACTUAL || 0), 0);

                  return (
                    <div key={index} style={{ borderBottom: index < selectedDelivery.bills.length - 1 ? "2px solid #e9ecef" : "none" }}>

                      {/* Bill Header Row */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", background: "#f1f3f5", padding: "10px 16px", fontSize: "13px", fontWeight: 600, color: "#495057", borderBottom: "1px solid #dee2e6" }}>
                        <div>BOL No</div><div>BOE No</div><div>Bill Date</div>
                        <div>Commodity</div><div>Packages</div><div>Weight</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", padding: "10px 16px", fontSize: "13px", borderBottom: "1px solid #dee2e6" }}>
                        <div>{bill.bol_number || "-"}</div>
                        <div style={{ fontWeight: 600, color: "#0d6efd" }}>{bill.boe_number || "-"}</div>
                        <div>{bill.bill_date ? new Date(bill.bill_date).toLocaleDateString("en-GB") : "-"}</div>
                        <div>{bill.commodity_description}</div>
                        <div>{bill.no_of_packages_declared}</div>
                        <div>{bill.package_weight}</div>
                      </div>

                      {/* Grid Allocation */}
                      <div style={{ padding: "14px 16px" }}>
                        {matches.length === 0 ? (
                          <div style={{ padding: "12px", background: "#fff3cd", borderRadius: "6px", color: "#856404", fontSize: "13px" }}>
                            ⚠ No Grid Allocation Found
                          </div>
                        ) : (
                          <>
                            <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 700, color: "#0d6efd", fontSize: "14px" }}>Total Actual Packages: {totalPackages}</span>
                              <span style={{ color: "#6c757d", fontSize: "13px" }}>| Total Weight: {fmt(totalWeight)} | Total Area: {matches.reduce((s, r) => s + Number(r.AREA || 0), 0)} SQM</span>
                            </div>

                            {/* Location Cards */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
                              {matches.map((item, idx) => (
                                <div key={idx} style={{ border: "1px solid #dee2e6", borderRadius: "8px", padding: "10px 14px", background: "#f8f9fa", minWidth: "160px", fontSize: "13px" }}>
                                  <div style={{ fontWeight: 700, color: "#0d6efd", marginBottom: "4px" }}>{item.LOCATION_CODE}</div>
                                  <div style={{ color: "#495057" }}>Pkgs: <b>{item.NO_OF_PACKAGES_ACTUAL}</b></div>
                                  <div style={{ color: "#495057" }}>Wt: <b>{item.PACKAGES_WEIGHT_ACTUAL}</b></div>
                                  <div style={{ color: "#495057" }}>Area: <b>{item.AREA} SQM</b></div>
                                </div>
                              ))}
                            </div>

                            {/* Truck Assignment */}
                            <div style={{ background: "#f8f9fa", borderRadius: "8px", padding: "14px", border: "1px solid #dee2e6" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                <div style={{ fontWeight: 600, fontSize: "14px", color: "#333" }}>🚛 Truck Assignment</div>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                  {/* View Tally button — only shown when saved data exists */}
                                  {savedBills[billKey]?.length > 0 && (
                                    <button
                                      onClick={() => viewTally(billKey)}
                                      disabled={loadingTally[billKey]}
                                      style={{
                                        background: loadingTally[billKey] ? "#6c757d" : "#6f42c1",
                                        color: "#fff", border: "none", padding: "6px 14px",
                                        borderRadius: "6px", cursor: loadingTally[billKey] ? "not-allowed" : "pointer",
                                        fontSize: "13px", fontWeight: 600,
                                      }}
                                    >
                                      {loadingTally[billKey] ? "⏳ Loading..." : "📄 View Tally"}
                                    </button>
                                  )}
                                 
                                </div>
                              </div>

                              {/* VIEW MODE */}
                              {billMode[billKey] === "view" && savedBills[billKey]?.length > 0 ? (
                                <div>
                                <div
  style={{
    display: "grid",
    gridTemplateColumns:
      "180px 100px 100px 1fr 1fr",
    gap: "10px",
    padding: "10px 12px",
    background: "#e9ecef",
    fontWeight: 700,
    fontSize: "13px",
  }}
>
  <div>Truck No</div>
  <div style={{ textAlign: "center" }}>
    Packages
  </div>
  <div style={{ textAlign: "center" }}>
    Weight
  </div>
  <div>Grid Locations</div>
  <div>Area (SQM)</div>
</div>
                                {savedBills[billKey].map((s, si) => (
  <div
    key={si}
    style={{
      display: "grid",
      gridTemplateColumns:
        "180px 100px 100px 1fr 1fr",
      gap: "10px",
      padding: "10px 12px",
      background:
        si % 2 === 0
          ? "#fff"
          : "#f8fafc",
      fontSize: "13px",
      alignItems: "center",
      border: "1px solid #dee2e6",
      borderTop:
        si === 0
          ? "none"
          : "1px solid #dee2e6",
    }}
  >
    <div
      style={{
        fontWeight: 600,
        color: "#333",
      }}
    >
      🚛 {s.TRUCK_NO}
    </div>

    <div
      style={{
        textAlign: "center",
        fontWeight: 500,
      }}
    >
      {Number(s.PACKETS || 0)}
    </div>

    <div
      style={{
        textAlign: "center",
        fontWeight: 500,
      }}
    >
      {Number(s.WEIGHT || 0).toFixed(2)}
    </div>

    <div
      style={{
        color: "#0d6efd",
        fontWeight: 500,
      }}
    >
      {s.GRID_LOCATION || "-"}
    </div>

    <div
      style={{
        fontWeight: 600,
        color: "#198754",
      }}
    >
      {s.AREA || "-"} SQM
    </div>
  </div>
))}
                                </div>
                              ) : (
                                /* EDIT MODE */
                                <>
                                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                                  <input
  type="text"
  placeholder="Enter Truck Number"
  value={truckInputs[billKey] || ""}
  onChange={(e) =>
    setTruckInputs((p) => ({
      ...p,
      [billKey]: e.target.value.toUpperCase(),
    }))
  }
  style={{
    padding: "8px 12px",
    border: "1px solid #ced4da",
    borderRadius: "6px",
    fontSize: "13px",
    width: "220px",
    outline: "none",
    textTransform: "uppercase",
  }}
/>
                                    <button
                                      onClick={() => addTruck(billKey, totalPackages, totalWeight)}
                                      style={{ background: "#0d6efd", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}
                                    >+ Add Truck</button>
                                  </div>

                                  {(billTrucks[billKey] || []).length > 0 && (
                                    <>
                                      <div style={{ display: "grid", gridTemplateColumns: "160px 130px 120px 1fr 1fr 80px", gap: "8px", padding: "8px 10px", background: "#e9ecef", borderRadius: "6px 6px 0 0", fontSize: "12px", fontWeight: 700, color: "#495057" }}>
                                        <div>TRUCK NUMBER</div><div>PACKAGES</div><div>WEIGHT</div>
                                        <div>GRID LOCATIONS</div><div>AREA (SQM)</div><div></div>
                                      </div>
                                      {(billTrucks[billKey] || []).map((truck, ti) => {
                                      const locationText = matches.map(
  (loc) => loc.LOCATION_CODE
);

const totalTruckCount =
  (billTrucks[billKey] || []).length;

const areaText = matches.map((loc) => {
  const area = Number(loc.AREA || 0);

  const base = Math.floor(
    area / totalTruckCount
  );

  const remainder =
    area % totalTruckCount;

  return (
    base +
    (ti < remainder ? 1 : 0)
  );
});
                                        return (
                                          <div key={ti} style={{ display: "grid", gridTemplateColumns: "160px 130px 120px 1fr 1fr 80px", gap: "8px", padding: "8px 10px", background: ti % 2 === 0 ? "#fff" : "#f8f9fa", alignItems: "center", fontSize: "13px", border: "1px solid #dee2e6", borderTop: ti === 0 ? "none" : "1px solid #dee2e6" }}>
                                            <div style={{ fontWeight: 600, color: "#333" }}>{truck.truckNo}</div>
                                            <div>
                                              <input type="number" min="0" value={truck.packages}
                                                onChange={(e) => updateTruckPackages(billKey, ti, e.target.value, totalPackages, totalWeight)}
                                                style={{ width: "90px", padding: "5px 8px", border: "1px solid #ced4da", borderRadius: "5px", fontSize: "13px" }}
                                              />
                                            </div>
                                            <div>{truck.weight}</div>
                                            <div style={{ color: "#0d6efd", fontWeight: 500 }}>{locationText.join(", ") || "-"}</div>
                                            <div>{areaText.join(", ") || "-"}</div>
                                            <button onClick={() => removeTruck(billKey, ti, totalPackages, totalWeight)} style={{ background: "#dc3545", color: "#fff", border: "none", padding: "5px 10px", borderRadius: "5px", cursor: "pointer", fontSize: "12px" }}>Remove</button>
                                          </div>
                                        );
                                      })}
                                    </>
                                  )}

                                  {(billTrucks[billKey] || []).length > 0 && (
                                    <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                                      <button
                                        onClick={() => openSaveModal(bill, matches, billKey, totalPackages, totalWeight)}
                                        disabled={savingBill[billKey]}
                                        style={{
                                          background: savingBill[billKey] ? "#6c757d" : "#198754",
                                          color: "#fff", border: "none", padding: "10px 24px",
                                          borderRadius: "7px", cursor: savingBill[billKey] ? "not-allowed" : "pointer",
                                          fontSize: "14px", fontWeight: 600,
                                          boxShadow: "0 2px 6px rgba(25,135,84,0.3)",
                                        }}
                                      >
                                        {savingBill[billKey] ? "💾 Saving..." : "💾 Save Bill"}
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* GPM Trucks */}
              <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #dee2e6", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", background: "#6c757d", color: "#fff", fontWeight: 600, fontSize: "15px" }}>🚛 GPM Truck Details</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f1f3f5" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#495057" }}>Truck Number</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#495057" }}>Arrival Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDelivery.trucks?.map((truck, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #dee2e6" }}>
                        <td style={{ padding: "10px 16px" }}>{truck.truck_number || "-"}</td>
                        <td style={{ padding: "10px 16px" }}>{truck.truck_arrival_date || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ══ SAVE CONFIRM MODAL ══ */}
      {saveModalOpen && saveModalBill && (
        <SaveConfirmModal
          bill={saveModalBill.bill}
          billKey={saveModalBill.billKey}
          selectedDelivery={selectedDelivery}
          selectedRow={selectedRow}
          onConfirm={saveBill}
          onCancel={() => { setSaveModalOpen(false); setSaveModalBill(null); }}
          saving={savingBill[saveModalBill.billKey] || false}
        />
      )}

      {/* ══ TALLY SHEET ══ */}
      {tallyOpen && tallyData && (
        <TallySheet tallyData={tallyData} onClose={() => { setTallyOpen(false); setTallyData(null); }} />
      )}

    </div>
  );
};

/* ── Reusable components ── */
const InfoCard = ({ title, color, children }) => (
  <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #dee2e6", overflow: "hidden" }}>
    <div style={{ padding: "10px 14px", background: color, color: "#fff", fontWeight: 600, fontSize: "13px" }}>{title}</div>
    <div style={{ padding: "12px 14px", fontSize: "13px" }}>{children}</div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f3f5" }}>
    <span style={{ color: "#6c757d" }}>{label}</span>
    <span style={{ fontWeight: 500, color: "#333", textAlign: "right", maxWidth: "60%" }}>{value || "-"}</span>
  </div>
);

export default GPMDelivery;