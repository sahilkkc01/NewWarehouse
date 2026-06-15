import React, { useEffect, useRef, useState } from "react";
import ExportMap from "./ExportMap";
import MezzanineMap from "./MezzanineMap";
import ImportMap from "./ImportMap";
import OycMap from "./OycMap";
import { OcrImgBaseUrl } from "../Config";
import Swal from "sweetalert2";

/* ─────────────────── MapModal (unchanged) ─────────────────── */
const MapModal = ({
  isVisible,
  onClose,
  MapName,
  setActiveGridSelection,
  activeGridSelection,
  setModalVisible2,
  SelectedGrids,
  setSelectedGrids,
}) => {
  const modalRef = useRef();

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    if (isVisible) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, onClose]);

  useEffect(() => {
    if (isVisible && modalRef.current) modalRef.current.focus();
  }, [isVisible]);

  if (!isVisible) return null;

  const renderMap = () => {
    switch (MapName) {
      case "Import":
        return (
          <ImportMap
            setActiveGridSelection={setActiveGridSelection}
            activeGridSelection={activeGridSelection}
            onClose={onClose}
            setModalVisible2={setModalVisible2}
            SelectedGrids={SelectedGrids}
            setSelectedGrids={setSelectedGrids}
          />
        );
      case "Export":
        return (
          <ExportMap
            setActiveGridSelection={setActiveGridSelection}
            activeGridSelection={activeGridSelection}
            onClose={onClose}
            setModalVisible2={setModalVisible2}
            SelectedGrids={SelectedGrids}
            setSelectedGrids={setSelectedGrids}
          />
        );
      case "Mazzanine":
        return (
          <MezzanineMap
            setActiveGridSelection={setActiveGridSelection}
            activeGridSelection={activeGridSelection}
            onClose={onClose}
            setModalVisible2={setModalVisible2}
            SelectedGrids={SelectedGrids}
            setSelectedGrids={setSelectedGrids}
          />
        );
      case "OYC":
        return (
          <OycMap
            setActiveGridSelection={setActiveGridSelection}
            activeGridSelection={activeGridSelection}
            onClose={onClose}
            setModalVisible2={setModalVisible2}
            SelectedGrids={SelectedGrids}
            setSelectedGrids={setSelectedGrids}
          />
        );
      default:
        return <p>No map selected.</p>;
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex={-1} aria-modal="true" role="dialog">
      <div className="modal-backdrop fade show" onClick={onClose} style={{ zIndex: 1 }} />
      <div className="modal-dialog modal-fullscreen" ref={modalRef} tabIndex={-1} style={{ zIndex: 99 }}>
        <div className="modal-content">
          <div className="modal-header bg-label-primary py-2">
            <h1 className="modal-title fs-5">{MapName} Map</h1>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div
            className="modal-body"
            style={{ height: "90vh", overflow: "auto", background: "#f5f5f5", padding: "20px", position: "relative" }}
          >
            {MapName === "OYC" ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {renderMap()}
              </div>
            ) : (
              <div style={{ minWidth: "2500px", minHeight: "1400px", position: "relative" }}>
                {renderMap()}
              </div>
            )}
          </div>
          <div className="modal-footer bg-label-primary py-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────── MapAreaModal ─────────────────── */
/*
  NEW PROP: mapData  — the full array of location objects from the map
            (same `Data` state that ExportMap/ImportMap/etc. fetch).
            Pass it from the parent so this modal can look up the exact
            OCR fields for the current location_code at any time,
            including when opening via Edit where activeGridSelection
            may not carry ocr_grid_wise_occupied.

  Grid coloring priority (highest wins):
    1. OCCUPIED_BY_OTHERS  purple #8f51dd  — another row ID owns it, blocked
    2. SELECTED_OWN        green           — currently toggled on by user
    3. LEGACY_OCCUPIED     purple #8f51dd  — old carting data, blocked
    4. OCR_FREE_SPILLOVER  cyan            — OCR reports free
    5. DEFAULT             gray

  KEY FIX for "deselect → should go back to spillover colour":
    The color for an un-selected grid is derived from the LIVE map data
    (mapData lookup), not from what was in activeGridSelection at open time.
    So deselecting a spillover grid correctly reverts it to cyan.
*/
const MapAreaModal = ({
  ocrGridWiseOccupied,
  ocrImage,
  warehouseSelections,
  setWarehouseSelections,
  ModalIds,
  MapName,
  isVisible2,
  onClose2,
  activeGridSelection,
  setGridArea,
  gridArea,
  SelectedGrids,
  setSelectedGrids,
  manualArea,
  setManualArea,
  locationAllocationMap,
  currentRowId,
  /* NEW: full array of location objects from the active map's API response */
  mapData = [],
}) => {
  const modalRef = useRef();
  const [row,    setRow]    = useState(0);
  const [col,    setCol]    = useState(0);
  const [width,  setWidth]  = useState(0);
  const [height, setHeight] = useState(0);

  const [OcrOccupied, setOcrOccupied] = useState({});
  const [Occupied,    setOccupied]    = useState([]);

  /* ── helpers ─────────────────────────────────────────────────── */

  /*
   * Look up the live location record from mapData for the currently
   * selected location_code. Falls back to activeGridSelection itself
   * so nothing breaks if mapData is not yet wired up.
   */
  const liveLocationData = React.useMemo(() => {
    if (!activeGridSelection?.location_code) return activeGridSelection ?? {};
    const code = activeGridSelection.location_code.toLowerCase();
    const found = mapData.find(
      (d) =>
        (d.location_code ?? d.camera_locations ?? "").toLowerCase() === code
    );
    return found ?? activeGridSelection ?? {};
  }, [mapData, activeGridSelection]);

  /* Grids occupied by OTHER row IDs */
  const othersOccupiedGrids = React.useMemo(() => {
    const result = new Set();
    if (!locationAllocationMap || typeof locationAllocationMap !== "object") return result;
    const currentKey = currentRowId != null ? String(currentRowId) : null;
    Object.entries(locationAllocationMap).forEach(([id, grids]) => {
      if (currentKey && id === currentKey) return;
      (Array.isArray(grids) ? grids : []).forEach((g) => result.add(Number(g)));
    });
    return result;
  }, [locationAllocationMap, currentRowId]);

  /*
   * OCR-free cell numbers derived from the LIVE location data.
   * Using liveLocationData means:
   *   • On first open the data comes from the map's API response.
   *   • After deselect the same source is consulted, so a formerly-
   *     selected spillover cell correctly reverts to cyan.
   */
  const ocrFreeCells = React.useMemo(() => {
    const free = new Set();


    let parsed;
    try {
      parsed =
        typeof liveLocationData.ocr_grid_wise_occupied === "string"
          ? JSON.parse(liveLocationData.ocr_grid_wise_occupied)
          : liveLocationData.ocr_grid_wise_occupied;
    } catch {
      return free;
    }
    const data = parsed?.data;
    if (!data || typeof data !== "object") return free;
    Object.entries(data).forEach(([key, value]) => {
      if (value === "F") free.add(Number(key) + 1); // key is 0-based
    });
    return free;
  }, [liveLocationData]);

  /* ── effects ──────────────────────────────────────────────────── */

  useEffect(() => {
    /* Reset so previous location's state never bleeds through */
    setOcrOccupied({});
    setOccupied([]);

    if (!activeGridSelection) return;

    /* Grid dimensions */
    if (
      activeGridSelection.warehouse_name === "Export" ||
      activeGridSelection.warehouse_name === "Import"
    ) {
      setRow(5); setCol(4); setWidth("70px"); setHeight("10vh");
    } else if (activeGridSelection.warehouse_name === "OYC") {
      setRow(1); setCol(1); setWidth("250px"); setHeight("40vh");
    } else if (activeGridSelection.warehouse_name === "Mazzanine") {
      if (activeGridSelection.area_boxes === "20") {
        setRow(5); setCol(4); setWidth("70px"); setHeight("10vh");
      } else if (activeGridSelection.area_boxes === "2") {
        setRow(1); setCol(2); setWidth("250px"); setHeight("40vh");
      } else {
        setRow(1); setCol(1); setWidth("250px"); setHeight("40vh");
      }
    } else {
      setRow(4); setCol(5); setWidth("50px"); setHeight("10vh");
    }

    /* Legacy carting/destuffing occupied grids (for the Occupied state,
       still use liveLocationData so we always get the freshest copy) */
    const src = liveLocationData;
    if (
      src.ocr_occupied_area > 0 &&
      src.occupied_area > 0 &&
      (src.carting_data?.length > 0 || src.destuffing_data?.length > 0)
    ) {
      let grid_allocation = {};
      try {
        grid_allocation =
          typeof src.grid_allocation === "string"
            ? JSON.parse(src.grid_allocation) ?? {}
            : src.grid_allocation ?? {};
      } catch {
        grid_allocation = {};
      }

      let gridAllocation = [];
      Object.entries(grid_allocation).forEach(([, value]) => {
        if (!value) return;
        let parsedValues = Array.isArray(value) ? value : [];
        if (!Array.isArray(value)) {
          try { parsedValues = JSON.parse(value); } catch { return; }
        }
        if (!Array.isArray(parsedValues)) {
          try { parsedValues = JSON.parse(parsedValues); } catch { return; }
        }
        if (Array.isArray(parsedValues)) gridAllocation.push(parsedValues);
      });
      setOccupied(gridAllocation.flat());
    }
  }, [activeGridSelection, liveLocationData]);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === "Escape") onClose2(); };
    if (isVisible2) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isVisible2, onClose2]);

  useEffect(() => {
    if (isVisible2 && modalRef.current) modalRef.current.focus();
  }, [isVisible2]);

  /* All hooks above — early return is safe here */
  if (!isVisible2) return null;

  /* ── render ───────────────────────────────────────────────────── */
  return (
    <div className="modal fade show d-block" tabIndex={-1} aria-modal="true" role="dialog">
      <div className="modal-backdrop fade show" onClick={onClose2} style={{ zIndex: 1 }} />
      <div className="modal-dialog modal-lg" ref={modalRef} tabIndex={-1} style={{ zIndex: 99 }}>
        <div className="modal-content">

          <div className="modal-header bg-label-primary py-2">
            <h1 className="modal-title fs-5">{activeGridSelection?.location_code} Map</h1>
            <button type="button" className="btn-close" onClick={onClose2} aria-label="Close" />
          </div>

          <div className="modal-body">
            <h2>{activeGridSelection?.location_code}</h2>

            {/* Legend */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, fontSize: 12 }}>
              {[
                { bg: "#6c757d", label: "Available" },
                { bg: "#0dcaf0", label: "OCR free (spillover)" },
                { bg: "#198754", label: "Selected (yours)" },
                { bg: "#8f51dd", label: "Occupied by another allocation" },
              ].map(({ bg, label }) => (
                <span key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 3, background: bg, display: "inline-block" }} />
                  {label}
                </span>
              ))}
            </div>

            {/* Grid */}
            <div className="d-flex align-items-center justify-content-center">
              <div style={{ width: "260px" }}>
                <div className="main bg-dark p-1 d-flex flex-column border-light border border-2 position-relative w-auto">
                  {[...Array(row)].map((_, rowIndex) => (
                    <div key={rowIndex} className="d-flex">
                      {[...Array(col)].map((_, colIndex) => {
                        const cellValue = rowIndex * col + colIndex + 1;

                        // a) Another allocation owns this grid
                        const isOccupiedByOther =
                          othersOccupiedGrids.has(Number(cellValue)) &&
                          activeGridSelection?.warehouse_name !== "OYC";

                        // b) Currently selected by this user
                        const isSelected = (
                          Array.isArray(gridArea) ? gridArea.map(String) : []
                        ).includes(String(cellValue));

                        // c) Legacy occupied (old carting data)
                        const isLegacyOccupied =
                          Occupied.includes(cellValue) &&
                          activeGridSelection?.warehouse_name !== "OYC";

                        // d) OCR reports free — derived from LIVE map data
                        //    so deselecting a spillover grid reverts to cyan
                        const isOcrFree =
                          ocrFreeCells.has(cellValue) &&
                          activeGridSelection?.warehouse_name !== "OYC";

                        /* Priority chain */
                        let bgClass = "bg-secondary";
                        let inlineStyle = {};
                        let notClickable = false;

                        if (isOccupiedByOther) {
                          bgClass = "";
                          inlineStyle = { backgroundColor: "#8f51dd", border: "2px solid #6b21a8" };
                          notClickable = true;
                        } else if (isSelected) {
                          bgClass = "bg-success";
                        } else if (isLegacyOccupied) {
                          bgClass = "";
                          inlineStyle = { backgroundColor: "#8f51dd", border: "2px solid #6b21a8" };
                          notClickable = true;
                        } else if (isOcrFree) {
                          // Not selected + OCR says free → spillover cyan
                          bgClass = "bg-info";
                        }
                        // else → bg-secondary (available/gray)

                        const displayLabel =
                          activeGridSelection?.warehouse_name === "OYC" ||
                          (activeGridSelection?.warehouse_name === "Mazzanine" &&
                            activeGridSelection?.area_boxes !== "20")
                            ? activeGridSelection?.location_code
                            : cellValue;

                        return (
                          <button
                            key={colIndex}
                            className={`border border-light rounded text-white d-flex align-items-center justify-content-center ${bgClass}`}
                            style={{
                              height,
                              width,
                              fontSize: "18px",
                              cursor: notClickable ? "not-allowed" : "pointer",
                              opacity: notClickable ? 0.85 : 1,
                              ...inlineStyle,
                            }}
                            title={
                              notClickable
                                ? isOccupiedByOther
                                  ? `Grid ${cellValue} is allocated to another record`
                                  : `Grid ${cellValue} is occupied`
                                : isOcrFree && !isSelected
                                  ? `Grid ${cellValue} — OCR free (spillover)`
                                  : undefined
                            }
                            onClick={() => {
                              if (notClickable) {
                                Swal.fire({
                                  icon: "warning",
                                  title: isOccupiedByOther ? "Grid Occupied" : "Occupied Grid",
                                  text: isOccupiedByOther
                                    ? `Grid ${cellValue} is already allocated to another record.`
                                    : "This grid is occupied.",
                                  timer: 1800,
                                  showConfirmButton: false,
                                });
                                return;
                              }

                              setGridArea(String(cellValue));

                              setSelectedGrids((prev) => {
                                const locationCode = activeGridSelection?.new_location_code;
                                const current = prev[locationCode] || [];
                                const exists  = current.includes(cellValue);
                                const updated = exists
                                  ? current.filter((val) => val !== cellValue)
                                  : [...current, cellValue];
                                return { ...prev, [locationCode]: updated };
                              });
                            }}
                          >
                            {displayLabel}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* OCR image — always show when available */}
            {(liveLocationData?.ocr_image || activeGridSelection?.ocr_image) && (
              <div className="col-md-12 my-4">
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                  OCR snapshot for{" "}
                  <strong>{activeGridSelection?.location_code}</strong>
                </p>
                <img
                  src={OcrImgBaseUrl + (liveLocationData?.ocr_image ?? activeGridSelection?.ocr_image)}
                  className="w-50"
                  alt={`OCR for ${activeGridSelection?.location_code}`}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer bg-label-primary py-2">
            {activeGridSelection?.warehouse_name === "OYC" && (
              <div className="mb-3 w-100">
                <label className="form-label fw-bold">Enter Area</label>
                <input
                  type="number"
                  min={1}
                  value={manualArea}
                  onChange={(e) => setManualArea(e.target.value)}
                  className="form-control"
                  placeholder="Enter Area"
                />
              </div>
            )}
            <div className="d-flex gap-2">
              <button
                className="btn btn-success"
                onClick={() => {
                  if (!gridArea?.length) {
                    Swal.fire({ icon: "warning", text: "Select Grid First" });
                    return;
                  }
                  if (window.handleConfirmGrids) window.handleConfirmGrids();
                }}
              >
                Save Grid
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose2}>
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export { MapModal, MapAreaModal };