import React, { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";

const BASE = "http://10.40.40.208:5003";

const socket = io(BASE, { transports: ["websocket"] });

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#F7F8FA",
  surface: "#FFFFFF",
  border: "#E4E7EC",
  borderDark: "#CDD2DA",
  text: "#111827",
  muted: "#6B7280",
  accent: "#2563EB",
  accentHover: "#1D4ED8",
  green: "#16A34A",
  greenBg: "#F0FDF4",
  purple: "#7C3AED",
  purpleBg: "#F5F3FF",
  orange: "#D97706",
  orangeBg: "#FFFBEB",
  red: "#DC2626",
  shadow: "0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06)",
  shadowLg: "0 4px 16px rgba(0,0,0,.12)",
};

const badge = (status) => {
  const map = {
    Completed: { bg: C.greenBg, color: C.green, dot: C.green },
    Started: { bg: "#EFF6FF", color: C.accent, dot: C.accent },
    Pending: { bg: C.orangeBg, color: C.orange, dot: C.orange },
  };
  const s = map[status] || { bg: "#F3F4F6", color: C.muted, dot: C.muted };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {status}
    </span>
  );
};

const Btn = ({ onClick, disabled, variant = "primary", size = "sm", children, style = {} }) => {
  const vars = {
    primary: { bg: C.accent, color: "#fff", border: C.accent },
    success: { bg: C.green, color: "#fff", border: C.green },
    danger:  { bg: C.red,   color: "#fff", border: C.red },
    purple:  { bg: C.purple,color: "#fff", border: C.purple },
    ghost:   { bg: "#fff",  color: C.text, border: C.border },
  };
  const v = vars[variant];
  const pad = size === "lg" ? "10px 22px" : size === "sm" ? "6px 14px" : "8px 18px";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: v.bg, color: v.color, border: `1px solid ${v.border}`,
        padding: pad, borderRadius: 7, fontSize: size === "lg" ? 14 : 13,
        fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1, lineHeight: 1.4,
        transition: "opacity .15s", ...style,
      }}
    >{children}</button>
  );
};

const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em" }}>
      {label}
    </label>
    <div style={{ fontSize: 14, color: C.text }}>{children}</div>
  </div>
);

