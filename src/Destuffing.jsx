import React, { useEffect, useState, useRef, useCallback } from "react";
  import axios from "axios";
  import { MapModal, MapAreaModal } from "./maps/MapModal";
  import { useNavigate } from "react-router-dom";

  const BASE = "http://10.40.40.208:5001";

  /* ─────────────────── Design Tokens ─────────────────── */
  const C = {
    navy:      "#0f172a",
    navyMid:   "#1e293b",
    slate:     "#334155",
    muted:     "#64748b",
    subtle:    "#94a3b8",
    border:    "#e2e8f0",
    bg:        "#f1f5f9",
    bgCard:    "#ffffff",
    blue:      "#2563eb",
    blueSoft:  "#eff6ff",
    green:     "#16a34a",
    greenSoft: "#f0fdf4",
    amber:     "#d97706",
    amberSoft: "#fffbeb",
    red:       "#dc2626",
    redSoft:   "#fef2f2",
    cyan:      "#0891b2",
    purple:    "#7c3aed",
    teal:      "#0d9488",
  };

  const S = {
    btn: (bg, size = "md") => ({
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: size === "sm" ? "4px 10px" : size === "lg" ? "10px 22px" : "7px 14px",
      border: "none", background: bg, color: "#fff", cursor: "pointer",
      borderRadius: 7, fontWeight: 600, fontSize: size === "sm" ? 11 : 13,
      transition: "opacity .15s", whiteSpace: "nowrap",
    }),
    badge: (bg, fg = "#fff") => ({
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, background: bg, color: fg, whiteSpace: "nowrap",
    }),
    overlay: {
      position: "fixed", inset: 0, background: "rgba(15,23,42,.65)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16, backdropFilter: "blur(4px)",
    },
    th: {
      padding: "9px 13px", textAlign: "left", fontWeight: 700,
      fontSize: 11, textTransform: "uppercase", letterSpacing: ".07em",
      color: "#cbd5e1", background: C.navy, borderBottom: `2px solid ${C.slate}`,
      whiteSpace: "nowrap",
    },
    td: {
      padding: "9px 13px", fontSize: 13, verticalAlign: "middle",
      color: C.navyMid, borderBottom: `1px solid ${C.border}`,
    },
  };

  const parseGrid = (raw) => {
    if (!raw) return [];
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
  };

  const Btn = ({ bg, size, onClick, disabled, children, style = {} }) => (
    <button
      onClick={onClick} disabled={disabled}
      style={{ ...S.btn(bg, size), opacity: disabled ? 0.5 : 1, ...style }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.opacity = ".82"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
    >{children}</button>
  );

  const Badge = ({ bg, fg, children }) => (
    <span style={S.badge(bg, fg)}>{children}</span>
  );

  /* ════════════════════════════════════════════════════════
    FINISH / MODIFY JOB MODAL  — covers ALL bills at once
    ════════════════════════════════════════════════════════ */
  function FinishAllModal({
    destuffingId,
    billDetails,        // full bill_details array from DESTF_DATA
    gridsByBol,         // { bolNo: [gridRow, ...] }
    grossWeight,
    earliestBillDate,
    isModify,
    onDone,
    onCancel,
  }) {
    const totalDeclared = billDetails.reduce(
      (s, b) => s + Number(b["tns:no_of_packages_declared"] || 0), 0
    );

    /* Build per-BOL state: { [bolNo]: { packets, handling, startTime, endTime } } */
    const buildInitial = () => {
      const state = {};
      billDetails.forEach((b) => {
        const bolNo   = b["tns:bol_number"] || b["tns:boe_number"];
        const decl    = Number(b["tns:no_of_packages_declared"] || 0);
        const rows    = gridsByBol[bolNo] || [];
        const finished = rows.find((r) => r.JOB_STATUS === "FINISHED" || r.JOB_STATUS === "FINAL_SUBMITTED");
        state[bolNo] = {
          packets:     Number(finished?.NO_OF_PACKAGES_ACTUAL ?? decl),
          handling:    finished?.HANDLING_TYPE || "",
          startTime:   finished?.START_TIME    || "",
          endTime:     finished?.END_TIME      || "",
        };
      });
      return state;
    };

    const [perBol,   setPerBol]   = useState(buildInitial);
    const [saving,   setSaving]   = useState(false);
    const [error,    setError]    = useState("");

    /* Shared fields — first bill drives defaults but user can change per bill */
    const [sharedHandling,   setSharedHandling]   = useState(() => {
      const bolNo = billDetails[0] ? (billDetails[0]["tns:bol_number"] || billDetails[0]["tns:boe_number"]) : "";
      return buildInitial()[bolNo]?.handling || "";
    });
    const [sharedStart,   setSharedStart]   = useState(() => {
      const bolNo = billDetails[0] ? (billDetails[0]["tns:bol_number"] || billDetails[0]["tns:boe_number"]) : "";
      return buildInitial()[bolNo]?.startTime || "";
    });
    const [sharedEnd,     setSharedEnd]     = useState(() => {
      const bolNo = billDetails[0] ? (billDetails[0]["tns:bol_number"] || billDetails[0]["tns:boe_number"]) : "";
      return buildInitial()[bolNo]?.endTime || "";
    });

    /* When shared fields change, push to all bills */
    const applySharedHandling = (val) => {
      setSharedHandling(val);
      setPerBol((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => { next[k] = { ...next[k], handling: val }; });
        return next;
      });
    };
    const applySharedStart = (val) => {
      setSharedStart(val);
      setPerBol((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => { next[k] = { ...next[k], startTime: val }; });
        return next;
      });
    };
    const applySharedEnd = (val) => {
      setSharedEnd(val);
      setPerBol((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => { next[k] = { ...next[k], endTime: val }; });
        return next;
      });
    };

    const totalAssigned = Object.values(perBol).reduce((s, v) => s + Number(v.packets || 0), 0);
    const remaining     = totalDeclared - totalAssigned;

    /* Unit weight: gross / total declared */
    const unitWeight = totalDeclared > 0 ? grossWeight / totalDeclared : 0;

   

