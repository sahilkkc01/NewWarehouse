import React, { useEffect, useRef, useState } from "react";
import ExportMap from "./ExportMap";
import MezzanineMap from "./MezzanineMap";
import ImportMap from "./ImportMap";
import OycMap from "./OycMap";
import { OcrImgBaseUrl } from "../Config";
import Swal from "sweetalert2";

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
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isVisible) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, onClose]);

  useEffect(() => {
    if (isVisible && modalRef.current) {
      modalRef.current.focus();
    }
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
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="modal-backdrop fade show"
        onClick={onClose}
        style={{ zIndex: 1 }}
      ></div>
      <div
        className="modal-dialog modal-fullscreen"
        ref={modalRef}
        tabIndex={-1}
        style={{ zIndex: 99 }}
      >
        <div className="modal-content">
          <div className="modal-header bg-label-primary py-2">
            <h1 className="modal-title fs-5">{MapName} Map</h1>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            />
          </div>
         <div
  className="modal-body"
  style={{
    height: "90vh",
    overflow: "auto",
    background: "#f5f5f5",
    padding: "20px",
    position: "relative",
  }}
>
  <div
    style={{
      minWidth: "2500px",
      minHeight: "1400px",
      position: "relative",
    }}
  >
    {renderMap()}
  </div>
</div>
          <div className="modal-footer bg-label-primary py-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MapAreaModal = ({
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
}) => {
  const modalRef = useRef();
  const [row, setRow] = useState(0);
  const [col, setCol] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  const [OcrOccupied, setOcrOccupied] = useState({});
  const [Occupied, setOccupied] = useState([]);
  useEffect(() => {
    if (
      activeGridSelection?.warehouse_name == "Export" ||
      activeGridSelection?.warehouse_name == "Import"
    ) {
      setRow(5);
      setCol(4);
      setWidth("70px");
      setHeight("10vh");
    } else if (activeGridSelection?.warehouse_name == "OYC") {
      setRow(1);
      setCol(1);
      setWidth("250px");
      setHeight("40vh");
    } else if (activeGridSelection?.warehouse_name == "Mazzanine") {
      if (activeGridSelection?.area_boxes == "20") {
        setRow(5);
        setCol(4);
        setWidth("70px");
        setHeight("10vh");
      } else if (activeGridSelection?.area_boxes == "2") {
        setRow(1);
        setCol(2);
        setWidth("250px");
        setHeight("40vh");
      } else {
        setRow(1);
        setCol(1);
        setWidth("250px");
        setHeight("40vh");
      }
    } else {
      setRow(4);
      setCol(5);
      setWidth("50px");
      setHeight("10vh");
    }
    if (
      activeGridSelection?.ocr_grid_wise_occupied &&
      activeGridSelection?.ocr_occupied_area > 0
    ) {
      setOcrOccupied(
        JSON.parse(activeGridSelection?.ocr_grid_wise_occupied) ?? {}
      );
    }

    if (
      activeGridSelection?.ocr_occupied_area > 0 &&
      activeGridSelection?.occupied_area > 0 &&
     ( activeGridSelection?.carting_data?.length > 0 ||
      activeGridSelection?.destuffing_data?.length > 0)
    ) {
      let grid_allocation =
        JSON.parse(activeGridSelection?.grid_allocation) ?? {};
      let gridAllocation = [];
      {
        Object.entries(grid_allocation).forEach(([key, value]) => {
          if (!value) return;
          let parsedValues = [];
          if (Array.isArray(value)) {
            parsedValues = value;
          }
          if (!Array.isArray(value)) {
            try {
              parsedValues = JSON.parse(value);
            } catch (error) {
              return;
            }
          }
          if (!Array.isArray(parsedValues)) {
            try {
              parsedValues = JSON.parse(parsedValues);
            } catch (error) {
              return;
            }
          }
          if (Array.isArray(parsedValues)) {
            gridAllocation.push(parsedValues);
          }
        });
      }
      if (gridAllocation) {
        gridAllocation = gridAllocation.flat() ?? [];
        setOccupied(gridAllocation);
      }
    }
  }, [activeGridSelection]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose2();
    };

    if (isVisible2) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible2, onClose2]);

  useEffect(() => {
    if (isVisible2 && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isVisible2]);

  if (!isVisible2) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="modal-backdrop fade show"
        onClick={onClose2}
        style={{ zIndex: 1 }}
      ></div>
      <div
        className="modal-dialog modal-lg"
        ref={modalRef}
        tabIndex={-1}
        style={{ zIndex: 99 }}
      >
        <div className="modal-content">
          <div className="modal-header bg-label-primary py-2">
            <h1 className="modal-title fs-5">
              {activeGridSelection?.location_code} Map
            </h1>
            <button
              type="button"
              className="btn-close"
              onClick={onClose2}
              aria-label="Close"
            />
          </div>
          <div className="modal-body">
            <h2>{activeGridSelection?.location_code}</h2>
            {/* <p>{JSON.stringify(gridArea)}</p> 
            <p>{JSON.stringify(SelectedGrids)}</p>*/}
            <div className="d-flex align-items-center justify-content-center">
              <div style={{ width: "260px" }}>
                <div className="main bg-dark p-1 d-flex flex-column border-light border border-2 position-relative w-auto">
                  {[...Array(row)].map((_, rowIndex) => (
                    <div key={rowIndex} className="d-flex">
                      {[...Array(col)].map((_, colIndex) => {
                        const cellValue = rowIndex * 4 + colIndex + 1;
                       const isSelected =
(
  Array.isArray(gridArea)
    ? gridArea.map(String)
    : []
).includes(
  String(cellValue)
);
                      let color = "bg-secondary";

// spill over
if (
  OcrOccupied &&
  OcrOccupied?.data?.[cellValue - 1] &&
  OcrOccupied?.data?.[cellValue - 1] == "F"
) {
  color = "bg-info";
}

// selected current
if (
  isSelected &&
  activeGridSelection?.warehouse_name != "OYC"
) {
  color = "bg-success";
}

if (
  isSelected &&
  activeGridSelection?.warehouse_name == "OYC"
) {
  color = "bg-danger";
}

// already selected
if (
  SelectedGrids &&
  SelectedGrids[
    activeGridSelection?.new_location_code
  ] &&
  activeGridSelection?.warehouse_name != "OYC"
) {

  let sc =
    SelectedGrids[
      activeGridSelection?.new_location_code
    ]?.includes(cellValue);

  if (sc) {
    color = "bg-danger";
  }
}
console.log(Occupied)
// OCCUPIED MUST BE LAST (highest priority)
if (
  Occupied &&
  Occupied.includes(cellValue) &&
  activeGridSelection?.warehouse_name != "OYC"
) {
  color = "bg-purple";
}
                        return (
                          <button
                            key={colIndex}
                           className={`border border-light rounded text-white d-flex align-items-center justify-content-center
  ${
    color === "bg-purple"
      ? ""
      : color
  }
`}
            style={{
  height: height,
  width: width,
  fontSize: "18px",
  backgroundColor:
    color === "bg-purple"
      ? "#8f51dd"
      : undefined,
  border:
    color === "bg-purple"
      ? "2px solid #8f51dd"
      : undefined,
}}
                           onClick={() => {

  let newLoc =
    activeGridSelection?.new_location_code;


  // occupied purple block NOT selectable
  if (
    Occupied.includes(cellValue) &&
    activeGridSelection?.warehouse_name != "OYC"
  ) {

    Swal.fire({
      icon: "warning",
      title: "Occupied Grid",
      text: "This grid is occupied.",
      timer: 1500,
      showConfirmButton: false,
    });

    return;
  }

  // ONLY available + spillover selectable
 setGridArea(
  String(cellValue)
);

  setSelectedGrids((prev) => {

    const locationCode =
      activeGridSelection?.new_location_code;

    const current =
      prev[locationCode] || [];

    const exists =
      current.includes(cellValue);

    const updated = exists
      ? current.filter(
          (val) => val !== cellValue
        )
      : [...current, cellValue];

    return {
      ...prev,
      [locationCode]: updated,
    };
  });
}}
                          >
                            {activeGridSelection?.warehouse_name == "OYC" ||
                            (activeGridSelection?.warehouse_name ==
                              "Mazzanine" &&
                              activeGridSelection?.area_boxes != "20")
                              ? activeGridSelection?.location_code
                              : cellValue}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-md-12 my-4">
              <img
                src={OcrImgBaseUrl + activeGridSelection?.ocr_image}
                className="w-50"
                alt=""
              />
            </div>
          </div>
          <div className="modal-footer bg-label-primary py-2">
           <div className="modal-footer bg-label-primary py-2">

<button
  className="btn btn-success"
  onClick={() => {

    if (
      !gridArea?.length
    ) {

      Swal.fire({
        icon: "warning",
        text: "Select Grid First",
      });

      return;
    }

    if (
      window
        .handleConfirmGrids
    ) {

      window
        .handleConfirmGrids();
    }
  }}
>
  Save Grid
</button>

  <button
    type="button"
    className="btn btn-secondary"
    onClick={onClose2}
  >
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