const Input = ({ label, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    {label && <label style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</label>}
    <input style={{
      width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`,
      borderRadius: 7, fontSize: 14, color: C.text, background: "#fff",
      outline: "none", boxSizing: "border-box",
    }} {...props} />
  </div>
);

const Modal = ({ open, onClose, title, width = 520, children }) => {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.55)",
      display: "flex", justifyContent: "center", alignItems: "flex-start",
      zIndex: 9999, overflowY: "auto", padding: "40px 16px",
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.surface, width: "100%", maxWidth: width,
        borderRadius: 12, boxShadow: C.shadowLg, overflow: "hidden",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 24px", borderBottom: `1px solid ${C.border}`,
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>{title}</h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.muted, fontSize: 20, lineHeight: 1, padding: 4,
          }}>×</button>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ExportStuffing() {
          const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedStuff, setSelectedStuff] = useState(null);
  const [shippingBills, setShippingBills] = useState([]);
  const [actuals, setActuals] = useState({});
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [handlingType, setHandlingType] = useState("LCH");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [tallyOpen, setTallyOpen] = useState(false);
  const [tallyData, setTallyData] = useState(null);

  const getData = async () => {
    try {
      const res = await axios.get(`${BASE}/export-stuffing`);
      if (res.data.success) setRows(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const syncStuffing = async () => {
    try {
      setSyncing(true);
      const res = await axios.post(`${BASE}/sync-stuffing`);
      if (res.data.success) {
        alert(`Sync Completed\nInserted: ${res.data.data.insertedCount}`);
        getData();
      }
    } catch { alert("Sync Failed"); }
    finally { setSyncing(false); }
  };

  const startStuffing = async (id) => {
    try {
      const res = await axios.post(`${BASE}/export-stuffing/start/${id}`);
      if (res.data.success) { alert("Started Successfully"); getData(); }
    } catch (err) { alert(err?.response?.data?.message || "Failed"); }
  };

  const viewStuffing = async (row) => {
    try {
      const stuffData = typeof row.STUF_DATA === "string" ? JSON.parse(row.STUF_DATA) : row.STUF_DATA;
      const billsRes = await axios.get(`${BASE}/export-stuffing/bills/${row.CRN}`);
      setShippingBills(billsRes.data.data || []);
      setSelectedStuff(stuffData);
      setActuals({});
      setShowModal(true);
    } catch { alert("Unable to load details"); }
  };

  const viewTally = async (row) => {
    try {
      const res = await axios.get(`${BASE}/export-stuffing/tally/${row.CRN}`);
      if (!res.data.success) { alert("Unable to load tally"); return; }
      setTallyData({ bills: res.data.data.bills || [], stuffing: res.data.data.stuffing || {} });
      setTallyOpen(true);
    } catch (err) { alert(err?.response?.data?.message || "Unable to load tally"); }
  };

  const updateActualPackets = (billId, packets, totalPackets, totalWeight) => {
    const numericPackets = Number(packets || 0);
    const actualWeight = totalPackets > 0
      ? ((numericPackets / Number(totalPackets)) * Number(totalWeight)).toFixed(2) : 0;
    setActuals(prev => ({ ...prev, [billId]: { actualPackets: packets, actualWeight } }));
  };

  const saveStuffing = async () => {
    const crnDate = new Date(selectedStuff.crn_date);
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (!startDateTime) { alert("Please select Start Time"); return; }
    if (!endDateTime) { alert("Please select End Time"); return; }
    if (start < crnDate) { alert(`Start Time cannot be before CRN Date (${selectedStuff.crn_date})`); return; }
    if (end <= start) { alert("End Time must be greater than Start Time"); return; }

    const billsPayload = shippingBills.map(bill => ({
      shippingBillNo: bill.SHIPPING_BILL_NO, crn: selectedStuff.crn_number,
      containerNo: selectedStuff.container_number, containerSize: selectedStuff.container_size,
      containerType: selectedStuff.container_type, containerLifeNo: selectedStuff.container_life,
      truckNo: bill.TRUCK_NO, warehouse: bill.WAREHOUSE, gridLocation: bill.LOCATION_CODE,
      area: bill.AREA, grossWeight: Number(selectedStuff.gross_weight || 0),
      noOfPackages: Number(bill.NO_OF_PACKAGES || 0),
      packagesWeight: Number(bill.PACKAGES_WEIGHT || 0),
      actualNoOfPackages: Number(actuals[bill.ID]?.actualPackets ?? bill.NO_OF_PACKAGES),
      actualWeight: Number(actuals[bill.ID]?.actualWeight ?? bill.PACKAGES_WEIGHT),
      gwPortCode: bill.GW_PORT_CODE, chaCode: bill.CHA_CODE, chaName: bill.CHA_NAME,
      slineCode: bill.SLINE_CODE, handlingType, transType: "FCL",
      startTime: startDateTime, endTime: endDateTime,
    }));

    try {
      const res = await axios.post(`${BASE}/export-stuffing/save`, { crn: selectedStuff.crn_number, bills: billsPayload });
      if (res.data.success) {
        alert("Saved Successfully");
        setSaveModalOpen(false); setShowModal(false); getData();
      }
    } catch (err) { alert(err?.response?.data?.message || "Save Failed"); }
  };

  useEffect(() => {
    getData();
    socket.on("stuffing_sync_complete", getData);
    return () => socket.off("stuffing_sync_complete", getData);
  }, []);

  // Stats
  const pending = rows.filter(r => r.DONE_STATUS === "Pending").length;
  const started = rows.filter(r => r.DONE_STATUS === "Started").length;
  const completed = rows.filter(r => r.DONE_STATUS === "Completed").length;

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200, color: C.muted, fontSize: 15 }}>
      Loading records…
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", color: C.text }}>

      {/* ── Header ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Export Stuffing</h1>
         
        </div>
           <button
  onClick={() => navigate("/")}
  style={{
    background: "rgba(0, 0, 0, 0.93)", border: "none", color: "#fff7f7",
    padding: "6px 13px", borderRadius: 7, cursor: "pointer",
    fontWeight: 600, fontSize: 12,
  }}
>
  ← Home
</button>
        <Btn onClick={syncStuffing} disabled={syncing} variant="primary" size="lg">
          {syncing ? "⟳ Syncing…" : "↻ Sync Stuffing"}
        </Btn>
      </div>

      <div style={{ padding: "24px 28px" }}>

        {/* ── Stats bar ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total", value: rows.length, color: C.accent },
            { label: "Pending", value: pending, color: C.orange },
            { label: "In Progress", value: started, color: C.accent },
            { label: "Completed", value: completed, color: C.green },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", boxShadow: C.shadow }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Table ── */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.shadow, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["ID","CRN","Container No","Life No","Size","Type","Tare Wt","Activity","Activity Time","Shipping Line","ICD","User","Status","Action"]
                    .map(h => (
                      <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", background: C.bg, whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan="14" style={{ padding: 40, textAlign: "center", color: C.muted }}>No records found</td></tr>
                ) : rows.map((row, i) => (
                  <tr key={row.ID} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.surface : C.bg }}>
                    <td style={{ padding: "11px 14px", color: C.muted }}>{row.ID}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 600 }}>{row.CRN}</td>
                    <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 12 }}>{row.CTR_NO}</td>
                    <td style={{ padding: "11px 14px", color: C.muted, whiteSpace: "nowrap" }}>{row.CTR_LIFE_NO ? new Date(row.CTR_LIFE_NO).toLocaleDateString() : "—"}</td>
                    <td style={{ padding: "11px 14px" }}>{row.CTR_SIZE}</td>
                    <td style={{ padding: "11px 14px" }}>{row.CTR_TYPE}</td>
                    <td style={{ padding: "11px 14px" }}>{row.CTR_TARE_WT}</td>
                    <td style={{ padding: "11px 14px" }}>{row.CTR_ACTY_CD}</td>
                    <td style={{ padding: "11px 14px", color: C.muted, whiteSpace: "nowrap" }}>{row.DT_ACTY ? new Date(row.DT_ACTY).toLocaleString() : "—"}</td>
                    <td style={{ padding: "11px 14px" }}>{row.SLINE_CD}</td>
                    <td style={{ padding: "11px 14px" }}>{row.ICD_LOC_CD}</td>
                    <td style={{ padding: "11px 14px" }}>{row.USER_ID}</td>
                    <td style={{ padding: "11px 14px" }}>{badge(row.DONE_STATUS)}</td>
                    <td style={{ padding: "11px 14px" }}>
                      {row.DONE_STATUS === "Pending" && (
                        <Btn onClick={() => startStuffing(row.ID)} variant="primary">Start</Btn>
                      )}
                      {row.DONE_STATUS === "Started" && (
                        <Btn onClick={() => viewStuffing(row)} variant="success">View</Btn>
                      )}
                      {row.DONE_STATUS === "Completed" && (
                        <Btn onClick={() => viewTally(row)} variant="purple">Tally</Btn>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Stuffing Details Modal ── */}
      {showModal && selectedStuff && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 9999, overflowY: "auto", padding: "28px 16px" }}>
          <div style={{ background: C.surface, width: "100%", maxWidth: 1400, margin: "0 auto", borderRadius: 14, boxShadow: C.shadowLg, overflow: "hidden" }}>

            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 28px", borderBottom: `1px solid ${C.border}`, background: C.bg }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Stuffing Details</h2>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: C.muted }}>CRN: {selectedStuff.crn_number} · Container: {selectedStuff.container_number}</p>
              </div>
              <Btn onClick={() => setShowModal(false)} variant="ghost">✕ Close</Btn>
            </div>

            <div style={{ padding: "24px 28px" }}>

              {/* Info grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
                {[
                  ["Container No", selectedStuff.container_number],
                  ["CRN Number", selectedStuff.crn_number],
                  ["Container Size", selectedStuff.container_size],
                  ["Container Type", selectedStuff.container_type],
                  ["Container Life", selectedStuff.container_life],
                  ["Container Location", selectedStuff.container_location_code],
                  ["Shipping Line", selectedStuff.shipping_liner_code],
                  ["ICD Location", selectedStuff.icd_location_code],
                  ["Cargo Weight", selectedStuff.cargo_weight_in_crn],
                  ["Gross Weight", selectedStuff.gross_weight],
                  ["Seal Number", selectedStuff.seal_number || "—"],
                  ["Job Order", selectedStuff.stuffing_job_order || "—"],
                  ["CRN Date", selectedStuff.crn_date],
                  ["Cancel Flag", selectedStuff.cncl_flag || "—"],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
                    <Field label={label}>{value}</Field>
                  </div>
                ))}
              </div>

              {/* Shipping bills */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Shipping Bills</h3>
                <span style={{ fontSize: 13, color: C.muted }}>{shippingBills.length} bill{shippingBills.length !== 1 ? "s" : ""}</span>
              </div>

              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                        {["Shipping Bill","Truck No","Warehouse","Location","Area","GW Port","CHA Code","CHA Name","Shipping Line","Packages","Weight","Actual Packets","Actual Weight"]
                          .map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {shippingBills.length === 0 ? (
                        <tr><td colSpan="13" style={{ padding: 28, textAlign: "center", color: C.muted }}>No shipping bills found</td></tr>
                      ) : shippingBills.map((bill, i) => (
                        <tr key={bill.ID} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : C.bg }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: C.accent }}>{bill.SHIPPING_BILL_NO}</td>
                          <td style={{ padding: "10px 12px" }}>{bill.TRUCK_NO}</td>
                          <td style={{ padding: "10px 12px" }}>{bill.WAREHOUSE}</td>
                          <td style={{ padding: "10px 12px" }}>{bill.LOCATION_CODE}</td>
                          <td style={{ padding: "10px 12px" }}>{bill.AREA}</td>
                          <td style={{ padding: "10px 12px" }}>{bill.GW_PORT_CODE || "—"}</td>
                          <td style={{ padding: "10px 12px" }}>{bill.CHA_CODE || "—"}</td>
                          <td style={{ padding: "10px 12px" }}>{bill.CHA_NAME || "—"}</td>
                          <td style={{ padding: "10px 12px" }}>{bill.SLINE_CODE || "—"}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{bill.NO_OF_PACKAGES}</td>
                          <td style={{ padding: "10px 12px" }}>{bill.PACKAGES_WEIGHT}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <input
                              type="number" min="0"
                              value={actuals[bill.ID]?.actualPackets ?? String(bill.NO_OF_PACKAGES)}
                              onChange={(e) => {
                                let value = e.target.value;
                                const maxPackets = Number(bill.NO_OF_PACKAGES || 0);
                                if (value === "") { updateActualPackets(bill.ID, "", maxPackets, bill.PACKAGES_WEIGHT); return; }
                                if (Number(value) > maxPackets) value = String(maxPackets);
                                updateActualPackets(bill.ID, value, maxPackets, bill.PACKAGES_WEIGHT);
                              }}
                              style={{ width: 80, padding: "6px 8px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: "none" }}
                            />
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: C.green }}>
                            {actuals[bill.ID]?.actualWeight ?? Number(bill.PACKAGES_WEIGHT || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn onClick={() => setSaveModalOpen(true)} variant="success" size="lg">Save Stuffing →</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Save Stuffing Modal ── */}
      <Modal open={saveModalOpen} onClose={() => setSaveModalOpen(false)} title="Save Stuffing" width={480}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: "block", marginBottom: 6 }}>Handling Type</label>
            <select
              value={handlingType}
              onChange={e => setHandlingType(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 14, color: C.text, background: "#fff", outline: "none" }}
            >
              <option value="MCH">MCH – Mechanical Handling</option>
              <option value="LCH">LCH – Labour Handling</option>
            </select>
          </div>
          <Input
            label="Start Date & Time"
            type="datetime-local"
            value={startDateTime}
            min={selectedStuff?.crn_date ? new Date(selectedStuff.crn_date).toISOString().slice(0, 16) : undefined}
            onChange={e => setStartDateTime(e.target.value)}
          />
          <Input
            label="End Date & Time"
            type="datetime-local"
            value={endDateTime}
            onChange={e => setEndDateTime(e.target.value)}
          />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8 }}>
            <Btn onClick={() => setSaveModalOpen(false)} variant="ghost">Cancel</Btn>
            <Btn onClick={saveStuffing} variant="success">Confirm Save</Btn>
          </div>
        </div>
      </Modal>

      {/* ── Tally Sheet Modal ── */}
      {tallyOpen && tallyData && (() => {
        const bills = tallyData.bills || [];
        const first = bills[0] || {};
        const allSBills = [...new Set(bills.map(x => x.SHIPPING_BILL_NO))].join(", ");
        const totalPackagesDeclared = bills.reduce((s, x) => s + Number(x.NO_OF_PACKAGES || 0), 0);
        const totalActualPackages = bills.reduce((s, x) => s + Number(x.ACTUAL_NO_OF_PACKAGES || 0), 0);
        const totalActualWeight = bills.reduce((s, x) => s + Number(x.ACTUAL_WEIGHT || 0), 0);
        const totalArea = bills.reduce((s, x) => s + Number(x.AREA || 0), 0);
        const shortExcessPackages = totalPackagesDeclared - totalActualPackages;

        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 99999, overflowY: "auto", padding: "28px 16px" }}>
            <div style={{ background: C.surface, width: "100%", maxWidth: 1500, margin: "0 auto", borderRadius: 14, boxShadow: C.shadowLg, overflow: "hidden" }}>

              {/* Tally header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 28px", borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Container Stuffing Tally Sheet</h2>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: C.muted }}>
                    Cargo Handling Operator · S.No: {first.ID} · {first.CREATED_AT ? new Date(first.CREATED_AT).toLocaleDateString("en-GB") : "—"}
                  </p>
                </div>
                <Btn onClick={() => setTallyOpen(false)} variant="danger">✕ Close</Btn>
              </div>

              <div style={{ padding: "28px" }}>

                {/* Two-column summary */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
                  {[
                    [
                      ["SBill Number", allSBills],
                      ["CRN Number", first.CRN],
                      ["Container Number", first.CONTAINER_NO],
                      ["Container Size", first.CONTAINER_SIZE],
                      ["Type", first.CONTAINER_TYPE],
                      ["GW Port Code", first.GW_PORT_CODE],
                      ["CHA Code", first.CHA_CODE],
                      ["Total Packages Declared", totalPackagesDeclared],
                      ["Handling Type", first.HANDLING_TYPE],
                    ],
                    [
                      ["Total No of Containers", 1],
                      ["Sline Code", first.SLINE_CODE],
                      ["Declared Gross Weight", first.GROSS_WEIGHT],
                      ["Warehouse", first.WAREHOUSE],
                      ["Start Date & Time", first.START_TIME ? new Date(first.START_TIME).toLocaleString() : "—"],
                      ["End Date & Time", first.END_TIME ? new Date(first.END_TIME).toLocaleString() : "—"],
                      ["Excess / Short Packages", shortExcessPackages < 0 ? `${shortExcessPackages} (Short)` : shortExcessPackages > 0 ? `+${shortExcessPackages} (Excess)` : "0"],
                      ["Exporter Name", "—"],
                    ],
                  ].map((group, gi) => (
                    <div key={gi} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                      {group.map(([label, value], idx) => (
                        <div key={label} style={{
                          display: "flex", padding: "10px 16px",
                          borderBottom: idx < group.length - 1 ? `1px solid ${C.border}` : "none",
                          background: idx % 2 === 0 ? C.bg : "#fff",
                        }}>
                          <span style={{ flex: "0 0 180px", fontSize: 13, fontWeight: 600, color: C.muted }}>{label}</span>
                          <span style={{ fontSize: 13, color: C.text, fontWeight: label === "Excess / Short Packages" ? 700 : 400, color: label === "Excess / Short Packages" ? (shortExcessPackages < 0 ? C.red : shortExcessPackages > 0 ? C.orange : C.green) : C.text }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Tally table */}
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: C.text }}>
                        {["Container Number","SBILL No","Pkg Code","Cargo Description","No of Pkgs","Pkg Weight","Grid Locations","Area (SQM)"]
                          .map(h => <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap" }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((bill, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : C.bg }}>
                          <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12 }}>{bill.CONTAINER_NO}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: C.accent }}>{bill.SHIPPING_BILL_NO}</td>
                          <td style={{ padding: "10px 14px" }}>CTN</td>
                          <td style={{ padding: "10px 14px" }}>{bill.CHA_NAME || "—"}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600 }}>{bill.ACTUAL_NO_OF_PACKAGES}</td>
                          <td style={{ padding: "10px 14px" }}>{bill.ACTUAL_WEIGHT}</td>
                          <td style={{ padding: "10px 14px" }}>{bill.GRID_LOCATION}</td>
                          <td style={{ padding: "10px 14px" }}>{bill.AREA}</td>
                        </tr>
                      ))}
                      <tr style={{ background: C.text, color: "#fff", fontWeight: 700 }}>
                        <td colSpan="4" style={{ padding: "11px 14px", textAlign: "center", color: "#fff" }}>Total</td>
                        <td style={{ padding: "11px 14px", color: "#fff" }}>{totalActualPackages}</td>
                        <td style={{ padding: "11px 14px", color: "#fff" }}>{totalActualWeight.toFixed(3)}</td>
                        <td style={{ padding: "11px 14px" }}></td>
                        <td style={{ padding: "11px 14px", color: "#fff" }}>{totalArea}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 20, padding: "14px 18px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: C.muted }}>REMARKS: </span>
                  <span style={{ fontSize: 13, color: C.muted }}>—</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}