import axios from "axios";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import Swal from "sweetalert2";
import Legend from "./Legend";
import { ApiBaseUrl } from "../Config";

export default function ExportMap({
  setActiveGridSelection,
  activeGridSelection,
  onClose,
  setModalVisible2,
  SelectedGrids,
  setSelectedGrids
}) {
  const [zoomLevel, setZoomLevel] = useState(0.4);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const transformRef = useRef(null);
  const contentRef = useRef(null);
  const customStyles = {
    marginTop: "0px",
    height: "25vh",
    width: "160px",
    backgroundColor: "#f0f0f0", //"#f0f0f0",
    borderRadius: "0px",
    border: "none", // Extra styling
  };
  const CustomStyles = {
    marginTop: "0px",
    height: "25vh",
    width: "130px",
    backgroundColor: "#f0f0f0", //"#f0f0f0",
    borderRadius: "0px",
    border: "none", // Extra styling
  };

  // 🏆 1. Using requestAnimationFrame for Smooth Zooming
  const handleWheel = useCallback((event) => {
    event.preventDefault();
    if (!containerRef.current) return;

    if (containerRef.current) {
      cancelAnimationFrame(containerRef.current);
    }

    containerRef.current = requestAnimationFrame(() => {
      const zoomFactor = event.deltaY > 0 ? 0.85 : 1.1;
      setZoomLevel((prevZoom) =>
        Math.max(0.5, Math.min(prevZoom * zoomFactor, 5))
      );
      containerRef.current = null;
    });
  }, []);

  // 🏆 2. Optimized Mouse Dragging
  const handleMouseDown = (event) => {
    setIsDragging(true);
    setStartPos({
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    });
  };

  const handleMouseMove = (event) => {
    if (!isDragging) return;
    requestAnimationFrame(() => {
      setPosition({
        x: event.clientX - startPos.x,
        y: event.clientY - startPos.y,
      });
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 🏆 3. Attaching Event Listeners Efficiently
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleWheel]); // Only re-run when handleWheel changes

  const [Data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const GetData = async () => {
    setLoading(true);
    const url = `${ApiBaseUrl}export/map/data?name=Export`;
    try {
      const response = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.data && response.data.data) {
        setData(response.data.data);
      } else {
        Swal.fire({
          icon: "Info",
          text: `Something Want Wrong..!`,
          timer: 3000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        text: `Error in Data Fetch: ${error.message}`,
        timer: 3000,
        showConfirmButton: false,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    GetData();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [TotalArea, setTotalArea] = useState(0);

const handleGridClick = useCallback(
  (event, data) => {

    const gridBox =
      event.target.closest(".main");

    if (!gridBox) return;

    const locationId =
      gridBox.querySelector("span")?.id;

    if (!locationId) return;

    const clickedData = Data.find(
      (data) =>
        (
          data.location_code?.toLowerCase() ??
          data.camera_locations?.toLowerCase()
        ) === locationId
    );

   if (clickedData) {

  setSelectedGrids((prev) => ({
    ...prev,
    [clickedData.new_location_code]:
      [],
  }));

  setActiveGridSelection({
    ...clickedData,
    map_type: "Export",
    location_code:
      clickedData.location_code ??
      clickedData.camera_locations,
  });

  onClose();

  setModalVisible2(true);
}
  },
  [Data]
);

  const setBackgroundColor = useCallback((id, color) => {
    const element = document.getElementById(id);
    if (element) {
      element.style.setProperty("background-color", color, "important");
    }
  }, []);

  useEffect(() => {
    if (!Array.isArray(Data)) return;

    let TotalAreaSum = 0;
    const cleanup = [];

    const updateColors = () => {
      Data.forEach((data) => {
        if (!data?.camera_locations) return;

        const {
          camera_locations,
          location_code,
          total_area = 20,
          occupied_area = 0,
          ocr_occupied_area = 0,
        } = data;

        const grid_allocation = JSON.parse(data?.grid_allocation) ?? {};
        const carting_data = data?.carting_data ?? [];
        const ocr_grid_wise_occupied =
          JSON.parse(data?.ocr_grid_wise_occupied) ?? {};
        const myGrid = document.getElementById(
          String(location_code ?? camera_locations)
        );
        if (myGrid) {
          myGrid.textContent = location_code ?? camera_locations;
        }


        if (ocr_occupied_area > 0) {
          {
            Object.entries(ocr_grid_wise_occupied?.data).forEach(
              ([key, value]) => {
                if (!value) return;
                key = Number(key);
                if (value == "F") {
                  setBackgroundColor(
                    `${location_code?.toLowerCase()}_${key + 1}`,
                    "#00b0c4"
                  );
                  
                }
              }
            );
          }
        }

        if (
          ocr_occupied_area > 0 &&
          occupied_area > 0 &&
          carting_data?.length > 0
        ) {
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
              parsedValues.forEach((v) => {
              setBackgroundColor(
  `${location_code?.toLowerCase()}_${v}`,
  "#8f51dd"
);

const occupiedElement =
  document.getElementById(
    `${location_code?.toLowerCase()}_${v}`
  );

if (occupiedElement) {
  occupiedElement.setAttribute(
    "data-occupied",
    "true"
  );
}
              });
            });
          }
        }
        TotalAreaSum += Number(total_area);
      });

      setTotalArea(TotalAreaSum);
    };

    document.addEventListener("click", handleGridClick);
    cleanup.push(() => document.removeEventListener("click", handleGridClick));

    requestAnimationFrame(updateColors);

    return () => {
      cleanup.forEach((fn) => fn());
    };
  }, [Data, handleGridClick, setBackgroundColor]);

  return (
    <>
      {loading && (
        <div
          className="d-flex justify-content-center align-items-center position-fixed top-0 start-0 w-100 h-100"
          style={{ zIndex: 9999 }}
        >
          <div className="sk-chase sk-primary display-1">
            <div className="sk-chase-dot" />
            <div className="sk-chase-dot" />
            <div className="sk-chase-dot" />
            <div className="sk-chase-dot" />
            <div className="sk-chase-dot" />
            <div className="sk-chase-dot" />
          </div>
        </div>
      )}
      <Legend totalArea={TotalArea} />

      <div>
        <style>
          {`
          .transform-component-module_wrapper__SPB86 {
            height: 100% !important;
            width: 100% !important;
             will-change: transform;
             background-color:#f0f0f0;
  transform: translate3d(0, 0, 0); /* For hardware acceleration */
  backface-visibility: hidden;
  
          }
        `}
        </style>
        <div
          style={{
            height: "100%",
            width: "100%",
            paddingLeft: "10px",
            paddingTop: "10px",
          }}
        >
          <TransformWrapper
            ref={transformRef}
            minScale={0.3}
            maxScale={9}
            limitToBounds={false}
            initialScale={0.3}
            smooth={false}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <TransformComponent>
                  <div
                    id="zoom-container"
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      cursor: "grab",
                    }}
                  >
                    <div className="layout-wrapper layout-content-navbar">
                      <div className="layout-container">
                        <div className="layout-page">
                          <div className="content-wrapper">
                            <div className="m-auto vh-100 vw-100">
                              {/* Fixed Zoom Buttons at the Top Center */}
                              {/* <div className="d-flex gap-3 p-2 bg-light shadow position-fixed top-0 start-50 translate-middle-x rounded mt-2 z-3">
                    <button
                        onClick={handleZoomIn}
                        className="btn btn-success"
                    >
                        +
                    </button>
                    <input
                        type="range"
                        min="0.4"
                        max="5"
                        step="0.2"
                        value={zoomLevel}
                        onChange={handleZoomChange}
                        className="form-range"
                        style={{ width: "150px" }}
                    />
                    <button
                        onClick={handleZoomOut}
                        className="btn btn-danger"
                    >
                        -
                    </button>
                </div> */}

                              {/* Full-Screen Map */}
                              <div
                                style={{
                                  cursor: "grab",
                                  overflow: "hidden",
                                  userSelect: "none",
                                }}
                              >
                                <div className="position-fixed top-0 start-0 w-100 h-100 bg-center">
                                  <h1 className="text-center"></h1>
                                  <div className="d-flex  mb-0 mt-5">
                                    <div className="main  py-1 px-1 bg-dark d-flex flex-column  border-light border border-2 position-relative">
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="zs90"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          fontSize: "10px",
                                        }}
                                      >
                                        ZS90
                                      </span>

                                      {/* Static content for each row */}
                                      <div className="d-flex ">
                                        <div
                                          id="zs90_1"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          1
                                        </div>
                                        <div
                                          id="zs90_2"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          2
                                        </div>
                                        <div
                                          id="zs90_3"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          3
                                        </div>
                                        <div
                                          id="zs90_4"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          4
                                        </div>
                                        <div
                                          id="zs90_5"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          5
                                        </div>
                                      </div>

                                      <div className="d-flex ">
                                        <div
                                          id="zs90_6"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          6
                                        </div>
                                        <div
                                          id="zs90_7"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          7
                                        </div>
                                        <div
                                          id="zs90_8"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          8
                                        </div>
                                        <div
                                          id="zs90_9"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          9
                                        </div>
                                        <div
                                          id="zs90_10"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          10
                                        </div>
                                      </div>

                                      <div className="d-flex ">
                                        <div
                                          id="zs90_11"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          11
                                        </div>
                                        <div
                                          id="zs90_12"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          12
                                        </div>
                                        <div
                                          id="zs90_13"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          13
                                        </div>
                                        <div
                                          id="zs90_14"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          14
                                        </div>
                                        <div
                                          id="zs90_15"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          15
                                        </div>
                                      </div>

                                      <div className="d-flex ">
                                        <div
                                          id="zs90_16"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          16
                                        </div>
                                        <div
                                          id="zs90_17"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          17
                                        </div>
                                        <div
                                          id="zs90_18"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          18
                                        </div>
                                        <div
                                          id="zs90_19"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          19
                                        </div>
                                        <div
                                          id="zs90_20"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          20
                                        </div>
                                      </div>
                                    </div>
                                    <div
                                      className="main  py-1 px-1 bg-light  border-light border border-2"
                                      style={{
                                        width: "14em",
                                        marginRight: "190px",
                                      }}
                                    ></div>

                                    <div className="main py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative">
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="zt90"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          fontSize: "10px",
                                        }}
                                      >
                                        ZT90
                                      </span>

                                      {/* Static content for each row */}
                                      <div className="d-flex">
                                        <div
                                          id="zt90_1"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          1
                                        </div>
                                        <div
                                          id="zt90_2"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          2
                                        </div>
                                        <div
                                          id="zt90_3"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          3
                                        </div>
                                        <div
                                          id="zt90_4"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          4
                                        </div>
                                        <div
                                          id="zt90_5"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          5
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zt90_6"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          6
                                        </div>
                                        <div
                                          id="zt90_7"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          7
                                        </div>
                                        <div
                                          id="zt90_8"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          8
                                        </div>
                                        <div
                                          id="zt90_9"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          9
                                        </div>
                                        <div
                                          id="zt90_10"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          10
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zt90_11"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          11
                                        </div>
                                        <div
                                          id="zt90_12"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          12
                                        </div>
                                        <div
                                          id="zt90_13"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          13
                                        </div>
                                        <div
                                          id="zt90_14"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          14
                                        </div>
                                        <div
                                          id="zt90_15"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          15
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zt90_16"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          16
                                        </div>
                                        <div
                                          id="zt90_17"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          17
                                        </div>
                                        <div
                                          id="zt90_18"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          18
                                        </div>
                                        <div
                                          id="zt90_19"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          19
                                        </div>
                                        <div
                                          id="zt90_20"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          20
                                        </div>
                                      </div>
                                    </div>

                                    <div className="main  py-1 px-1 bg-dark d-flex flex-column  border-light border border-2 position-relative">
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="zt91"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          fontSize: "10px",
                                        }}
                                      >
                                        ZT91
                                      </span>

                                      {/* Static content for each row */}
                                      <div className="d-flex ">
                                        <div
                                          id="zt91_1"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          1
                                        </div>
                                        <div
                                          id="zt91_2"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          2
                                        </div>
                                        <div
                                          id="zt91_3"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          3
                                        </div>
                                        <div
                                          id="zt91_4"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          4
                                        </div>
                                        <div
                                          id="zt91_5"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          5
                                        </div>
                                      </div>

                                      <div className="d-flex ">
                                        <div
                                          id="zt91_6"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          6
                                        </div>
                                        <div
                                          id="zt91_7"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          7
                                        </div>
                                        <div
                                          id="zt91_8"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          8
                                        </div>
                                        <div
                                          id="zt91_9"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          9
                                        </div>
                                        <div
                                          id="zt91_10"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          10
                                        </div>
                                      </div>

                                      <div className="d-flex ">
                                        <div
                                          id="zt91_11"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          11
                                        </div>
                                        <div
                                          id="zt91_12"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          12
                                        </div>
                                        <div
                                          id="zt91_13"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          13
                                        </div>
                                        <div
                                          id="zt91_14"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          14
                                        </div>
                                        <div
                                          id="zt91_15"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          15
                                        </div>
                                      </div>

                                      <div className="d-flex ">
                                        <div
                                          id="zt91_16"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          16
                                        </div>
                                        <div
                                          id="zt91_17"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          17
                                        </div>
                                        <div
                                          id="zt91_18"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          18
                                        </div>
                                        <div
                                          id="zt91_19"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          19
                                        </div>
                                        <div
                                          id="zt91_20"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          20
                                        </div>
                                      </div>
                                    </div>

                                    <div className="main py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative">
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="zt92"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          fontSize: "10px",
                                        }}
                                      >
                                        ZT92
                                      </span>

                                      {/* Static content for each row */}
                                      <div className="d-flex">
                                        <div
                                          id="zt92_1"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          1
                                        </div>
                                        <div
                                          id="zt92_2"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          2
                                        </div>
                                        <div
                                          id="zt92_3"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          3
                                        </div>
                                        <div
                                          id="zt92_4"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          4
                                        </div>
                                        <div
                                          id="zt92_5"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          5
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zt92_6"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          6
                                        </div>
                                        <div
                                          id="zt92_7"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          7
                                        </div>
                                        <div
                                          id="zt92_8"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          8
                                        </div>
                                        <div
                                          id="zt92_9"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          9
                                        </div>
                                        <div
                                          id="zt92_10"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          10
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zt92_11"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          11
                                        </div>
                                        <div
                                          id="zt92_12"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          12
                                        </div>
                                        <div
                                          id="zt92_13"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          13
                                        </div>
                                        <div
                                          id="zt92_14"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          14
                                        </div>
                                        <div
                                          id="zt92_15"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          15
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zt92_16"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          16
                                        </div>
                                        <div
                                          id="zt92_17"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          17
                                        </div>
                                        <div
                                          id="zt92_18"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          18
                                        </div>
                                        <div
                                          id="zt92_19"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          19
                                        </div>
                                        <div
                                          id="zt92_20"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          20
                                        </div>
                                      </div>
                                    </div>

                                    <div
                                      className=" bg-light"
                                      style={{
                                        height: "20vh",
                                        width: "20em",
                                        marginRight: "255px",
                                      }}
                                    ></div>

                                    <div className="main bg-dark py-1 px-1 d-flex flex-column border-light border border-2 position-relative">
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="zv90"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          fontSize: "10px",
                                        }}
                                      >
                                        ZV90
                                      </span>

                                      {/* Static content for each row */}
                                      <div className="d-flex">
                                        <div
                                          id="zv90_1"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          1
                                        </div>
                                        <div
                                          id="zv90_2"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          2
                                        </div>
                                        <div
                                          id="zv90_3"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          3
                                        </div>
                                        <div
                                          id="zv90_4"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          4
                                        </div>
                                        <div
                                          id="zv90_5"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          5
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zv90_6"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          6
                                        </div>
                                        <div
                                          id="zv90_7"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          7
                                        </div>
                                        <div
                                          id="zv90_8"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          8
                                        </div>
                                        <div
                                          id="zv90_9"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          9
                                        </div>
                                        <div
                                          id="zv90_10"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          10
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zv90_11"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          11
                                        </div>
                                        <div
                                          id="zv90_12"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          12
                                        </div>
                                        <div
                                          id="zv90_13"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          13
                                        </div>
                                        <div
                                          id="zv90_14"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          14
                                        </div>
                                        <div
                                          id="zv90_15"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          15
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zv90_16"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          16
                                        </div>
                                        <div
                                          id="zv90_17"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          17
                                        </div>
                                        <div
                                          id="zv90_18"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          18
                                        </div>
                                        <div
                                          id="zv90_19"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          19
                                        </div>
                                        <div
                                          id="zv90_20"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          20
                                        </div>
                                      </div>
                                    </div>

                                    <div className="main bg-dark py-1 px-1 d-flex flex-column border-light border border-2 position-relative">
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="zv91"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          fontSize: "10px",
                                        }}
                                      >
                                        ZV91
                                      </span>

                                      {/* Static content for each row */}
                                      <div className="d-flex">
                                        <div
                                          id="zv91_1"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          1
                                        </div>
                                        <div
                                          id="zv91_2"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          2
                                        </div>
                                        <div
                                          id="zv91_3"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          3
                                        </div>
                                        <div
                                          id="zv91_4"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          4
                                        </div>
                                        <div
                                          id="zv91_5"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          5
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zv91_6"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          6
                                        </div>
                                        <div
                                          id="zv91_7"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          7
                                        </div>
                                        <div
                                          id="zv91_8"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          8
                                        </div>
                                        <div
                                          id="zv91_9"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          9
                                        </div>
                                        <div
                                          id="zv91_10"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          10
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zv91_11"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          11
                                        </div>
                                        <div
                                          id="zv91_12"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          12
                                        </div>
                                        <div
                                          id="zv91_13"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          13
                                        </div>
                                        <div
                                          id="zv91_14"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          14
                                        </div>
                                        <div
                                          id="zv91_15"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          15
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zv91_16"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          16
                                        </div>
                                        <div
                                          id="zv91_17"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          17
                                        </div>
                                        <div
                                          id="zv91_18"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          18
                                        </div>
                                        <div
                                          id="zv91_19"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          19
                                        </div>
                                        <div
                                          id="zv91_20"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          20
                                        </div>
                                      </div>
                                    </div>
                                    <div className="main bg-dark py-1 px-1 d-flex flex-column border-light border border-2 position-relative">
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="zv92"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          fontSize: "10px",
                                        }}
                                      >
                                        ZV92
                                      </span>

                                      {/* Static content for each row */}
                                      <div className="d-flex">
                                        <div
                                          id="zv92_1"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          1
                                        </div>
                                        <div
                                          id="zv92_2"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          2
                                        </div>
                                        <div
                                          id="zv92_3"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          3
                                        </div>
                                        <div
                                          id="zv92_4"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          4
                                        </div>
                                        <div
                                          id="zv92_5"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          5
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zv92_6"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          6
                                        </div>
                                        <div
                                          id="zv92_7"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          7
                                        </div>
                                        <div
                                          id="zv92_8"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          8
                                        </div>
                                        <div
                                          id="zv92_9"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          9
                                        </div>
                                        <div
                                          id="zv92_10"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          10
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zv92_11"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          11
                                        </div>
                                        <div
                                          id="zv92_12"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          12
                                        </div>
                                        <div
                                          id="zv92_13"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          13
                                        </div>
                                        <div
                                          id="zv92_14"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          14
                                        </div>
                                        <div
                                          id="zv92_15"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          15
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zv92_16"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          16
                                        </div>
                                        <div
                                          id="zv92_17"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          17
                                        </div>
                                        <div
                                          id="zv92_18"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          18
                                        </div>
                                        <div
                                          id="zv92_19"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          19
                                        </div>
                                        <div
                                          id="zv92_20"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          20
                                        </div>
                                      </div>
                                    </div>

                                    <div
                                      className=" bg-light"
                                      style={{
                                        height: "20vh",
                                        width: "20em",
                                        marginRight: "300px",
                                      }}
                                    ></div>

                                    <div className="main bg-dark py-1 px-1 d-flex flex-column border-light border border-2 position-relative">
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="zx90"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          fontSize: "10px",
                                        }}
                                      >
                                        ZX90
                                      </span>

                                      {/* Static content for each row */}
                                      <div className="d-flex">
                                        <div
                                          id="zx90_1"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          1
                                        </div>
                                        <div
                                          id="zx90_2"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          2
                                        </div>
                                        <div
                                          id="zx90_3"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          3
                                        </div>
                                        <div
                                          id="zx90_4"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          4
                                        </div>
                                        <div
                                          id="zx90_5"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          5
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zx90_6"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          6
                                        </div>
                                        <div
                                          id="zx90_7"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          7
                                        </div>
                                        <div
                                          id="zx90_8"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          8
                                        </div>
                                        <div
                                          id="zx90_9"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          9
                                        </div>
                                        <div
                                          id="zx90_10"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          10
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zx90_11"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          11
                                        </div>
                                        <div
                                          id="zx90_12"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          12
                                        </div>
                                        <div
                                          id="zx90_13"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          13
                                        </div>
                                        <div
                                          id="zx90_14"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          14
                                        </div>
                                        <div
                                          id="zx90_15"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          15
                                        </div>
                                      </div>

                                      <div className="d-flex">
                                        <div
                                          id="zx90_16"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          16
                                        </div>
                                        <div
                                          id="zx90_17"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          17
                                        </div>
                                        <div
                                          id="zx90_18"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          18
                                        </div>
                                        <div
                                          id="zx90_19"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          19
                                        </div>
                                        <div
                                          id="zx90_20"
                                          className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            height: "5vh",
                                            width: "30px",
                                            fontSize: "10px",
                                          }}
                                        >
                                          20
                                        </div>
                                      </div>
                                    </div>

                                    <div className="main bg-dark py-1 px-1 d-flex flex-column border-light border border-2 position-relative">
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="zx91"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          fontSize: "10px",
                                        }}
                                      >
                                        ZX91
                                      </span>

                                      {/* Static content for each row */}
                                      {[...Array(4)].map((_, rowIndex) => (
                                        <div key={rowIndex} className="d-flex">
                                          {[...Array(5)].map((_, colIndex) => (
                                            <div
                                              key={colIndex}
                                              id={`zx91_${
                                                rowIndex * 5 + colIndex + 1
                                              }`}
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                              style={{
                                                height: "5vh",
                                                width: "30px",
                                                fontSize: "10px",
                                              }}
                                            >
                                              {rowIndex * 5 + colIndex + 1}
                                            </div>
                                          ))}
                                        </div>
                                      ))}
                                    </div>

                                    <div className="main bg-dark py-1 px-1 d-flex flex-column border-light border border-2 position-relative">
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="zx92"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          fontSize: "10px",
                                        }}
                                      >
                                        ZX92
                                      </span>

                                      {/* Static content for each row */}
                                      {[...Array(4)].map((_, rowIndex) => (
                                        <div key={rowIndex} className="d-flex">
                                          {[...Array(5)].map((_, colIndex) => (
                                            <div
                                              key={colIndex}
                                              id={`zx92_${
                                                rowIndex * 5 + colIndex + 1
                                              }`}
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                              style={{
                                                height: "5vh",
                                                width: "30px",
                                                fontSize: "10px",
                                              }}
                                            >
                                              {rowIndex * 5 + colIndex + 1}
                                            </div>
                                          ))}
                                        </div>
                                      ))}
                                    </div>

                                    <div
                                      className=" bg-light"
                                      style={{
                                        height: "20vh",
                                        width: "20em",
                                        marginRight: "220px",
                                      }}
                                    ></div>

                                    <div className="main bg-dark py-1 px-1 d-flex flex-column border-light border border-2 position-relative">
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="zz90"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          fontSize: "10px",
                                        }}
                                      >
                                        ZZ90
                                      </span>

                                      {/* Static content for each row */}
                                      {[...Array(4)].map((_, rowIndex) => (
                                        <div className="d-flex" key={rowIndex}>
                                          {[...Array(5)].map((_, colIndex) => {
                                            const boxNumber =
                                              rowIndex * 5 + colIndex + 1;
                                            return (
                                              <div
                                                key={boxNumber}
                                                id={`zz90_${boxNumber}`}
                                                className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                style={{
                                                  height: "5vh",
                                                  width: "30px",
                                                  fontSize: "10px",
                                                }}
                                              >
                                                {boxNumber}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ))}
                                    </div>

                                    <div className="main bg-dark py-1 px-1 d-flex flex-column border-light border border-2 position-relative">
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="zz91"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          fontSize: "10px",
                                        }}
                                      >
                                        ZZ91
                                      </span>

                                      {/* Static content for each row */}
                                      {[...Array(4)].map((_, rowIndex) => (
                                        <div className="d-flex" key={rowIndex}>
                                          {[...Array(5)].map((_, colIndex) => {
                                            const boxNumber =
                                              rowIndex * 5 + colIndex + 1;
                                            return (
                                              <div
                                                key={boxNumber}
                                                id={`zz91_${boxNumber}`}
                                                className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                style={{
                                                  height: "5vh",
                                                  width: "30px",
                                                  fontSize: "10px",
                                                }}
                                              >
                                                {boxNumber}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="d-flex flex-row">
                                    {/* First Column */}
                                    <div className="d-flex flex-column">
                                      <div
                                        className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <span
                                          className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                          id="s7"
                                          style={{
                                            zIndex: 1,
                                            backdropFilter: "blur(1px)",
                                            fontSize: "10px",
                                          }}
                                        >
                                          S07
                                        </span>

                                        {/* Static content for each row */}
                                        {[...Array(5)].map((_, rowIndex) => (
                                          <div
                                            className="d-flex"
                                            key={rowIndex}
                                          >
                                            {[...Array(4)].map(
                                              (_, colIndex) => {
                                                const boxNumber =
                                                  rowIndex * 4 + colIndex + 1; // Calculate box number
                                                return (
                                                  <div
                                                    key={boxNumber}
                                                    id={`s7_${boxNumber}`}
                                                    className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                    style={{
                                                      height: "5vh",
                                                      width: "30px",
                                                      fontSize: "10px",
                                                    }}
                                                  >
                                                    {boxNumber}
                                                  </div>
                                                );
                                              }
                                            )}
                                          </div>
                                        ))}
                                      </div>

                                      <div
                                        className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <span
                                          className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                          id="s6"
                                          style={{
                                            zIndex: 1,
                                            backdropFilter: "blur(1px)",
                                            fontSize: "10px",
                                          }}
                                        >
                                          S06
                                        </span>

                                        {/* Static content for each row */}
                                        {[...Array(5)].map((_, rowIndex) => (
                                          <div
                                            className="d-flex"
                                            key={rowIndex}
                                          >
                                            {[...Array(4)].map(
                                              (_, colIndex) => {
                                                const boxNumber =
                                                  rowIndex * 4 + colIndex + 1; // Calculate box number
                                                return (
                                                  <div
                                                    key={boxNumber}
                                                    id={`s6_${boxNumber}`}
                                                    className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                    style={{
                                                      height: "5vh",
                                                      width: "30px",
                                                      fontSize: "10px",
                                                    }}
                                                  >
                                                    {boxNumber}
                                                  </div>
                                                );
                                              }
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                      <div
                                        className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <span
                                          className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                          id="s5"
                                          style={{
                                            zIndex: 1,
                                            backdropFilter: "blur(1px)",
                                            fontSize: "10px",
                                          }}
                                        >
                                          S05
                                        </span>

                                        {/* Static content for each row */}
                                        {[...Array(5)].map((_, rowIndex) => (
                                          <div
                                            className="d-flex"
                                            key={rowIndex}
                                          >
                                            {[...Array(4)].map(
                                              (_, colIndex) => {
                                                const boxNumber =
                                                  rowIndex * 4 + colIndex + 1; // Calculate box number
                                                return (
                                                  <div
                                                    key={boxNumber}
                                                    id={`s5_${boxNumber}`}
                                                    className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                    style={{
                                                      height: "5vh",
                                                      width: "30px",
                                                      fontSize: "10px",
                                                    }}
                                                  >
                                                    {boxNumber}
                                                  </div>
                                                );
                                              }
                                            )}
                                          </div>
                                        ))}
                                      </div>

                                      {/* <div 
            className="main py-1 px-1 bg-dark border-light border border-2 position-relative d-flex flex-column align-items-center justify-content-center"
            style={{ 
                width: "130px", 
                height: "205px", 
                overflow: "hidden", 
                position: "relative"
            }}
            onWheel={handleWheel}
        >
          
            <span 
                className="text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                id="s05"
                style={{ fontSize: "14px", zIndex: 1 }}
            >
                S05
            </span>

          
            <div 
                className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
                style={{ 
                    opacity: visibleContent ? 1 : 0,  
                    transition: "opacity 0.3s ease-in-out"
                }}
            >
                {[...Array(5)].map((_, rowIndex) => (
                    <div className="d-flex" key={rowIndex}>
                        {[...Array(4)].map((_, colIndex) => {
                            const boxNumber = rowIndex * 4 + colIndex + 1;
                            return (
                                <div
                                    key={boxNumber}
                                    id={`s5_${boxNumber}`}
                                    className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                    style={{ height: '5vh', width: '30px', fontSize: "10px" }}
                                >
                                    {boxNumber}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div> */}
                                      {/* <div 
            className="main py-1 px-1 bg-dark border-light border border-2 position-relative d-flex flex-column align-items-center justify-content-center"
            style={{ 
                width: "130px", 
                height: "200px", 
                overflow: "hidden", 
                position: "relative"
            }}
            onWheel={handleWheel}
        >
         
            <span 
                className="text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                id="s04"
                style={{ fontSize: "14px", zIndex: 1 }}
            >
                S04
            </span>

            <div 
                className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
                style={{ 
                    opacity: visibleContent ? 1 : 0, 
                    transition: "opacity 0.3s ease-in-out"
                }}
            >
                {[...Array(5)].map((_, rowIndex) => (
                    <div className="d-flex" key={rowIndex}>
                        {[...Array(4)].map((_, colIndex) => {
                            const boxNumber = rowIndex * 4 + colIndex + 1;
                            return (
                                <div
                                    key={boxNumber}
                                    id={`s4_${boxNumber}`}
                                    className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                    style={{ height: '5vh', width: '30px', fontSize: "10px" }}
                                >
                                    {boxNumber}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div> */}

                                      <div
                                        className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <span
                                          className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                          id="s4"
                                          style={{
                                            zIndex: 1,
                                            backdropFilter: "blur(1px)",
                                            fontSize: "10px",
                                          }}
                                        >
                                          S04
                                        </span>

                                        {/* Static content for each row */}
                                        {[...Array(5)].map((_, rowIndex) => (
                                          <div
                                            className="d-flex"
                                            key={rowIndex}
                                          >
                                            {[...Array(4)].map(
                                              (_, colIndex) => {
                                                const boxNumber =
                                                  rowIndex * 4 + colIndex + 1; // Calculate box number
                                                return (
                                                  <div
                                                    key={boxNumber}
                                                    id={`s4_${boxNumber}`}
                                                    className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                    style={{
                                                      height: "5vh",
                                                      width: "30px",
                                                      fontSize: "10px",
                                                    }}
                                                  >
                                                    {boxNumber}
                                                  </div>
                                                );
                                              }
                                            )}
                                          </div>
                                        ))}
                                      </div>

                                      <div
                                        className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <span
                                          className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                          id="s3"
                                          style={{
                                            zIndex: 1,
                                            backdropFilter: "blur(1px)",
                                            fontSize: "10px",
                                          }}
                                        >
                                          S03
                                        </span>

                                        {/* Static content for each row */}
                                        {[...Array(5)].map((_, rowIndex) => (
                                          <div
                                            className="d-flex"
                                            key={rowIndex}
                                          >
                                            {[...Array(4)].map(
                                              (_, colIndex) => {
                                                const boxNumber =
                                                  rowIndex * 4 + colIndex + 1; // Calculate box number
                                                return (
                                                  <div
                                                    key={boxNumber}
                                                    id={`s3_${boxNumber}`}
                                                    className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                    style={{
                                                      height: "5vh",
                                                      width: "30px",
                                                      fontSize: "10px",
                                                    }}
                                                  >
                                                    {boxNumber}
                                                  </div>
                                                );
                                              }
                                            )}
                                          </div>
                                        ))}
                                      </div>

                                      <div
                                        className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <span
                                          className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                          id="s2"
                                          style={{
                                            zIndex: 1,
                                            backdropFilter: "blur(1px)",
                                            fontSize: "10px",
                                          }}
                                        >
                                          S02
                                        </span>

                                        {/* Static content for each row */}
                                        {[...Array(5)].map((_, rowIndex) => (
                                          <div
                                            className="d-flex"
                                            key={rowIndex}
                                          >
                                            {[...Array(4)].map(
                                              (_, colIndex) => {
                                                const boxNumber =
                                                  rowIndex * 4 + colIndex + 1; // Calculate box number
                                                return (
                                                  <div
                                                    key={boxNumber}
                                                    id={`s2_${boxNumber}`}
                                                    className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                    style={{
                                                      height: "5vh",
                                                      width: "30px",
                                                      fontSize: "10px",
                                                    }}
                                                  >
                                                    {boxNumber}
                                                  </div>
                                                );
                                              }
                                            )}
                                          </div>
                                        ))}
                                      </div>

                                      <div
                                        className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <span
                                          className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                          id="s1"
                                          style={{
                                            zIndex: 1,
                                            backdropFilter: "blur(1px)",
                                            fontSize: "10px",
                                          }}
                                        >
                                          S1
                                        </span>

                                        {/* Static content for each row */}
                                        {[...Array(5)].map((_, rowIndex) => (
                                          <div
                                            className="d-flex"
                                            key={rowIndex}
                                          >
                                            {[...Array(4)].map(
                                              (_, colIndex) => {
                                                const boxNumber =
                                                  rowIndex * 4 + colIndex + 1; // Calculate box number
                                                return (
                                                  <div
                                                    key={boxNumber}
                                                    id={`s1_${boxNumber}`}
                                                    className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                    style={{
                                                      height: "5vh",
                                                      width: "30px",
                                                      fontSize: "10px",
                                                    }}
                                                  >
                                                    {boxNumber}
                                                  </div>
                                                );
                                              }
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    {/* Second Column */}
                                    <div className="d-flex flex-column">
                                      <div
                                        className="d-flex align-items-center justify-content-center position-absolute border-light border border-2"
                                        style={{
                                          height: "10.8vh",
                                          width: "35px",
                                          backgroundColor: "#284df5",
                                          zIndex: "2",
                                          marginLeft: "0.1rem",
                                          marginTop: "0.1rem",
                                        }}
                                      ></div>
                                      <div
                                        className="main  py-1 px-1 d-flex flex-column position-relative"
                                        style={{ width: "160px" }}
                                      >
                                        <div
                                          className="d-flex"
                                          style={{ fontSize: "10px" }}
                                        >
                                          <div
                                            className=""
                                            style={{ marginLeft: "74px" }}
                                          ></div>
                                          <div
                                            className=" position-relative bg-secondary mt-2"
                                            id="s19"
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              id="z4"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                                width: "170px",
                                              }}
                                            >
                                              S10
                                            </span>
                                          </div>

                                          <div
                                            className=""
                                            style={{ marginLeft: "392px" }}
                                          ></div>

                                          <div
                                            className=""
                                            style={{ marginLeft: "377px" }}
                                          ></div>
                                          <div
                                            className=" position-relative bg-secondary mt-2"
                                            id="s21"
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              id="z4"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                                width: "138px",
                                              }}
                                            >
                                              S11
                                            </span>
                                          </div>
                                          <div
                                            className=""
                                            style={{ marginLeft: "377px" }}
                                          ></div>

                                          <div
                                            className=""
                                            style={{ marginLeft: "375px" }}
                                          ></div>
                                          <div
                                            className=" position-relative bg-secondary mt-2"
                                            id="s23"
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              id="s12"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                                width: "140px",
                                              }}
                                            >
                                              S12
                                            </span>
                                          </div>
                                          <div
                                            className=""
                                            style={{ marginLeft: "377px" }}
                                          ></div>

                                          <div
                                            className=""
                                            style={{ marginLeft: "375px" }}
                                          ></div>
                                          <div
                                            className=" position-relative bg-secondary mt-2"
                                            id="s25"
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              id="s13"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                                width: "138px",
                                              }}
                                            >
                                              S13
                                            </span>
                                          </div>
                                        </div>
                                        {/* Static content for each row */}
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1 d-flex flex-column position-relative"
                                        style={{ width: "160px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                      <div
                                        className="main  py-1 px-1 d-flex flex-column position-relative"
                                        style={{ width: "160px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1 d-flex flex-column position-relative"
                                        style={{ width: "160px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1 d-flex flex-column position-relative"
                                        style={{ width: "160px" }}
                                      >
                                        {/* Static content for each row */}
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1 d-flex flex-column position-relative"
                                        style={{ width: "160px" }}
                                      >
                                        {/* Static content for each row */}
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                      <div
                                        className="main  py-1 px-1 d-flex flex-column position-relative"
                                        style={{ width: "160px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                    </div>
                                    {/* third Column */}
                                    <div className="third_column">
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="t12"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            T12
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`t12_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>

                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="t11"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            T11
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`t11_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="t10"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            T10
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`t10_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="t9"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            T09
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`t9_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 d-flex flex-column position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <div
                                            style={{ ...CustomStyles }}
                                          ></div>
                                        </div>
                                        <div
                                          className="main  py-1 px-1 d-flex flex-column position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <div
                                            style={{ ...CustomStyles }}
                                          ></div>
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="t8"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            T08
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`t8_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="t7"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            T07
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`t7_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="t6"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            T06
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`t6_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="t5"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            T05
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`t5_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="t4"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            T04
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`t4_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="t3"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            T03
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`t3_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="t2"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            T02
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`t2_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="t1"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            T1
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`t1_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="d-flex flex-column">
                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}> </div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}> </div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}> </div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}> </div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}> </div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}> </div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}> </div>
                                      </div>
                                    </div>
                                    {/* Fourth Column */}
                                    <div className="fourth_column">
                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="u12"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            U12
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`u12_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="u11"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            U11
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`u11_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="u10"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            U10
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`u10_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="u9"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            U09
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`u9_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1  d-flex flex-column  position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <div style={{ ...customStyles }}>
                                            {" "}
                                          </div>
                                        </div>

                                        <div
                                          className="main  py-1 px-1  d-flex flex-column  position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <div style={{ ...customStyles }}>
                                            {" "}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="u8"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            U08
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`u8_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="u7"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            U07
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`u7_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="u6"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            U06
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`u6_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="u5"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            U05
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`u5_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="u4"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            U04
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`u4_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="u3"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            U03
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`u3_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex  ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="u2"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            U02
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`u2_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="u1"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            U1
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`u1_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="d-flex flex-column">
                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}> </div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        {/* Static content for each row */}
                                        <div style={{ ...customStyles }}> </div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}> </div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}> </div>
                                      </div>
                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}> </div>
                                      </div>
                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}> </div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}> </div>
                                      </div>
                                    </div>
                                    {/* Five column */}

                                    {/* six column */}
                                    <div className="six_column">
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="v12"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            V12
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`v12_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="v11"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            V11
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`v11_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="v10"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            V10
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`v10_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="v9"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            V09
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`v9_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1  d-flex flex-column  position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <div style={{ ...customStyles }}>
                                            {" "}
                                          </div>
                                        </div>
                                        <div
                                          className="main  py-1 px-1  d-flex flex-column  position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <div style={{ ...customStyles }}>
                                            {" "}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="v8"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            V08
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`v8_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="v7"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            V07
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`v7_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="v6"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            V06
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`v6_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="v5"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            V05
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`v5_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="v4"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            V04
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`v4_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="v3"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            V03
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`v3_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="v2"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            V02
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`v2_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="v1"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            V1
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`v1_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="d-flex flex-column">
                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                    </div>
                                    {/* seven column */}
                                    <div className="seven_column">
                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="w12"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            W12
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`w12_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="w11"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            W11
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`w11_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="w10"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            W10
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`w10_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="w9"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            W09
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`w9_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 d-flex flex-column position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <div
                                            style={{ ...customStyles }}
                                          ></div>
                                        </div>
                                        <div
                                          className="main  py-1 px-1 d-flex flex-column position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <div
                                            style={{ ...customStyles }}
                                          ></div>
                                        </div>
                                      </div>

                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="w8"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            W08
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`w8_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="w7"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            W07
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`w7_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="w6"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            W06
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`w6_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="w5"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            W05{" "}
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`w5_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="w4"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            W04
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`w4_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="w3"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            W03
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`w3_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="w2"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            W02
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`w2_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="w1"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            W1
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`w1_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    {/* 8 column */}
                                    <div className="d-flex flex-column">
                                      <div
                                        className="main  py-1 px-1 d-flex flex-column position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                      <div
                                        className="main  py-1 px-1 d-flex flex-column position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                      <div
                                        className="main  py-1 px-1 d-flex flex-column position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                      <div
                                        className="main  py-1 px-1 d-flex flex-column position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                      <div
                                        className="main  py-1 px-1 d-flex flex-column position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                      <div
                                        className="main  py-1 px-1 d-flex flex-column position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                      <div
                                        className="main  py-1 px-1 d-flex flex-column position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                    </div>
                                    {/* 9 column */}
                                    <div className="9_column">
                                      <div className="d-flex">
                                        <div
                                          className="d-flex align-items-center justify-content-center position-absolute border-light border border-2"
                                          style={{
                                            height: "15.8vh",
                                            width: "332px",
                                            backgroundColor: "#f55ae2",
                                            zIndex: "2",
                                            marginLeft: "4.1rem",
                                            marginTop: "0.1rem",
                                            fontSize: "30px",
                                            fontWeight: "bold",
                                          }}
                                        >
                                          Scanner
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="x12"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            X12
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`x12_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="x12"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            X12
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`x12_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="x10"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            X10
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`x10_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="x9"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            X09
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`x9_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 d-flex flex-column position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <div
                                            style={{ ...customStyles }}
                                          ></div>
                                        </div>
                                        <div
                                          className="main  py-1 px-1 d-flex flex-column position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <div
                                            style={{ ...customStyles }}
                                          ></div>
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="x8"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            X08
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`x8_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="x7"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            X07
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`x7_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="x6"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            X06
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`x6_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="x5"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            X05
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`x5_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="x4"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            X04
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`x4_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="x3"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            X03
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`x3_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="x2"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            X02
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`x2_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="x1"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            X1
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`x1_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="d-flex flex-column">
                                      <div
                                        className="main  py-1 px-1  d-flex flex-column position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                      <div
                                        className="main  py-1 px-1  d-flex flex-column position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                      <div
                                        className="main  py-1 px-1  d-flex flex-column position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column position-relative"
                                        style={{ width: "102px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                    </div>
                                    {/* 10 column */}
                                    <div className="ten_column">
                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="y12"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Y12
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`y12_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="y11"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Y11
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`y11_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="y10"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Y10
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`y10_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="y9"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Y09
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`y9_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1  d-flex flex-column  position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <div
                                            style={{ ...customStyles }}
                                          ></div>
                                        </div>
                                        <div
                                          className="main  py-1 px-1  d-flex flex-column  position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <div
                                            style={{ ...customStyles }}
                                          ></div>
                                        </div>
                                      </div>
                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="y8"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Y08
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`y8_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="y7"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Y07
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`y7_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="y6"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Y06
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`y6_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="y5"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Y05
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`y5_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="y4"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Y04
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`y4_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="y3"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Y03
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`y3_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex ">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="y2"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Y02
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`y2_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="y1"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Y1
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`y1_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="d-flex flex-column">
                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>

                                      <div
                                        className="main  py-1 px-1  d-flex flex-column  position-relative"
                                        style={{ width: "130px" }}
                                      >
                                        <div style={{ ...customStyles }}></div>
                                      </div>
                                    </div>
                                    {/* 11 column */}

                                    {/* 12 column */}
                                    <div className="12_column">
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="z14"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Z14
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z14_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="z13"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Z13
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z13_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        {/* <div
                                          className="d-flex align-items-center justify-content-center position-absolute border-light"
                                          style={{
                                            height: "32.8vh",
                                            width: "132px",
                                            backgroundColor: "transprent",
                                            zIndex: "2",
                                            marginLeft: "16.1rem",
                                            marginTop: "11.1rem",
                                            fontSize: "30px",
                                            fontWeight: "bold",
                                          }}
                                        >

                                        </div> */}
                                        <div
                                          className="d-flex align-items-center justify-content-center position-absolute border-light border border-2"
                                          style={{
                                            height: "20.8vh",
                                            width: "245px",
                                            backgroundColor: "#f5d65a",
                                            zIndex: "2",
                                            marginLeft: "2.1rem",
                                            marginTop: "0.1rem",
                                          }}
                                        ></div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="z12"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Z12
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z12_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="z11"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Z11
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z11_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="z10"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Z10
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z10_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="z9"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Z09
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z9_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1  d-flex flex-column  position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <div
                                            style={{ ...customStyles }}
                                          ></div>
                                        </div>
                                        <div
                                          className="main  py-1 px-1  d-flex flex-column  position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <div
                                            style={{ ...customStyles }}
                                          ></div>
                                        </div>
                                        <div
                                          className="main  py-1 px-1  d-flex flex-column  position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <div
                                            style={{ ...customStyles }}
                                          ></div>
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="z8"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Z08
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z8_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>

                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="z7"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Z07
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z7_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1  d-flex flex-column  position-relative"
                                          style={{ width: "70px" }}
                                        >
                                          <div
                                            style={{ ...customStyles }}
                                          ></div>
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "70px" }}
                                        >
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(2)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 2 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z16_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="z6"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Z06
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z6_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="z5"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Z05
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z5_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1  d-flex flex-column  position-relative"
                                          style={{ width: "70px" }}
                                        >
                                          <div
                                            style={{ ...customStyles }}
                                          ></div>
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "70px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="z16"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                              marginTop: "-104px",
                                            }}
                                          >
                                            Z16
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(2)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 2 +
                                                    colIndex +
                                                    1 +
                                                    10; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z16_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="z4"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Z04
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z4_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="z3"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Z03
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z3_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1  d-flex flex-column  position-relative"
                                          style={{ width: "70px" }}
                                        >
                                          <div
                                            style={{ ...customStyles }}
                                          ></div>
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "70px" }}
                                        >
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(2)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 2 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z15_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="d-flex">
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="z2"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Z02
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z2_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "130px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="z1"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Z1
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(4)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 4 + colIndex + 1; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z1_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div
                                          className="main  py-1 px-1  d-flex flex-column  position-relative"
                                          style={{ width: "70px" }}
                                        >
                                          <div
                                            style={{ ...customStyles }}
                                          ></div>
                                        </div>
                                        <div
                                          className="main  py-1 px-1 bg-dark d-flex flex-column border-light border border-2 position-relative"
                                          style={{ width: "70px" }}
                                        >
                                          <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            id="z15"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              fontSize: "10px",
                                              marginTop: "-104px",
                                            }}
                                          >
                                            Z15
                                          </span>

                                          {/* Static content for each row */}
                                          {[...Array(5)].map((_, rowIndex) => (
                                            <div
                                              className="d-flex"
                                              key={rowIndex}
                                            >
                                              {[...Array(2)].map(
                                                (_, colIndex) => {
                                                  const boxNumber =
                                                    rowIndex * 2 +
                                                    colIndex +
                                                    1 +
                                                    10; // Calculate box number
                                                  return (
                                                    <div
                                                      key={boxNumber}
                                                      id={`z15_${boxNumber}`}
                                                      className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                      style={{
                                                        height: "5vh",
                                                        width: "30px",
                                                        fontSize: "10px",
                                                      }}
                                                    >
                                                      {boxNumber}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div
                                    className="d-flex"
                                    style={{ fontSize: "10px" }}
                                  >
                                    <div
                                      className=""
                                      style={{ marginLeft: "210px" }}
                                    ></div>
                                    <div
                                      className=" position-relative bg-secondary mt-2"
                                      id="s19"
                                    >
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="s19"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          width: "170px",
                                        }}
                                      >
                                        S19
                                      </span>
                                    </div>

                                    <div
                                      className=""
                                      style={{ marginLeft: "392px" }}
                                    ></div>
                                    <div
                                      className=" position-relative bg-secondary mt-2"
                                      id="s20"
                                    >
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="s20"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          width: "110px",
                                        }}
                                      >
                                        S20
                                      </span>
                                    </div>
                                    <div
                                      className=""
                                      style={{ marginLeft: "377px" }}
                                    ></div>
                                    <div
                                      className=" position-relative bg-secondary mt-2"
                                      id="s21"
                                    >
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="s21"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          width: "138px",
                                        }}
                                      >
                                        S21
                                      </span>
                                    </div>
                                    <div
                                      className=""
                                      style={{ marginLeft: "377px" }}
                                    ></div>
                                    <div
                                      className=" position-relative bg-secondary mt-2"
                                      id="s22"
                                    >
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="s22"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          width: "113px",
                                        }}
                                      >
                                        S22
                                      </span>
                                    </div>
                                    <div
                                      className=""
                                      style={{ marginLeft: "375px" }}
                                    ></div>
                                    <div
                                      className=" position-relative bg-secondary mt-2"
                                      id="s23"
                                    >
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="s23"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          width: "140px",
                                        }}
                                      >
                                        S23
                                      </span>
                                    </div>
                                    <div
                                      className=""
                                      style={{ marginLeft: "377px" }}
                                    ></div>
                                    <div
                                      className=" position-relative bg-secondary mt-2"
                                      id="s24"
                                    >
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="s24"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          width: "100px",
                                        }}
                                      >
                                        S24
                                      </span>
                                    </div>
                                    <div
                                      className=""
                                      style={{ marginLeft: "375px" }}
                                    ></div>
                                    <div
                                      className=" position-relative bg-secondary mt-2"
                                      id="s25"
                                    >
                                      <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="s25"
                                        style={{
                                          zIndex: 1,
                                          backdropFilter: "blur(1px)",
                                          width: "138px",
                                        }}
                                      >
                                        S25
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>
      </div>
    </>
  );
}