const handleSubmit = async () => {
  setError("");

  if (!sharedHandling) {
    setError("Select Handling Type");
    return;
  }

  if (!sharedStart) {
    setError("Select Start Time");
    return;
  }

  if (!sharedEnd) {
    setError("Select End Time");
    return;
  }

  if (sharedEnd <= sharedStart) {
    setError("End Time must be greater than Start Time");
    return;
  }

  setSaving(true);

  try {
    const endpoint = isModify
      ? "/import-destuffing/modify-bol"
      : "/import-destuffing/finish-bol";

    for (const bill of billDetails) {
      const bolNo =
        bill["tns:bol_number"] ||
        bill["tns:boe_number"];

      const rows = gridsByBol[bolNo] || [];

      const declaredPkgs = Number(
        bill["tns:no_of_packages_declared"] || 0
      );

      const totalWeight = Number(
        bill["tns:package_weight"] || 0
      );

      const totalLocations = rows.length;

      const basePackets =
        totalLocations > 0
          ? Math.floor(
              declaredPkgs / totalLocations
            )
          : 0;

      const remainder =
        totalLocations > 0
          ? declaredPkgs % totalLocations
          : 0;

      const unitWeight =
        declaredPkgs > 0
          ? totalWeight / declaredPkgs
          : 0;

      const locations = rows.map(
        (row, idx) => {
          const packets =
            basePackets +
            (idx < remainder ? 1 : 0);

          const weight = Number(
            (
              packets * unitWeight
            ).toFixed(3)
          );

        return {
  id: row.ID,
  warehouse: row.WAREHOUSE,
  location_code: row.LOCATION_CODE,

  declared_packets: declaredPkgs,
  declared_weight: totalWeight,

  actual_packets: packets,
  actual_weight: weight,

  area: row.AREA,
  grid: row.GRID,
};
        }
      );

      const r = await axios.post(
        `${BASE}${endpoint}`,
        {
          destuffing_id: destuffingId,
          bol_boe_no: bolNo,
          handling_type: sharedHandling,
          start_time: sharedStart,
          end_time: sharedEnd,
          locations,
        }
      );

      if (!r.data?.success) {
        throw new Error(
          r.data?.message ||
            `Failed for ${bolNo}`
        );
      }
    }

    onDone();
  } catch (err) {
    setError(
      err.response?.data?.message ||
        err.message
    );
  } finally {
    setSaving(false);
  }
};

    return (
      <div style={{ ...S.overlay, zIndex: 3000 }}>
        <div style={{
          background: C.bgCard, borderRadius: 16, width: "100%", maxWidth: 640,
          maxHeight: "92vh", overflowY: "auto",
          boxShadow: "0 24px 72px rgba(0,0,0,.45)", overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            background: isModify ? C.amber : C.green,
            padding: "15px 20px", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>
                {isModify ? "✏️ Modify Job" : "✅ Finish Job"}
              </div>
              <div style={{ color: "rgba(255,255,255,.75)", fontSize: 12, marginTop: 2 }}>
                {billDetails.length} BOL/BOE · All bills
              </div>
            </div>
            <button onClick={onCancel} style={{
              background: "rgba(255,255,255,.2)", border: "none", color: "#fff",
              width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16, fontWeight: 700,
            }}>✕</button>
          </div>

          <div style={{ overflowY: "auto", padding: "16px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Earliest Bill Date */}
            {earliestBillDate && (
              <div style={{
                background: "#eff6ff", border: "1px solid #bfdbfe",
                borderRadius: 9, padding: "9px 14px",
                fontSize: 12, color: C.blue, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                ℹ️ Earliest Shipping Bill Date: <strong>{earliestBillDate}</strong>
              </div>
            )}

            {/* Summary chips */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
            
                { label: `Declared: ${totalDeclared}`,  color: C.muted,  bg: C.bg },
              
                { label: `Gross Wt: ${grossWeight} Tons`, color: C.navy, bg: C.bg },
              ].map((chip) => (
                <div key={chip.label} style={{
                  padding: "5px 13px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: chip.bg, color: chip.color,
                  border: `1px solid ${C.border}`,
                }}>{chip.label}</div>
              ))}
            </div>

            {/* Shared Handling Type */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>
                Handling Type <span style={{ color: C.red }}>*</span>
              </label>
              <select
                value={sharedHandling}
                onChange={(e) => { applySharedHandling(e.target.value); setError(""); }}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8,
                  border: `1.5px solid ${sharedHandling ? C.green : C.border}`,
                  fontSize: 13, color: C.navy, outline: "none",
                  background: sharedHandling ? C.greenSoft : "#fff",
                }}
              >
                <option value="">— Select Handling Type —</option>
                <option value="LCH">LCH</option>
                <option value="MCH">MCH</option>
              </select>
            </div>

            {/* Shared Times */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["Start Time", sharedStart, applySharedStart, ""],
                ["End Time",   sharedEnd,   applySharedEnd,   sharedStart],
              ].map(([label, val, setter, min]) => (
                <div key={label}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>
                    {label} <span style={{ color: C.red }}>*</span>
                  </label>
                  <input
                    type="datetime-local" value={val} min={min}
                    onChange={(e) => { setter(e.target.value); setError(""); }}
                    style={{
                      width: "100%", padding: "8px 10px", borderRadius: 8, boxSizing: "border-box",
                      border: `1.5px solid ${val ? C.blue : C.border}`,
                      fontSize: 13, color: C.navy, outline: "none",
                      background: val ? C.blueSoft : "#fff",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Per-bill breakdown */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
                Packages Per Grid <span style={{ color: C.red }}>*</span>
              </div>

              {/* Overall progress bar */}
              <div style={{ background: C.border, borderRadius: 99, height: 5, marginBottom: 10, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  width: `${Math.min(100, (totalAssigned / (totalDeclared || 1)) * 100)}%`,
                  background: remaining < 0 ? C.red : remaining === 0 ? C.green : C.blue,
                  transition: "width .3s",
                }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {billDetails.map((bill) => {
                  const bolNo   = bill["tns:bol_number"] || bill["tns:boe_number"];
                  const decl    = Number(bill["tns:no_of_packages_declared"] || 0);
                  const pkgWt   = Number(bill["tns:package_weight"] || 0);
                  const rows    = gridsByBol[bolNo] || [];
                  const v       = perBol[bolNo] || { packets: decl, handling: "", startTime: "", endTime: "" };
                  const pktVal  = Number(v.packets || 0);
                  const calcWt  = unitWeight > 0 ? (pktVal * unitWeight).toFixed(3) : (pkgWt > 0 ? (pktVal * pkgWt).toFixed(3) : "—");
                  const isOver  = pktVal > decl;

                  return (
                    <div key={bolNo} style={{
                      background: "#fafafa",
                      border: `1.5px solid ${isOver ? "#fecaca" : C.border}`,
                      borderRadius: 10, overflow: "hidden",
                    }}>
                      {/* Bill header */}
                      <div style={{
                        padding: "9px 13px",
                        background: isOver ? C.redSoft : "#f8fafc",
                        borderBottom: `1px solid ${isOver ? "#fecaca" : C.border}`,
                        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "monospace", color: C.blue }}>
                          🚛 {bolNo}
                        </span>
                        <span style={{ fontSize: 11, color: C.muted }}>
                          {bill["tns:commodity_description"] || ""}
                        </span>
                        <span style={{ fontSize: 11, color: C.subtle }}>
                          · {bill["tns:importer_name"] || ""}
                        </span>
                        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: C.muted }}>
                          Decl: {decl} pkgs · Pkg Wt: {pkgWt} T
                        </span>
                      </div>

                      {/* Grid rows for this bill */}
                      {rows.length > 0 && (
                        <div style={{ padding: "8px 13px 4px" }}>
                          {rows.map((row, idx) => {
  const totalLocations = rows.length;

  const declaredPkgs = Number(
    bill["tns:no_of_packages_declared"] || 0
  );

  const totalWeight = Number(
    bill["tns:package_weight"] || 0
  );

  const basePackets = Math.floor(
    declaredPkgs / totalLocations
  );

  const remainder =
    declaredPkgs % totalLocations;

  const rowPackets =
    basePackets + (idx < remainder ? 1 : 0);

  const unitWeight =
    declaredPkgs > 0
      ? totalWeight / declaredPkgs
      : 0;

  const rowWeight =
    (rowPackets * unitWeight).toFixed(2);

  return (
    <div
      key={row.ID}
      style={{
        background: "#eef2f7",
        borderRadius: 14,
        padding: "18px",
        marginBottom: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}
    >
      <div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800
          }}
        >
          📍 {row.WAREHOUSE} / {row.LOCATION_CODE}
        </div>

        <div
          style={{
            color: "#64748b",
            marginTop: 6
          }}
        >
          Area: {row.AREA} SQM
        </div>
      </div>

      <div
        style={{
          width: 140,
          textAlign: "center",
          background: "#fff",
          padding: 15,
          borderRadius: 12,
          fontSize: 28,
          fontWeight: 800
        }}
      >
        {rowPackets}
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: "#16a34a"
        }}
      >
        {rowWeight} Tons
      </div>
    </div>
  );
})}
                        </div>
                      )}

                      {/* Packet input + weight */}
                   
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div style={{
                padding: "8px 12px", background: C.redSoft,
                border: "1px solid #fecaca", borderRadius: 8,
                color: C.red, fontSize: 13, fontWeight: 600,
              }}>⚠️ {error}</div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingBottom: 4 }}>
              <Btn bg={C.muted} onClick={onCancel}>Cancel</Btn>
              <Btn bg={isModify ? C.amber : C.green} onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving…" : isModify ? "💾 Save Changes" : "✅ Confirm Finish"}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
    TALLY SHEET MODAL
    ════════════════════════════════════════════════════════ */
  function TallySheetModal({ destuffingId, onClose }) {
    const [loading, setLoading] = useState(true);
    const [data,    setData]    = useState(null);
    const [error,   setError]   = useState("");
    const printRef              = useRef(null);

    useEffect(() => {
      (async () => {
        try {
          const r = await axios.get(`${BASE}/import-destuffing/tally-sheet/${destuffingId}`);
          if (!r.data?.success) throw new Error(r.data?.message || "Failed");
          setData(r.data.data);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
      })();
    }, [destuffingId]);

    const handlePrint = () => {
      const content = printRef.current?.innerHTML;
      if (!content) return;
      const win = window.open("", "_blank");
      win.document.write(`<!DOCTYPE html><html><head>
        <title>Destuffing Tally Sheet</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #1e293b; color: #fff; padding: 7px 8px; text-align: left; font-size: 10px; border: 1px solid #334155; }
          td { padding: 6px 8px; font-size: 10px; border: 1px solid #ccc; }
          @media print { button { display: none; } }
        </style></head><body>${content}</body></html>`);
      win.document.close();
      setTimeout(() => { win.print(); win.close(); }, 400);
    };

    const renderContent = () => {
      if (!data) return null;
      const { destf_data, bol_boe_rows, container_no, created_at, flg } = data;

      const bolGroups = {};
      bol_boe_rows.forEach((r) => {
        if (!bolGroups[r.BOL_BOE_NO]) bolGroups[r.BOL_BOE_NO] = [];
        bolGroups[r.BOL_BOE_NO].push(r);
      });

      const bills = destf_data?.bill_details || [];
      const billMap = {};
      bills.forEach((b) => {
        const no = b["tns:bol_number"] || b["tns:boe_number"];
        if (no) billMap[no] = b;
      });

      const totalDeclared = bills.reduce((s, b) => s + Number(b["tns:no_of_packages_declared"] || 0), 0);
      const uniqueActual  = Object.values(bolGroups).reduce((s, rows) => s + Number(rows[0]?.NO_OF_PACKAGES_ACTUAL || 0), 0);
      const totalWeight = Object.values(bolGroups).reduce(
  (sum, rows) =>
    sum + Number(rows[0]?.PACKAGES_WEIGHT_ACTUAL || 0),
  0
);
      const totalArea     = bol_boe_rows.reduce((s, r) => s + Number(r.AREA || parseGrid(r.GRID).length || 0), 0);
      console.log(bol_boe_rows)
      return (
        <div ref={printRef}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, borderBottom: "2px solid #e2e8f0", paddingBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800 }}>ID: <strong>{destuffingId}</strong></div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Date: {created_at?.split("T")[0].split("-").reverse().join("/")}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Cargo Handling Operator</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Container Destuffing Tally Sheet</div>
            </div>
            <div style={{ width: 80 }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 28px", marginBottom: 16 }}>
            {[
              ["Container No", container_no],
               ["Seal Number", destf_data?.seal_number || "—"],
              ["Container Size", destf_data?.container_size || "—"],
               ["Shipping Liner", destf_data?.shipping_liner_code || "—"],
              ["Container Type", destf_data?.container_type || "—"],
             
              ["FLG", flg || "—"],
              ["GW Port Code",  "—"],
              ["CHA Code",  "—"],
              ["Start Date & Time",  bol_boe_rows[0]?.START_TIME.replace("T", " ") || "—"],
              ["End Date & Time",  bol_boe_rows[0]?.END_TIME.replace("T", " ") || "—"],
              ["Warehouse Name", "Import"],
              ["ICD Location", destf_data?.icd_location_code || "—"],
              ["Job Order", destf_data?.destuffing_job_order || "—"],
              ["Handeling Type",  bol_boe_rows[0]?.HANDLING_TYPE || "—"],
              ["Total Declared Pkgs", String(totalDeclared)],
              ["Total Actual Pkgs", String(uniqueActual)],
              ["Excess / Short Packages", String(totalDeclared - uniqueActual)],
              [
  "Forwarder name",
  bol_boe_rows.length
    ? bol_boe_rows
        .map((row) => row.IMPORTER_NAME)
        .filter(Boolean)
        .join(", ")
    : "—",
],
   ["Gross Weight", String(totalWeight)],
              
            ].map(([label, value], i) => (
              <div key={i} style={{ display: "flex", gap: 6, fontSize: 11, padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b", minWidth: 160, flexShrink: 0 }}>{label}</span>
                <span style={{ color: "#334155" }}>:</span>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["#", "BOL/BOE No.", "Commodity", "Importer", "Decl. Pkgs", "Act. Pkgs", "Pkg Wt", "Warehouse", "Location", "Area (SQM)", "Handling", "Start", "End"].map((h) => (
                    <th key={h} style={{ background: "#1e293b", color: "#fff", padding: "8px 9px", textAlign: "left", fontSize: 10, fontWeight: 700, border: "1px solid #334155", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(bolGroups).map(([bolNo, rows], gi) => {
                  const bill          = billMap[bolNo] || {};
                  const commodityDesc = bill["tns:commodity_description"] || "—";
                  const importerName  = bill["tns:importer_name"]  || "—";
                  const declared      = Number(bill["tns:no_of_packages_declared"] || 0);
                  const firstRow      = rows[0];

                  return rows.map((row, ri) => (
                    <tr key={row.ID} style={{ background: gi % 2 ? "#fafbfc" : "#fff" }}>
                      {ri === 0 && <td rowSpan={rows.length} style={{ padding: "7px 9px", fontSize: 11, border: "1px solid #e2e8f0", textAlign: "center", fontWeight: 700 }}>{gi + 1}</td>}
                      {ri === 0 && <td rowSpan={rows.length} style={{ padding: "7px 9px", fontSize: 11, fontWeight: 700, color: "#2563eb", border: "1px solid #e2e8f0", fontFamily: "monospace" }}>{bolNo}</td>}
                      {ri === 0 && <td rowSpan={rows.length} style={{ padding: "7px 9px", fontSize: 11, border: "1px solid #e2e8f0" }}>{commodityDesc}</td>}
                      {ri === 0 && <td rowSpan={rows.length} style={{ padding: "7px 9px", fontSize: 11, border: "1px solid #e2e8f0" }}>{importerName}</td>}
                      {ri === 0 && <td rowSpan={rows.length} style={{ padding: "7px 9px", fontSize: 11, textAlign: "center", border: "1px solid #e2e8f0" }}>{declared}</td>}
                      {ri === 0 && <td rowSpan={rows.length} style={{ padding: "7px 9px", fontSize: 11, textAlign: "center", fontWeight: 700, border: "1px solid #e2e8f0" }}>{firstRow.NO_OF_PACKAGES_ACTUAL || "—"}</td>}
                      {ri === 0 && <td rowSpan={rows.length} style={{ padding: "7px 9px", fontSize: 11, border: "1px solid #e2e8f0" }}>{firstRow.PACKAGES_WEIGHT_ACTUAL || "—"}</td>}
                      <td style={{ padding: "7px 9px", fontSize: 11, border: "1px solid #e2e8f0" }}>{row.WAREHOUSE || "—"}</td>
                      <td style={{ padding: "7px 9px", fontSize: 11, border: "1px solid #e2e8f0" }}>{row.LOCATION_CODE || "—"}</td>
                      <td style={{ padding: "7px 9px", fontSize: 11, textAlign: "center", border: "1px solid #e2e8f0" }}>{row.AREA || parseGrid(row.GRID).length || "—"}</td>
                      {ri === 0 && <td rowSpan={rows.length} style={{ padding: "7px 9px", fontSize: 11, border: "1px solid #e2e8f0" }}>{firstRow.HANDLING_TYPE || "—"}</td>}
                      {ri === 0 && <td rowSpan={rows.length} style={{ padding: "7px 9px", fontSize: 11, border: "1px solid #e2e8f0" }}>{firstRow.START_TIME?.replace("T", " ") || "—"}</td>}
                      {ri === 0 && <td rowSpan={rows.length} style={{ padding: "7px 9px", fontSize: 11, border: "1px solid #e2e8f0" }}>{firstRow.END_TIME?.replace("T", " ") || "—"}</td>}
                    </tr>
                  ));
                })}
                <tr style={{ background: "#f8fafc" }}>
                  <td colSpan={4} style={{ padding: "8px 9px", fontWeight: 800, fontSize: 12, border: "1px solid #e2e8f0" }}>Total</td>
                  <td style={{ padding: "8px 9px", fontWeight: 800, fontSize: 12, border: "1px solid #e2e8f0", textAlign: "center" }}>{totalDeclared}</td>
                  <td style={{ padding: "8px 9px", fontWeight: 800, fontSize: 12, border: "1px solid #e2e8f0", textAlign: "center" }}>{uniqueActual}</td>
                  <td
  style={{
    padding: "8px 9px",
    fontWeight: 800,
    fontSize: 12,
    border: "1px solid #e2e8f0",
    textAlign: "center",
  }}
>
  {totalWeight}
</td>
                  <td colSpan={2} style={{ border: "1px solid #e2e8f0" }} />
                  <td style={{ padding: "8px 9px", fontWeight: 800, fontSize: 12, border: "1px solid #e2e8f0", textAlign: "center" }}>{totalArea}</td>
                  <td colSpan={3} style={{ border: "1px solid #e2e8f0" }} />
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, fontSize: 11, color: "#334155", fontWeight: 600 }}>Remarks :</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 50, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 10, color: "#64748b", maxWidth: 300, lineHeight: 1.6 }}>
              Said to contain received cargo in sound condition and to my entire satisfaction.
            </div>
            <div style={{ textAlign: "right", fontSize: 11 }}>
              <div style={{ fontWeight: 700 }}>Tallied By</div>
              <div style={{ color: "#94a3b8", marginTop: 4 }}>--</div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div style={{ ...S.overlay, zIndex: 4000 }}>
        <div style={{
          width: "100%", maxWidth: 1080, maxHeight: "95vh",
          background: "#fff", borderRadius: 16,
          boxShadow: "0 32px 80px rgba(0,0,0,.45)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{
            background: C.navy, padding: "13px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>🧾</span>
              <div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>Destuffing Tally Sheet</div>
                <div style={{ color: C.subtle, fontSize: 11 }}>ID: <span style={{ color: "#60a5fa", fontFamily: "monospace", fontWeight: 700 }}>{destuffingId}</span></div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {!loading && !error && <Btn bg={C.blue} size="sm" onClick={handlePrint}>🖨 Print</Btn>}
              <button onClick={onClose} style={{ background: "rgba(255,255,255,.12)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: 7, cursor: "pointer", fontSize: 15, fontWeight: 700 }}>✕</button>
            </div>
          </div>
          <div style={{ overflowY: "auto", padding: "20px 26px 30px", flex: 1 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                <div style={{ fontWeight: 600 }}>Loading tally sheet…</div>
              </div>
            ) : error ? (
              <div style={{ textAlign: "center", padding: 60, color: C.red }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
                <div style={{ fontWeight: 600 }}>{error}</div>
              </div>
            ) : renderContent()}
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
    DESTUFFING DETAIL MODAL
    ════════════════════════════════════════════════════════ */
  function DestuffingDetailModal({ destuffingRow, onClose, onTallyOpen }) {
    const [destfData,      setDestfData]      = useState(null);
    const [gridRows,       setGridRows]       = useState([]);
    const [loading,        setLoading]        = useState(true);
    const [liveActive,     setLiveActive]     = useState(false);
    const [showFinishAll,  setShowFinishAll]  = useState(false);  // single finish-all modal flag
    const [finishIsModify, setFinishIsModify] = useState(false);
    const [finalSubmitted, setFinalSubmitted] = useState(false);

    /* Map state */
    const [mapVisible,   setMapVisible]   = useState(false);
    const [areaVisible,  setAreaVisible]  = useState(false);
    const [mapName,      setMapName]      = useState("Import");
    const [activeGridSel, setActiveGridSel]       = useState(null);
    const [pendingGrids,   setPendingGrids]       = useState([]);
    const [manualArea,     setManualArea]         = useState(1);
    const [SelectedGrids,  setSelectedGrids]      = useState({});
    const [locationAllocationMap, setLocationAllocationMap] = useState({});
    const [mapData, setMapData] = useState([]);
    const [ocrGridWiseOccupied, setOcrGridWiseOccupied] = useState(null);
const [ocrImage, setOcrImage] = useState(null);
    const activeGridCtx = useRef(null);

    const destuffingId = destuffingRow.ID;
    const containerNo  = destuffingRow.CONTAINER_NO;

    const refreshGridRows = useCallback(async () => {
      try {
        const r = await axios.get(`${BASE}/import-destuffing/bol-rows/${destuffingId}`);
        const rows = r.data?.data || [];
        setGridRows(rows);
        setFinalSubmitted(rows.some((r) => r.JOB_STATUS === "FINAL_SUBMITTED"));
      } catch {}
    }, [destuffingId]);

    useEffect(() => {
      (async () => {
        try {
          const r = await axios.get(`${BASE}/import-destuffing/view/${destuffingId}`);
          if (r.data?.success) {
            setDestfData(JSON.parse(r.data.data.DESTF_DATA));
            const rows = r.data.data.BOL_BOE_ROWS || [];
            setGridRows(rows);
            setFinalSubmitted(rows.some((r) => r.JOB_STATUS === "FINAL_SUBMITTED"));
          }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
      })();
    }, [destuffingId]);

    /* Live update loop — skips IS_EDIT=1 rows (handled server-side) */
    useEffect(() => {
      if (!liveActive) return;
      const interval = setInterval(async () => {
        try {
          const r = await axios.get(`${BASE}/import-destuffing/live-update/${destuffingId}`);
          if (r.data?.success && r.data?.data?.length) {
            setGridRows((prev) => {
              const updated = [...prev];
              r.data.data.forEach((liveRow) => {
                const idx = updated.findIndex((r) => Number(r.ID) === Number(liveRow.id));
                if (idx !== -1) {
                  updated[idx] = {
                    ...updated[idx],
                    GRID: JSON.stringify(liveRow.grids),
                    AREA: String(liveRow.grids?.length || updated[idx].AREA),
                  };
                }
              });
              return updated;
            });
          }
        } catch {}
      }, 5000);
      return () => clearInterval(interval);
    }, [liveActive, destuffingId]);

    /* Open map to add new grid for a BOL/BOE */
    const openAddGrid = (bolBoeNo) => {
      activeGridCtx.current = { destuffingId, bolBoeNo, containerNo, existingRowId: null };
      setLocationAllocationMap({});
      setMapData([]);
      setMapName("Import");
      setActiveGridSel(null);
      setPendingGrids([]);
      setMapVisible(true);
    };

    let ocrGridData = null;
let ocrImageData = null;
    /* Open map to edit existing grid row — always allowed, sets IS_EDIT=1 */
    const openEditGrid = async (gridRow) => {
      /* Mark as manual edit first */
      try {
        await axios.post(`${BASE}/import-destuffing/mark-manual`, { row_id: gridRow.ID });
        setGridRows((prev) =>
          prev.map((r) => (r.ID === gridRow.ID ? { ...r, IS_EDIT: 1 } : r))
        );
      } catch {}

      activeGridCtx.current = {
        destuffingId,
        bolBoeNo:      gridRow.BOL_BOE_NO,
        containerNo,
        existingRowId: gridRow.ID,
      };

      try {
       const allocRes = await axios.get(
  `${BASE}/import-destuffing/grid-allocation-map?warehouse=${encodeURIComponent(gridRow.WAREHOUSE)}&location_code=${encodeURIComponent(gridRow.LOCATION_CODE)}`
);

if (allocRes.data?.success) {
  setLocationAllocationMap(
    allocRes.data.allocation_map || {}
  );

  ocrGridData =
    allocRes.data.ocr_grid_wise_occupied || null;

  ocrImageData =
    allocRes.data.ocr_image || null;

  setOcrGridWiseOccupied(ocrGridData);
  setOcrImage(ocrImageData);
}
      } catch { setLocationAllocationMap({}); }

      const warehouseApiMap = { Import: "import", Export: "export", Mazzanine: "mazzanine", OYC: "oyc" };
      const endpoint = warehouseApiMap[gridRow.WAREHOUSE];
      if (endpoint) {
        try {
          const mapRes = await axios.get(`${BASE}/import-destuffing/mapdata/${endpoint}`);
          const locations = mapRes.data?.data || [];
          setMapData(locations);
          const locationCode = gridRow.LOCATION_CODE?.toLowerCase();
          const fullRecord = locations.find(
            (d) => (d.location_code ?? d.camera_locations ?? "").toLowerCase() === locationCode
          );
         setActiveGridSel({
  ...(fullRecord ?? {}),

  warehouse_name: gridRow.WAREHOUSE,
  location_code: gridRow.LOCATION_CODE,
  new_location_code: gridRow.LOCATION_CODE,

  area_boxes:
    gridRow.AREA_BOXES ??
    fullRecord?.area_boxes ??
    null,

 ocr_grid_wise_occupied: ocrGridData,
ocr_image: ocrImageData,
});
        } catch {
          setMapData([]);
          setActiveGridSel({ warehouse_name: gridRow.WAREHOUSE, location_code: gridRow.LOCATION_CODE });
        }
      }

      setMapName(gridRow.WAREHOUSE);
      setPendingGrids(parseGrid(gridRow.GRID).map(String));
      setAreaVisible(true);
    };

    const handleActiveGridSelectionChange = useCallback(async (sel) => {
      setActiveGridSel(sel);
      if (sel?.warehouse_name && sel?.location_code) {
        try {
          const allocRes = await axios.get(
            `${BASE}/import-destuffing/grid-allocation-map?warehouse=${encodeURIComponent(sel.warehouse_name)}&location_code=${encodeURIComponent(sel.location_code)}`
          );
          if (allocRes.data?.success) setLocationAllocationMap(allocRes.data.allocation_map || {});
        } catch { setLocationAllocationMap({}); }
      } else {
        setLocationAllocationMap({});
      }
    }, []);

    const handleGridToggle = (area) => {
      setPendingGrids((prev) =>
        prev.includes(String(area))
          ? prev.filter((g) => g !== String(area))
          : [...prev, String(area)]
      );
    };

    const handleConfirmGrids = useCallback(async () => {
      const ctx = activeGridCtx.current;
      if (!ctx || !activeGridSel) { setAreaVisible(false); return; }

      const warehouse    = activeGridSel.warehouse_name || mapName;
      const locationCode = activeGridSel.location_code;
      const grids        = (pendingGrids || []).map(String);
      const currentBill = (destfData?.bill_details || []).find(
  (b) =>
    (b["tns:bol_number"] || b["tns:boe_number"]) === ctx.bolBoeNo
);

      try {
       const saveRes = await axios.post(`${BASE}/import-destuffing/save-grid`, {
  destuffing_id: ctx.destuffingId,
  bol_boe_no: ctx.bolBoeNo,
  container_no: ctx.containerNo,

  commodity_desc:
    currentBill?.["tns:commodity_description"] || "",

  importer_name:
    currentBill?.["tns:importer_name"] || "",

  warehouse,
  location_code: locationCode,
  grids,
  area:
    warehouse === "OYC"
      ? Number(manualArea || 0)
      : grids.length,

  existing_row_id:
    ctx.existingRowId || null,
});

        if (!saveRes.data?.success) {
          alert(saveRes.data?.message || "Failed to save grid");
          return;
        }
        await refreshGridRows();
      } catch (err) {
        alert("Save failed: " + err.message);
      }

      setAreaVisible(false);
      setPendingGrids([]);
      activeGridCtx.current = null;
    }, [activeGridSel, mapName, pendingGrids, manualArea, refreshGridRows]);

    useEffect(() => {
      window.handleConfirmGrids = handleConfirmGrids;
      return () => { delete window.handleConfirmGrids; };
    }, [handleConfirmGrids]);

    const handleDeleteGrid = async (rowId) => {
      if (!window.confirm("Remove this grid allocation?")) return;
      try {
        await axios.delete(`${BASE}/import-destuffing/delete-grid/${rowId}`);
        await refreshGridRows();
      } catch (err) { alert("Remove failed: " + err.message); }
    };

    const handleFinalSubmit = async () => {
      try {
        const r = await axios.post(`${BASE}/import-destuffing/final-submit/${destuffingId}`);
        if (!r.data?.success) { alert(r.data?.message || "Failed"); return; }
        onClose();
        onTallyOpen(destuffingId);
      } catch (err) {
        alert(err.response?.data?.message || err.message);
      }
    };

    /* ── Derived ── */
    const billDetails = destfData?.bill_details || [];
    const grossWeight = Number(destfData?.cargo_gross_weight || 0);

    const gridsByBol = {};
    gridRows.forEach((row) => {
      if (!gridsByBol[row.BOL_BOE_NO]) gridsByBol[row.BOL_BOE_NO] = [];
      gridsByBol[row.BOL_BOE_NO].push(row);
    });

    /* "finished" = at least one FINISHED row exists for that BOL */
    const isBolFinished = (bolNo) =>
      (gridsByBol[bolNo] || []).some((r) => r.JOB_STATUS === "FINISHED" || r.JOB_STATUS === "FINAL_SUBMITTED");

    const allBolsFinished = billDetails.length > 0 &&
      billDetails.every((b) => isBolFinished(b["tns:bol_number"] || b["tns:boe_number"]));

    const anyBolFinished = billDetails.some((b) => isBolFinished(b["tns:bol_number"] || b["tns:boe_number"]));

    const anyGridExists = gridRows.length > 0;
    const anyLiveRow    = gridRows.some((r) => r.WAREHOUSE && r.JOB_STATUS !== "FINISHED" && !Number(r.IS_EDIT));

    /* Earliest bill date */
    const earliestBillDate = billDetails.reduce((earliest, b) => {
      const d = b["tns:bill_date"];
      if (!d) return earliest;
      const formatted = d.split("T")[0];
      return !earliest || formatted < earliest ? formatted : earliest;
    }, null);

    return (
      <>
        <div style={S.overlay}>
          <div style={{
            width: "100%", maxWidth: 1140, maxHeight: "94vh",
            overflowY: "auto", background: C.bg,
            borderRadius: 16, boxShadow: "0 32px 80px rgba(0,0,0,.4)",
            display: "flex", flexDirection: "column",
          }}>
            {/* Header */}
            <div style={{
              background: C.navy, padding: "15px 22px",
              borderRadius: "16px 16px 0 0",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
            }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>Import Destuffing Details</div>
                <div style={{ color: C.subtle, fontSize: 12, marginTop: 2 }}>
                  Container: <span style={{ color: "#60a5fa", fontFamily: "monospace", fontWeight: 700 }}>{containerNo}</span>
                  <span style={{ color: C.muted, margin: "0 10px" }}>|</span>
                  <span style={{ color: C.subtle }}>{destuffingRow.FLG}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {anyLiveRow && !finalSubmitted && (
                  <Btn bg={liveActive ? C.red : C.cyan} size="sm" onClick={() => setLiveActive((p) => !p)}>
                    {liveActive ? "⏹ Stop Live" : "▶ Start Live"}
                  </Btn>
                )}
                {/* Common Finish / Modify Job button in header */}
                {!finalSubmitted && anyGridExists && (
                  <Btn
                    bg={anyBolFinished ? C.amber : C.green}
                    size="sm"
                    onClick={() => {
                      setFinishIsModify(anyBolFinished);
                      setShowFinishAll(true);
                    }}
                  >
                    {anyBolFinished ? "✏️ Modify Job" : "✅ Finish Job"}
                  </Btn>
                )}
                <button onClick={onClose} style={{
                  background: "rgba(255,255,255,.1)", border: "none", color: "#fff",
                  width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16, fontWeight: 700,
                }}>✕</button>
              </div>
            </div>

            <div style={{ overflowY: "auto", padding: "18px 22px 28px", flex: 1 }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                  <div style={{ fontWeight: 600 }}>Loading…</div>
                </div>
              ) : (
                <>
                  {/* Container info cards */}
                  {destfData && (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
                      gap: 8, marginBottom: 20,
                    }}>
                      {[
                        ["Container No", destfData.container_number],
                        ["Size",         destfData.container_size],
                        ["Type",         destfData.container_type],
                        ["Seal No.",     destfData.seal_number],
                        ["Shipping Liner", destfData.shipping_liner_code],
                        ["ICD Location", destfData.icd_location_code],
                        ["Handling Code", destfData.handling_code],
                        ["Job Order",    destfData.destuffing_job_order],
                      ].map(([label, value]) => (
                        <div key={label} style={{
                          background: C.bgCard, border: `1px solid ${C.border}`,
                          borderRadius: 10, padding: "10px 13px",
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>{label}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{value || "—"}</div>
                        </div>
                      ))}
                      <div style={{ background: C.navy, borderRadius: 10, padding: "10px 13px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>Gross Weight</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{destfData.cargo_gross_weight || "—"}</div>
                      </div>
                    </div>
                  )}

                  {/* Live banner */}
                  {liveActive && (
                    <div style={{
                      background: "#dbeafe", border: "1px solid #93c5fd",
                      borderRadius: 8, padding: "9px 14px", marginBottom: 14,
                      fontSize: 12, fontWeight: 700, color: C.blue,
                      display: "flex", alignItems: "center", gap: 7,
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.blue, display: "inline-block", animation: "pulse 1.5s infinite" }} />
                      Live update active — grids refresh every 5 seconds (manual edits excluded)
                    </div>
                  )}

                  {/* BOL / BOE section header */}
                  <div style={{
                    fontSize: 13, fontWeight: 800, color: C.navy,
                    marginBottom: 12, display: "flex", alignItems: "center", gap: 8,
                    paddingBottom: 10, borderBottom: `2px solid ${C.border}`,
                  }}>
                    📄 BOL / BOE Records
                    <Badge bg={C.blue}>{billDetails.length}</Badge>
                    {finalSubmitted && <Badge bg={C.teal}>🔒 Final Submitted</Badge>}
                  </div>

                  {/* BOL / BOE cards */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                    {billDetails.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 40, color: C.subtle, background: C.bgCard, borderRadius: 12, border: `1px dashed ${C.border}` }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                        No BOL/BOE records found
                      </div>
                    ) : billDetails.map((bill, bi) => {
                      const bolNo        = bill["tns:bol_number"] || bill["tns:boe_number"];
                      const commodityDesc = bill["tns:commodity_description"] || "—";
                      const importerName  = bill["tns:importer_name"]  || "—";
                      const declaredPkgs  = Number(bill["tns:no_of_packages_declared"] || 0);
                      const pkgWeight     = Number(bill["tns:package_weight"] || 0);
                      const billDate      = bill["tns:bill_date"]?.split("T")[0] || "—";
                      const rows          = gridsByBol[bolNo] || [];
                      const finished      = isBolFinished(bolNo);
                      const allFinal      = rows.every((r) => r.JOB_STATUS === "FINAL_SUBMITTED");
                      const finishedRow   = rows.find((r) => r.JOB_STATUS === "FINISHED" || r.JOB_STATUS === "FINAL_SUBMITTED");
                      const totalArea     = rows.reduce((s, r) => s + Number(r.AREA || parseGrid(r.GRID).length || 0), 0);
                      const actualPkgs    = finishedRow?.NO_OF_PACKAGES_ACTUAL;
                      const actualWt      = finishedRow?.PACKAGES_WEIGHT_ACTUAL;

                      return (
                        <div key={bolNo} style={{
                          background: C.bgCard,
                          border: `1.5px solid ${finished ? "#bbf7d0" : rows.length > 0 ? "#bfdbfe" : C.border}`,
                          borderRadius: 12, overflow: "hidden",
                          boxShadow: "0 1px 6px rgba(0,0,0,.05)",
                        }}>
                          {/* Card header */}
                          <div style={{
                            background: finished ? "#f0fdf4" : rows.length > 0 ? "#eff6ff" : "#fafafa",
                            padding: "11px 15px",
                            display: "flex", alignItems: "center",
                            justifyContent: "space-between", flexWrap: "wrap", gap: 8,
                            borderBottom: `1px solid ${finished ? "#bbf7d0" : rows.length > 0 ? "#bfdbfe" : C.border}`,
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{
                                fontFamily: "monospace", fontWeight: 800, fontSize: 13, color: C.blue,
                                background: "#dbeafe", padding: "3px 9px", borderRadius: 6,
                              }}>{bolNo}</span>
                              {finished
                                ? <Badge bg={C.green}>✅ Finished</Badge>
                                : rows.length > 0
                                ? <Badge bg={C.blue} fg="#fff">📍 Grid Set</Badge>
                                : <Badge bg={C.amberSoft} fg={C.amber}>⏳ Pending</Badge>
                              }
                              {allFinal && <Badge bg={C.teal}>🔒 Final</Badge>}
                              <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{commodityDesc}</span>
                              <span style={{ fontSize: 11, color: C.subtle }}>{importerName}</span>
                            </div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                              {/* Bill date */}
                              <div style={{ fontSize: 11, color: C.muted, background: C.bg, padding: "2px 7px", borderRadius: 5, fontWeight: 600 }}>
                                📅 {billDate}
                              </div>
                              {/* Package counts */}
                              <div style={{ fontSize: 11, background: "#eff6ff", color: C.blue, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>Decl: {declaredPkgs}</div>
                              <div style={{ fontSize: 11, background: C.bg, color: C.muted, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>Pkg Wt: {pkgWeight} T</div>
                              {actualPkgs != null && (
                                <div style={{ fontSize: 11, background: C.greenSoft, color: C.green, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>Act: {actualPkgs}</div>
                              )}
                              {actualWt != null && (
                                <div style={{ fontSize: 11, background: C.greenSoft, color: C.teal, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>{actualWt} T</div>
                              )}
                              {totalArea > 0 && (
                                <div style={{ fontSize: 11, background: "#f5f3ff", color: C.purple, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>{totalArea} SQM</div>
                              )}
                              {/* Add Grid — always available until final submit */}
                              {!finalSubmitted && (
                                <Btn bg={C.purple} size="sm" onClick={() => openAddGrid(bolNo)}>
                                  🗺 Add Grid
                                </Btn>
                              )}
                            </div>
                          </div>

                          {/* Grid rows table */}
                          {rows.length > 0 ? (
                            <div style={{ overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr>
                                    {["#", "Warehouse", "Location", "Grids", "Area (SQM)", "Status", "Actions"].map((h) => (
                                      <th key={h} style={S.th}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map((row, ri) => {
                                    const grids      = parseGrid(row.GRID);
                                    const isEditing  = Number(row.IS_EDIT) === 1;
                                    const isFinished = row.JOB_STATUS === "FINISHED" || row.JOB_STATUS === "FINAL_SUBMITTED";

                                    return (
                                      <tr key={row.ID} style={{ background: ri % 2 ? "#fafbfc" : "#fff" }}>
                                        <td style={{ ...S.td, color: C.muted, fontWeight: 700, width: 32 }}>{ri + 1}</td>
                                        <td style={S.td}>
                                          <span style={{ background: C.purple, color: "#fff", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                                            {row.WAREHOUSE}
                                          </span>
                                        </td>
                                        <td style={{ ...S.td, color: C.blue, fontWeight: 700, fontFamily: "monospace" }}>
                                          {row.LOCATION_CODE}
                                          {isEditing && (
                                            <span style={{ marginLeft: 5, fontSize: 10, background: C.amberSoft, color: C.amber, padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>
                                              ✏️ Manual
                                            </span>
                                          )}
                                        </td>
                                        <td style={S.td}>
                                          <div style={{
                                            fontSize: 11, color: C.green, fontWeight: 600,
                                            padding: "3px 7px", background: C.greenSoft,
                                            borderRadius: 6, display: "inline-block", maxWidth: 220, wordBreak: "break-word",
                                          }}>
                                            {grids.length > 0
                                              ? grids.slice(0, 8).join(", ") + (grids.length > 8 ? ` …+${grids.length - 8}` : "")
                                              : "No grids"}
                                          </div>
                                        </td>
                                        <td style={{ ...S.td, textAlign: "center", fontWeight: 700 }}>
                                          {row.AREA || grids.length || "—"}
                                        </td>
                                        <td style={S.td}>
                                          {isFinished
                                            ? <Badge bg={C.green}>✅ Finished</Badge>
                                            : <Badge bg={C.amberSoft} fg={C.amber}>⏳ Active</Badge>
                                          }
                                        </td>
                                        {/* Actions — always editable until final submit */}
                                        <td style={{ ...S.td, minWidth: 120 }}>
                                          {!finalSubmitted && (
                                            <div style={{ display: "flex", gap: 5 }}>
                                              <Btn bg={C.amber} size="sm" onClick={() => openEditGrid(row)}>
                                                🗺 Edit
                                              </Btn>
                                              <Btn bg={C.red} size="sm" onClick={() => handleDeleteGrid(row.ID)}>
                                                ✕
                                              </Btn>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div style={{ padding: "20px 16px", textAlign: "center", color: C.subtle, fontSize: 12 }}>
                              <span style={{ fontSize: 20, display: "block", marginBottom: 6 }}>🗺</span>
                              click <strong>Add Grid</strong> to allocate
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Final Submit bar */}
                  {!finalSubmitted && billDetails.length > 0 && (
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 16px",
                      background: allBolsFinished ? C.greenSoft : "#fff8f1",
                      border: `1px solid ${allBolsFinished ? "#bbf7d0" : "#fde68a"}`,
                      borderRadius: 10,
                    }}>
                      <div style={{ fontSize: 13, color: allBolsFinished ? C.green : C.amber, fontWeight: 600 }}>
                        {allBolsFinished
                          ? "✅ All BOL/BOE records finished — ready for final submit"
                          : `⏳ ${billDetails.filter((b) => !isBolFinished(b["tns:bol_number"] || b["tns:boe_number"])).length} records still pending`
                        }
                      </div>
                      <Btn bg={allBolsFinished ? C.red : C.muted} disabled={!allBolsFinished} onClick={handleFinalSubmit}>
                        🔒 Final Submit
                      </Btn>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Common Finish All Modal */}
        {showFinishAll && (
          <FinishAllModal
            destuffingId={destuffingId}
            billDetails={billDetails}
            gridsByBol={gridsByBol}
            grossWeight={grossWeight}
            earliestBillDate={earliestBillDate}
            isModify={finishIsModify}
            onCancel={() => setShowFinishAll(false)}
            onDone={async () => {
              setShowFinishAll(false);
              await refreshGridRows();
            }}
          />
        )}

        {/* Map Modals */}
        <MapModal
          isVisible={mapVisible}
          onClose={() => setMapVisible(false)}
          MapName={mapName}
          activeGridSelection={activeGridSel}
          setActiveGridSelection={handleActiveGridSelectionChange}
          setModalVisible2={(val) => { setMapVisible(false); setAreaVisible(!!val); }}
          SelectedGrids={SelectedGrids}
          setSelectedGrids={setSelectedGrids}
        />
        <MapAreaModal
        ocrGridWiseOccupied={ocrGridWiseOccupied}
ocrImage={ocrImage}
          manualArea={manualArea}
          setManualArea={setManualArea}
          isVisible2={areaVisible}
          onClose2={() => { setAreaVisible(false); setPendingGrids([]); activeGridCtx.current = null; }}
          MapName={mapName}
          activeGridSelection={activeGridSel}
          setActiveGridSelection={handleActiveGridSelectionChange}
          gridArea={pendingGrids}
          setGridArea={handleGridToggle}
          SelectedGrids={SelectedGrids}
          setSelectedGrids={setSelectedGrids}
          onConfirmGrids={handleConfirmGrids}
          warehouseSelections={{}}
          setWarehouseSelections={() => {}}
          ModalIds={
            activeGridCtx.current
              ? `${activeGridCtx.current.destuffingId}__${activeGridCtx.current.bolBoeNo}`
              : ""
          }
          locationAllocationMap={locationAllocationMap}
          mapData={mapData}
          currentRowId={activeGridCtx.current?.existingRowId ?? null}
        />

        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        `}</style>
      </>
    );
  }

  /* ════════════════════════════════════════════════════════
    MAIN DASHBOARD
    ════════════════════════════════════════════════════════ */
  export default function ImportDestuffing() {
        const navigate = useNavigate();
    const [data,       setData]       = useState([]);
    const [loadingId,  setLoadingId]  = useState(null);
    const [loading,    setLoading]    = useState(false);
    const [activeTab,  setActiveTab]  = useState("ACTIVE");
    const [detailRow,  setDetailRow]  = useState(null);
    const [tallyId,    setTallyId]    = useState(null);
const pendingCount = data.filter(x => x.DONE_STATUS === "Pending").length;
const startedCount = data.filter(x => x.DONE_STATUS === "STARTED").length;
const finalSubmittedCount = data.filter(x => x.DONE_STATUS === "FINAL_SUBMITTED").length;
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${BASE}/import-destuffing`);
        setData(res.data.data || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleStart = async (id) => {
      try {
        setLoadingId(id);
        const response = await axios.post(`${BASE}/import-destuffing/start/${id}`);
        await fetchData();
        alert(response?.data?.message || "Destuffing Started Successfully");
      } catch (err) {
        alert(err?.response?.data?.message || err.message || "Error while starting");
      } finally { setLoadingId(null); }
    };



const total = data.length;

const activeCount = data.filter(
  (x) =>
    x.DONE_STATUS === "Pending" ||
    x.DONE_STATUS === "STARTED"
).length;

const finalCount = data.filter(
  (x) => x.DONE_STATUS === "FINAL_SUBMITTED"
).length;

const filteredData =
  activeTab === "ACTIVE"
    ? data.filter(
        (x) =>
          x.DONE_STATUS === "Pending" ||
          x.DONE_STATUS === "STARTED"
      )
    : data.filter(
        (x) => x.DONE_STATUS === "FINAL_SUBMITTED"
      );

    const statusConfig = {
      Pending:         { bg: "#fef3c7",   fg: C.amber, label: "⏳ Pending"         },
      STARTED:         { bg: C.greenSoft, fg: C.green, label: "✅ Started"         },
      FINAL_SUBMITTED: { bg: "#e0f2fe",   fg: C.teal,  label: "🔒 Final Submitted" },
      FAILED:          { bg: C.redSoft,   fg: C.red,   label: "❌ Failed"           },
    };

    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{
          background: C.navy, padding: "0 24px", height: 52,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 2px 12px rgba(0,0,0,.2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, background: C.teal, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📥</div>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>Sunic Import Destuffing</span>
    
          </div>
            <button
  onClick={() => navigate("/")}
  style={{
    background: "rgba(243, 243, 243, 0.93)", border: "none", color: "#000000",
    padding: "6px 13px", borderRadius: 7, cursor: "pointer",
    fontWeight: 600, fontSize: 12,
  }}
>
  ← Home
</button>
          <Btn bg={C.slate} size="sm" onClick={fetchData}>🔄 Refresh</Btn>
        </div>

        <div style={{ padding: "20px 20px 40px" }}>
       <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
  {[
    { label: "Total",           value: data.length,          color: C.blue  },
    { label: "Pending",         value: pendingCount,         color: C.amber },
    { label: "Started",         value: startedCount,         color: C.green },
    { label: "Final Submitted", value: finalSubmittedCount,  color: C.teal  },
  ].map(s => (
    <div key={s.label} style={{
      background: C.bgCard, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "14px 18px",
      boxShadow: "0 1px 4px rgba(0,0,0,.07)",
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
      <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{s.label}</div>
    </div>
  ))}
</div>
<div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
  {[
    {
      key: "ACTIVE",
      label: `Active (${activeCount})`,
      color: C.green,
    },
    {
      key: "FINAL",
      label: `Final (${finalCount})`,
      color: C.teal,
    },
  ].map(({ key, label, color }) => (
    <button
      key={key}
      onClick={() => setActiveTab(key)}
      style={{
        padding: "8px 16px",
        borderRadius: 9,
        border: "none",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 12,
        background:
          activeTab === key
            ? color
            : "#e2e8f0",
        color:
          activeTab === key
            ? "#fff"
            : C.navy,
        transition: "all .15s",
      }}
    >
      {label}
    </button>
  ))}
</div>

          <div style={{ background: C.bgCard, borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,.06)", overflow: "hidden" }}>
            <div style={{ padding: "13px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h5 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.navy }}>
                Container Destuffing Records
                <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, color: C.muted, background: C.bg, padding: "2px 8px", borderRadius: 20 }}>
                  {filteredData.length}
                </span>
              </h5>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 56, color: C.muted }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                <div style={{ fontWeight: 600 }}>Loading records…</div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                  <thead>
                    <tr>
                      {["#", "Container No.", "FLG", "DJO Time", "Status", "Action"].map((h) => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ ...S.td, textAlign: "center", padding: 48, color: C.subtle }}>
                          <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                          No Records Found
                        </td>
                      </tr>
                    ) : filteredData.map((row, i) => {
                      const sc = statusConfig[row.DONE_STATUS] || { bg: C.bg, fg: C.muted, label: row.DONE_STATUS };
                      return (
                        <tr
                          key={row.ID}
                          style={{ background: i % 2 ? "#fafbfc" : "#fff" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#f0f6ff"}
                          onMouseLeave={(e) => e.currentTarget.style.background = i % 2 ? "#fafbfc" : "#fff"}
                        >
                          <td style={{ ...S.td, color: C.muted, fontWeight: 700, width: 34 }}>{i + 1}</td>
                          <td style={S.td}><strong style={{ color: C.blue, fontFamily: "monospace", fontSize: 13 }}>{row.CONTAINER_NO}</strong></td>
                          <td style={S.td}><span style={S.badge(row.FLG === "FCL" ? C.blue : C.cyan)}>{row.FLG}</span></td>
                          <td style={{ ...S.td, color: C.muted }}>{row.DJO_TIME ? new Date(row.DJO_TIME).toLocaleString() : "—"}</td>
                          <td style={S.td}><span style={S.badge(sc.bg, sc.fg)}>{sc.label}</span></td>
                          <td style={S.td}>
                            {row.DONE_STATUS === "FINAL_SUBMITTED" ? (
                              <Btn bg={C.teal} size="sm" onClick={() => setTallyId(row.ID)}>🧾 View Tally</Btn>
                            ) : row.DONE_STATUS === "STARTED" ? (
                              <Btn bg={C.green} size="sm" onClick={() => setDetailRow(row)}>👁 View</Btn>
                            ) : (
                              <Btn bg={C.blue} size="sm" disabled={loadingId === row.ID} onClick={() => handleStart(row.ID)}>
                                {loadingId === row.ID ? "Starting…" : "▶ Start"}
                              </Btn>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {detailRow && (
          <DestuffingDetailModal
            destuffingRow={detailRow}
            onClose={() => { setDetailRow(null); fetchData(); }}
            onTallyOpen={(id) => setTallyId(id)}
          />
        )}

        {tallyId && (
          <TallySheetModal destuffingId={tallyId} onClose={() => setTallyId(null)} />
        )}

        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        `}</style>
      </div>
    );
  }