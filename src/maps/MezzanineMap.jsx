import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import Legend from "./Legend";
import { ApiBaseUrl, LocalApiBaseUrl } from "../Config";

export default function MezzanineMap({
  setActiveGridSelection,
  activeGridSelection,
  onClose,
  setModalVisible2,
  SelectedGrids,
  setSelectedGrids
}) {
  const [zoomLevel, setZoomLevel] = useState(0.5);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const transformRef = useRef(null);
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  const customStyles = {
    marginTop: "0px",
    height: "16vh",
    width: "193px",
    backgroundColor: "#f0f0f0", 
    borderRadius: "0px",
    border: "none",
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
    const url = `${ApiBaseUrl}export/map/data?name=Mazzanine`;
    try {
     const response = await axios.get(
      `${LocalApiBaseUrl}getmezzaninemapdata`
    );

    console.log(response.data);

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

  useEffect(() => {
    if (!Array.isArray(Data)) return;

    let TotalAreaSum = 0;
   const handleDoubleClick = (data) => (event) => {

  const clickedElement =
    event.target;

  const bgColor =
    window.getComputedStyle(
      clickedElement
    ).backgroundColor;

  // PURPLE OCCUPIED CHECK
  if (
    bgColor === "rgb(143, 81, 221)"
  ) {

    Swal.fire({
      icon: "warning",
      title: "Occupied",
      text: "This grid is already occupied.",
      timer: 2000,
      showConfirmButton: false,
    });

    return;
  }
        setSelectedGrids((prev) => {
          if (prev.hasOwnProperty(data.new_location_code)) {
            return prev;
          }
          return {
            ...prev,
            [data.new_location_code]: [],
          };
        });
        setSelectedGrids((prev) => ({
  ...prev,
  [data.new_location_code]:
    [],
}));
     setActiveGridSelection({
  ...data,
  map_type: "Mazzanine",
  location_code:
    data.location_code ??
    data.camera_locations,
});
        setModalVisible2(true);              
        onClose();
  };

    const eventListeners = []; 
    Data.forEach((data) => {
      if (!data?.camera_locations && !data?.location_code) return;

      const location = `${data.location_code ?? data.camera_locations}`
        .toLowerCase()
        .trim();
      const grid_id = location;

      const gridElement = document.getElementById(grid_id);
      if (gridElement) {
        const handler = handleDoubleClick(data);
        gridElement.addEventListener("click", handler);
        eventListeners.push({ element: gridElement, handler });
      }

      const total_area = Number(data?.total_area ?? 20);
      const occupied = Number(data?.occupied_area ?? 0);
      const ocr_occupied = Number(data?.ocr_occupied_area ?? 0);
      const grid_allocation = (() => {
  try {
    if (!data?.grid_allocation) return {};
    if (typeof data.grid_allocation === 'object') return data.grid_allocation;
    return JSON.parse(data.grid_allocation) ?? {};
  } catch { return {}; }
})();


      const carting_data = data?.carting_data ?? [];

     const ocr_grid_wise_occupied = (() => {
  try {
    if (!data?.ocr_grid_wise_occupied) return {};
    if (typeof data.ocr_grid_wise_occupied === 'object') return data.ocr_grid_wise_occupied;
    return JSON.parse(data.ocr_grid_wise_occupied) ?? {};
  } catch { return {}; }
})();

        TotalAreaSum += Number(total_area);

      const setBackgroundColor = (id, color) => {
        const el = document.getElementById(id);
        if (el) {
          el.style.setProperty("background-color", color, "important");
        }
      };

      for (let i = 1; i <= total_area; i++) {
        const boxId = `${grid_id}_${i}`;
        const boxElement = document.getElementById(boxId);

        if (boxElement) {
          const handler = handleDoubleClick(data);
          boxElement.addEventListener("click", handler);
          eventListeners.push({ element: boxElement, handler });
        }
      }

      if (ocr_occupied > 0 && ocr_grid_wise_occupied?.data) {
        {
          Object.entries(ocr_grid_wise_occupied?.data||{}).forEach(
            ([key, value]) => {
              if (!value) return;
              key = Number(key);
              if (value == "F") {
                const box_id = `${grid_id}_${key + 1}`;
                setBackgroundColor(grid_id, "#00b0c4");
                setBackgroundColor(box_id, "#00b0c4");
              }
            }
          );
        }
      }

      if (ocr_occupied > 0 && occupied > 0 && carting_data?.length > 0 && grid_allocation) {
        {
          Object.entries(grid_allocation||{}).forEach(([key, value]) => {
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
              const box_id = `${grid_id}_${v}`;
              setBackgroundColor(grid_id, "#8f51dd");
              setBackgroundColor(box_id, "#8f51dd");
            });
          });
        }
      }
    });

    setTotalArea(TotalAreaSum);

    return () => {
      eventListeners.forEach(({ element, handler }) => {
        element.removeEventListener("click", handler);
      });
    };
  }, [Data]);

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
          }}
        >
          <TransformWrapper
            ref={transformRef}
            minScale={0.5}
            maxScale={9}
            limitToBounds={false}
            initialScale={0.5}
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
                              {/* <div className="d-flex gap-3 p-2 bg-light shadow position-fixed top-0 start-50 translate-middle-x rounded mt-2 z-3">
                    <button
                        onClick={handleZoomIn}
                        className="btn btn-success"
                    >
                        +
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="btn btn-danger"
                    >-
                    </button>
                </div> */}

                              <div
                                style={{
                                  cursor: "grab",
                                  overflow: "hidden",
                                  userSelect: "none",
                                }}
                              >
                                <div
                                  className="position-fixed top-0 start-0 w-100 h-100 bg-center"
                                  style={{
                                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
                                    transformOrigin: "top left", // Change to 'top left' to prevent downward shift
                                    transition: isDragging
                                      ? "none"
                                      : "transform 0.3s ease-in-out",
                                    alignContent: "center",
                                  }}
                                >
                                  {/* <h1 className='text-center'>Mezzanine Ground Floor</h1> */}
                                  <div className="mt-3 p-3">
                                    <div className="row gap-0 flex-row ">
                                      <table className="table">
                                        <tr>
                                          <td>
                                            <div
                                              className="main p-2 d-flex flex-column bg-dark border-light border-end border-2 position-relative"
                                              id="zj90"
                                              style={{ fontSize: "10px" }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                ZJ90
                                              </span>

                                              {/* Static content for each row */}
                                              <div className="d-flex ">
                                                <div
                                                  id="zj90_1"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  1
                                                </div>
                                                <div
                                                  id="zj90_2"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  2
                                                </div>
                                                <div
                                                  id="zj90_3"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  3
                                                </div>
                                                <div
                                                  id="zj90_4"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  4
                                                </div>
                                                <div
                                                  id="zj90_5"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  5
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zj90_6"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  6
                                                </div>
                                                <div
                                                  id="zj90_7"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  7
                                                </div>
                                                <div
                                                  id="zj90_8"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  8
                                                </div>
                                                <div
                                                  id="zj90_9"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  9
                                                </div>
                                                <div
                                                  id="zj90_10"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  10
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zj90_11"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  11
                                                </div>
                                                <div
                                                  id="zj90_12"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  12
                                                </div>
                                                <div
                                                  id="zj90_13"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  13
                                                </div>
                                                <div
                                                  id="zj90_14"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  14
                                                </div>
                                                <div
                                                  id="zj90_15"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  15
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zj90_16"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  16
                                                </div>
                                                <div
                                                  id="zj90_17"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  17
                                                </div>
                                                <div
                                                  id="zj90_18"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  18
                                                </div>
                                                <div
                                                  id="zj90_19"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  19
                                                </div>
                                                <div
                                                  id="zj90_20"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  20
                                                </div>
                                              </div>
                                            </div>
                                          </td>

                                          <td>
                                            <div
                                              className="main p-2 d-flex flex-column bg-dark border-light border-end border-2 position-relative"
                                              id="zj91"
                                              style={{ fontSize: "10px" }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                ZJ91
                                              </span>

                                              {/* Static content for each row */}
                                              <div className="d-flex ">
                                                <div
                                                  id="zj91_1"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  1
                                                </div>
                                                <div
                                                  id="zj91_2"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  2
                                                </div>
                                                <div
                                                  id="zj91_3"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  3
                                                </div>
                                                <div
                                                  id="zj91_4"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  4
                                                </div>
                                                <div
                                                  id="zj91_5"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  5
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zj91_6"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  6
                                                </div>
                                                <div
                                                  id="zj91_7"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  7
                                                </div>
                                                <div
                                                  id="zj91_8"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  8
                                                </div>
                                                <div
                                                  id="zj91_9"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  9
                                                </div>
                                                <div
                                                  id="zj91_10"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  10
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zj91_11"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  11
                                                </div>
                                                <div
                                                  id="zj91_12"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  12
                                                </div>
                                                <div
                                                  id="zj91_13"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  13
                                                </div>
                                                <div
                                                  id="zj91_14"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  14
                                                </div>
                                                <div
                                                  id="zj91_15"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  15
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zj91_16"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  16
                                                </div>
                                                <div
                                                  id="zj91_17"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  17
                                                </div>
                                                <div
                                                  id="zj91_18"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  18
                                                </div>
                                                <div
                                                  id="zj91_19"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  19
                                                </div>
                                                <div
                                                  id="zj91_20"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  20
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <div
                                              className="main p-2 d-flex flex-column bg-dark border-light border-end border-2 position-relative"
                                              id="zj92"
                                              style={{ fontSize: "10px" }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                ZJ92
                                              </span>
                                              {/* Static content for each row */}
                                              <div className="d-flex ">
                                                <div
                                                  id="zj92_1"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  1
                                                </div>
                                                <div
                                                  id="zj92_2"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  2
                                                </div>
                                                <div
                                                  id="zj92_3"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  3
                                                </div>
                                                <div
                                                  id="zj92_4"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  4
                                                </div>
                                                <div
                                                  id="zj92_5"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  5
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zj92_6"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  6
                                                </div>
                                                <div
                                                  id="zj92_7"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  7
                                                </div>
                                                <div
                                                  id="zj92_8"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  8
                                                </div>
                                                <div
                                                  id="zj92_9"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  9
                                                </div>
                                                <div
                                                  id="zj92_10"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  10
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zj92_11"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  11
                                                </div>
                                                <div
                                                  id="zj92_12"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  12
                                                </div>
                                                <div
                                                  id="zj92_13"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  13
                                                </div>
                                                <div
                                                  id="zj92_14"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  14
                                                </div>
                                                <div
                                                  id="zj92_15"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  15
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zj92_16"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  16
                                                </div>
                                                <div
                                                  id="zj92_17"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  17
                                                </div>
                                                <div
                                                  id="zj92_18"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  18
                                                </div>
                                                <div
                                                  id="zj92_19"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  19
                                                </div>
                                                <div
                                                  id="zj92_20"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  20
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <div
                                              className=" bg-light"
                                              style={{
                                                height: "20vh",
                                                width: "46vh",
                                              }}
                                            ></div>
                                          </td>
                                          <td>
                                            <div
                                              className="main p-2 d-flex flex-column bg-dark border-light border-end border-2 position-relative"
                                              id="zl90"
                                              style={{ fontSize: "10px" }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                ZL90
                                              </span>

                                              {/* Static content for each row */}
                                              <div className="d-flex ">
                                                <div
                                                  id="zl90_1"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  1
                                                </div>
                                                <div
                                                  id="zl90_2"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  2
                                                </div>
                                                <div
                                                  id="zl90_3"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  3
                                                </div>
                                                <div
                                                  id="zl90_4"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  4
                                                </div>
                                                <div
                                                  id="zl90_5"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  5
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zl90_6"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  6
                                                </div>
                                                <div
                                                  id="zl90_7"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  7
                                                </div>
                                                <div
                                                  id="zl90_8"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  8
                                                </div>
                                                <div
                                                  id="zl90_9"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  9
                                                </div>
                                                <div
                                                  id="zl90_10"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  10
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zl90_11"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  11
                                                </div>
                                                <div
                                                  id="zl90_12"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  12
                                                </div>
                                                <div
                                                  id="zl90_13"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  13
                                                </div>
                                                <div
                                                  id="zl90_14"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  14
                                                </div>
                                                <div
                                                  id="zl90_15"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  15
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zl90_16"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  16
                                                </div>
                                                <div
                                                  id="zl90_17"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  17
                                                </div>
                                                <div
                                                  id="zl90_18"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  18
                                                </div>
                                                <div
                                                  id="zl90_19"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  19
                                                </div>
                                                <div
                                                  id="zl90_20"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  20
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <div
                                              className="main p-2 d-flex flex-column bg-dark border-light border-end border-2 position-relative"
                                              id="zl91"
                                              style={{ fontSize: "10px" }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                ZL91
                                              </span>

                                              {/* Static content for each row */}
                                              <div className="d-flex ">
                                                <div
                                                  id="zl91_1"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  1
                                                </div>
                                                <div
                                                  id="zl91_2"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  2
                                                </div>
                                                <div
                                                  id="zl91_3"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  3
                                                </div>
                                                <div
                                                  id="zl91_4"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  4
                                                </div>
                                                <div
                                                  id="zl91_5"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  5
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zl91_6"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  6
                                                </div>
                                                <div
                                                  id="zl91_7"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  7
                                                </div>
                                                <div
                                                  id="zl91_8"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  8
                                                </div>
                                                <div
                                                  id="zl91_9"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  9
                                                </div>
                                                <div
                                                  id="zl91_10"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  10
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zl91_11"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  11
                                                </div>
                                                <div
                                                  id="zl91_12"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  12
                                                </div>
                                                <div
                                                  id="zl91_13"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  13
                                                </div>
                                                <div
                                                  id="zl91_14"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  14
                                                </div>
                                                <div
                                                  id="zl91_15"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  15
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zl91_16"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  16
                                                </div>
                                                <div
                                                  id="zl91_17"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  17
                                                </div>
                                                <div
                                                  id="zl91_18"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  18
                                                </div>
                                                <div
                                                  id="zl91_19"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  19
                                                </div>
                                                <div
                                                  id="zl91_20"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  20
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <div
                                              className="main p-2 d-flex flex-column bg-dark border-light border-end border-2 position-relative"
                                              id="zl92"
                                              style={{ fontSize: "10px" }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                ZL92
                                              </span>

                                              {/* Static content for each row */}
                                              <div className="d-flex ">
                                                <div
                                                  id="zl92_1"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  1
                                                </div>
                                                <div
                                                  id="zl92_2"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  2
                                                </div>
                                                <div
                                                  id="zl92_3"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  3
                                                </div>
                                                <div
                                                  id="zl92_4"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  4
                                                </div>
                                                <div
                                                  id="zl92_5"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  5
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zl92_6"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  6
                                                </div>
                                                <div
                                                  id="zl92_7"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  7
                                                </div>
                                                <div
                                                  id="zl92_8"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  8
                                                </div>
                                                <div
                                                  id="zl92_9"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  9
                                                </div>
                                                <div
                                                  id="zl92_10"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  10
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zl92_11"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  11
                                                </div>
                                                <div
                                                  id="zl92_12"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  12
                                                </div>
                                                <div
                                                  id="zl92_13"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  13
                                                </div>
                                                <div
                                                  id="zl92_14"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  14
                                                </div>
                                                <div
                                                  id="zl92_15"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  15
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zl92_16"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  16
                                                </div>
                                                <div
                                                  id="zl92_17"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  17
                                                </div>
                                                <div
                                                  id="zl92_18"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  18
                                                </div>
                                                <div
                                                  id="zl92_19"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  19
                                                </div>
                                                <div
                                                  id="zl92_20"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  20
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <div
                                              className=" bg-light"
                                              style={{
                                                height: "20vh",
                                                width: "39vh",
                                              }}
                                            ></div>
                                          </td>
                                          <td>
                                            <div
                                              className="main p-2 d-flex flex-column bg-dark border-light border-end border-2 position-relative"
                                              id="zn90"
                                              style={{ fontSize: "10px" }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                ZN90
                                              </span>

                                              {/* Static content for each row */}
                                              <div className="d-flex ">
                                                <div
                                                  id="zn90_1"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  1
                                                </div>
                                                <div
                                                  id="zn90_2"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  2
                                                </div>
                                                <div
                                                  id="zn90_3"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  3
                                                </div>
                                                <div
                                                  id="zn90_4"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  4
                                                </div>
                                                <div
                                                  id="zn90_5"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  5
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zn90_6"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  6
                                                </div>
                                                <div
                                                  id="zn90_7"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  7
                                                </div>
                                                <div
                                                  id="zn90_8"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  8
                                                </div>
                                                <div
                                                  id="zn90_9"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  9
                                                </div>
                                                <div
                                                  id="zn90_10"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  10
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zn90_11"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  11
                                                </div>
                                                <div
                                                  id="zn90_12"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  12
                                                </div>
                                                <div
                                                  id="zn90_13"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  13
                                                </div>
                                                <div
                                                  id="zn90_14"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  14
                                                </div>
                                                <div
                                                  id="zn90_15"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  15
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zn90_16"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  16
                                                </div>
                                                <div
                                                  id="zn90_17"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  17
                                                </div>
                                                <div
                                                  id="zn90_18"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  18
                                                </div>
                                                <div
                                                  id="zn90_19"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  19
                                                </div>
                                                <div
                                                  id="zn90_20"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  20
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <div
                                              className="main p-2 d-flex flex-column bg-dark border-light border-end border-2 position-relative"
                                              id="zn91"
                                              style={{ fontSize: "10px" }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                ZN91
                                              </span>

                                              {/* Static content for each row */}
                                              <div className="d-flex ">
                                                <div
                                                  id="zn91_1"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  1
                                                </div>
                                                <div
                                                  id="zn91_2"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  2
                                                </div>
                                                <div
                                                  id="zn91_3"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  3
                                                </div>
                                                <div
                                                  id="zn91_4"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  4
                                                </div>
                                                <div
                                                  id="zn91_5"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  5
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zn91_6"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  6
                                                </div>
                                                <div
                                                  id="zn91_7"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  7
                                                </div>
                                                <div
                                                  id="zn91_8"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  8
                                                </div>
                                                <div
                                                  id="zn91_9"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  9
                                                </div>
                                                <div
                                                  id="zn91_10"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  10
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zn91_11"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  11
                                                </div>
                                                <div
                                                  id="zn91_12"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  12
                                                </div>
                                                <div
                                                  id="zn91_13"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  13
                                                </div>
                                                <div
                                                  id="zn91_14"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  14
                                                </div>
                                                <div
                                                  id="zn91_15"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  15
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zn91_16"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  16
                                                </div>
                                                <div
                                                  id="zn91_17"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  17
                                                </div>
                                                <div
                                                  id="zn91_18"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  18
                                                </div>
                                                <div
                                                  id="zn91_19"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  19
                                                </div>
                                                <div
                                                  id="zn91_20"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  20
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <div
                                              className="main p-2 d-flex flex-column bg-dark border-light border-end border-2 position-relative"
                                              id="zn92"
                                              style={{ fontSize: "10px" }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                ZN92
                                              </span>
                                              {/* Static content for each row */}
                                              <div className="d-flex ">
                                                <div
                                                  id="zn92_1"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  1
                                                </div>
                                                <div
                                                  id="zn92_2"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  2
                                                </div>
                                                <div
                                                  id="zn92_3"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  3
                                                </div>
                                                <div
                                                  id="zn92_4"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  4
                                                </div>
                                                <div
                                                  id="zn92_5"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  5
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zn92_6"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  6
                                                </div>
                                                <div
                                                  id="zn92_7"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  7
                                                </div>
                                                <div
                                                  id="zn92_8"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  8
                                                </div>
                                                <div
                                                  id="zn92_9"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  9
                                                </div>
                                                <div
                                                  id="zn92_10"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  10
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zn92_11"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  11
                                                </div>
                                                <div
                                                  id="zn92_12"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  12
                                                </div>
                                                <div
                                                  id="zn92_13"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  13
                                                </div>
                                                <div
                                                  id="zn92_14"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  14
                                                </div>
                                                <div
                                                  id="zn92_15"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  15
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zn92_16"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  16
                                                </div>
                                                <div
                                                  id="zn92_17"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  17
                                                </div>
                                                <div
                                                  id="zn92_18"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  18
                                                </div>
                                                <div
                                                  id="zn92_19"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  19
                                                </div>
                                                <div
                                                  id="zn92_20"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  20
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <div
                                              className="main p-2 d-flex flex-column bg-light border-light border-end border-2 "
                                              style={{ width: "300px" }}
                                            ></div>
                                          </td>
                                          <td>
                                            <div
                                              className="main p-2 d-flex flex-column bg-dark border-light border-end border-2 position-relative"
                                              id="zp90"
                                              style={{ fontSize: "10px" }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                ZP90
                                              </span>
                                              {/* Static content for each row */}
                                              <div className="d-flex ">
                                                <div
                                                  id="zp90_1"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  1
                                                </div>
                                                <div
                                                  id="zp90_2"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  2
                                                </div>
                                                <div
                                                  id="zp90_3"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  3
                                                </div>
                                                <div
                                                  id="zp90_4"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  4
                                                </div>
                                                <div
                                                  id="zp90_5"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  5
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zp90_6"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  6
                                                </div>
                                                <div
                                                  id="zp90_7"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  7
                                                </div>
                                                <div
                                                  id="zp90_8"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  8
                                                </div>
                                                <div
                                                  id="zp90_9"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  9
                                                </div>
                                                <div
                                                  id="zp90_10"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  10
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zp90_11"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  11
                                                </div>
                                                <div
                                                  id="zp90_12"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  12
                                                </div>
                                                <div
                                                  id="zp90_13"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  13
                                                </div>
                                                <div
                                                  id="zp90_14"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  14
                                                </div>
                                                <div
                                                  id="zp90_15"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  15
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zp90_16"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  16
                                                </div>
                                                <div
                                                  id="zp90_17"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  17
                                                </div>
                                                <div
                                                  id="zp90_18"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  18
                                                </div>
                                                <div
                                                  id="zp90_19"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  19
                                                </div>
                                                <div
                                                  id="zp90_20"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  20
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <div
                                              className="main p-2 d-flex flex-column bg-dark border-light border-end border-2 position-relative"
                                              id="zp91"
                                              style={{ fontSize: "10px" }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                ZP91
                                              </span>

                                              {/* Static content for each row */}
                                              <div className="d-flex ">
                                                <div
                                                  id="zp91_1"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  1
                                                </div>
                                                <div
                                                  id="zp91_2"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  2
                                                </div>
                                                <div
                                                  id="zp91_3"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  3
                                                </div>
                                                <div
                                                  id="zp91_4"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  4
                                                </div>
                                                <div
                                                  id="zp91_5"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  5
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zp91_6"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  6
                                                </div>
                                                <div
                                                  id="zp91_7"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  7
                                                </div>
                                                <div
                                                  id="zp91_8"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  8
                                                </div>
                                                <div
                                                  id="zp91_9"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  9
                                                </div>
                                                <div
                                                  id="zp91_10"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  10
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zp91_11"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  11
                                                </div>
                                                <div
                                                  id="zp91_12"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  12
                                                </div>
                                                <div
                                                  id="zp91_13"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  13
                                                </div>
                                                <div
                                                  id="zp91_14"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  14
                                                </div>
                                                <div
                                                  id="zp91_15"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  15
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zp91_16"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  16
                                                </div>
                                                <div
                                                  id="zp91_17"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  17
                                                </div>
                                                <div
                                                  id="zp91_18"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  18
                                                </div>
                                                <div
                                                  id="zp91_19"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  19
                                                </div>
                                                <div
                                                  id="zp91_20"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  20
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <div
                                              className="main p-2 d-flex flex-column bg-dark border-light border-end border-2 position-relative"
                                              id="zp92"
                                              style={{ fontSize: "10px" }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                ZP92
                                              </span>

                                              {/* Static content for each row */}
                                              <div className="d-flex ">
                                                <div
                                                  id="zp92_1"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  1
                                                </div>
                                                <div
                                                  id="zp92_2"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  2
                                                </div>
                                                <div
                                                  id="zp92_3"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  3
                                                </div>
                                                <div
                                                  id="zp92_4"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  4
                                                </div>
                                                <div
                                                  id="zp92_5"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  5
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zp92_6"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  6
                                                </div>
                                                <div
                                                  id="zp92_7"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  7
                                                </div>
                                                <div
                                                  id="zp92_8"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  8
                                                </div>
                                                <div
                                                  id="zp92_9"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  9
                                                </div>
                                                <div
                                                  id="zp92_10"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  10
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zp92_11"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  11
                                                </div>
                                                <div
                                                  id="zp92_12"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  12
                                                </div>
                                                <div
                                                  id="zp92_13"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  13
                                                </div>
                                                <div
                                                  id="zp92_14"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  14
                                                </div>
                                                <div
                                                  id="zp92_15"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  15
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zp92_16"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  16
                                                </div>
                                                <div
                                                  id="zp92_17"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  17
                                                </div>
                                                <div
                                                  id="zp92_18"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  18
                                                </div>
                                                <div
                                                  id="zp92_19"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  19
                                                </div>
                                                <div
                                                  id="zp92_20"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  20
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <div
                                              className=" bg-light"
                                              style={{
                                                height: "20vh",
                                                width: "40vh",
                                              }}
                                            ></div>
                                          </td>
                                          <td>
                                            <div
                                              className="main p-2 d-flex flex-column bg-dark border-light border-end border-2 position-relative"
                                              id="zr90"
                                              style={{ fontSize: "10px" }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                ZR90
                                              </span>
                                              {/* Static content for each row */}
                                              <div className="d-flex ">
                                                <div
                                                  id="zr90_1"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  1
                                                </div>
                                                <div
                                                  id="zr90_2"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  2
                                                </div>
                                                <div
                                                  id="zr90_3"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  3
                                                </div>
                                                <div
                                                  id="zr90_4"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  4
                                                </div>
                                                <div
                                                  id="zr90_5"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  5
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zr90_6"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  6
                                                </div>
                                                <div
                                                  id="zr90_7"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  7
                                                </div>
                                                <div
                                                  id="zr90_8"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  8
                                                </div>
                                                <div
                                                  id="zr90_9"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  9
                                                </div>
                                                <div
                                                  id="zr90_10"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  10
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zr90_11"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  11
                                                </div>
                                                <div
                                                  id="zr90_12"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  12
                                                </div>
                                                <div
                                                  id="zr90_13"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  13
                                                </div>
                                                <div
                                                  id="zr90_14"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  14
                                                </div>
                                                <div
                                                  id="zr90_15"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  15
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zr90_16"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  16
                                                </div>
                                                <div
                                                  id="zr90_17"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  17
                                                </div>
                                                <div
                                                  id="zr90_18"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  18
                                                </div>
                                                <div
                                                  id="zr90_19"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  19
                                                </div>
                                                <div
                                                  id="zr90_20"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  20
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <div
                                              className="main p-2 d-flex flex-column bg-dark border-light border-end border-2 position-relative"
                                              id="zr91"
                                              style={{ fontSize: "10px" }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                ZR91
                                              </span>

                                              {/* Static content for each row */}
                                              <div className="d-flex ">
                                                <div
                                                  id="zr91_1"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  1
                                                </div>
                                                <div
                                                  id="zr91_2"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  2
                                                </div>
                                                <div
                                                  id="zr91_3"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  3
                                                </div>
                                                <div
                                                  id="zr91_4"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  4
                                                </div>
                                                <div
                                                  id="zr91_5"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  5
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zr91_6"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  6
                                                </div>
                                                <div
                                                  id="zr91_7"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  7
                                                </div>
                                                <div
                                                  id="zr91_8"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  8
                                                </div>
                                                <div
                                                  id="zr91_9"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  9
                                                </div>
                                                <div
                                                  id="zr91_10"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  10
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zr91_11"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  11
                                                </div>
                                                <div
                                                  id="zr91_12"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  12
                                                </div>
                                                <div
                                                  id="zr91_13"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  13
                                                </div>
                                                <div
                                                  id="zr91_14"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  14
                                                </div>
                                                <div
                                                  id="zr91_15"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  15
                                                </div>
                                              </div>

                                              <div className="d-flex ">
                                                <div
                                                  id="zr91_16"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  16
                                                </div>
                                                <div
                                                  id="zr91_17"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  17
                                                </div>
                                                <div
                                                  id="zr91_18"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  18
                                                </div>
                                                <div
                                                  id="zr91_19"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  19
                                                </div>
                                                <div
                                                  id="zr91_20"
                                                  className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                  style={{
                                                    height: "5vh",
                                                    width: "45px",
                                                  }}
                                                >
                                                  20
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      </table>
                                      <div
                                        className="main_div d-flex"
                                        style={{ marginLeft: "-12px" }}
                                      >
                                        <div className="d-flex flex-column">
                                          <div
                                            id="j1"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "300px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              J01
                                            </span>
                                          </div>
                                          <div
                                            id="j2"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "300px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              J02
                                            </span>
                                          </div>
                                          <div
                                            id="j3"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "300px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              J03
                                            </span>
                                          </div>
                                          <div
                                            id="j4"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "300px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              J04
                                            </span>
                                          </div>
                                          <div
                                            id="j5"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "300px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              J05
                                            </span>
                                          </div>
                                          <div
                                            className="main  py-1 px-1  d-flex flex-column  position-relative"
                                            style={{ width: "300px" }}
                                          >
                                            <div style={{ ...customStyles }}>
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            id="j6"
                                            className="d-flex position-relative"
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              J06
                                            </span>
                                            <div
                                              id="j6_1"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "188px",
                                                height: "23vh",
                                              }}
                                            >
                                              1
                                            </div>
                                            <div
                                              id="j6_2"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center "
                                              style={{
                                                width: "107px",
                                                height: "23vh",
                                              }}
                                            >
                                              2
                                            </div>
                                          </div>
                                          <div
                                            id="jo7"
                                            className="d-flex position-relative"
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              J07
                                            </span>
                                            <div
                                              id="j7_1"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                              style={{
                                                width: "60px",
                                                height: "23vh",
                                              }}
                                            >
                                              1
                                            </div>
                                            <div
                                              id="j7_2"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center "
                                              style={{
                                                width: "60px",
                                                height: "23vh",
                                              }}
                                            >
                                              2
                                            </div>
                                            <div
                                              id="j3_3"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center "
                                              style={{
                                                width: "179px",
                                                height: "23vh",
                                              }}
                                            >
                                              3
                                            </div>
                                          </div>
                                          <div
                                            id="j8"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "300px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              J08
                                            </span>
                                          </div>
                                          <div
                                            className="d-flex align-items-center justify-content-center position-absolute border-light border border-2"
                                            style={{
                                              height: "35.9vh",
                                              width: "92px",
                                              backgroundColor: "#f5adad",
                                              zIndex: "2",
                                              marginLeft: "0rem",
                                              marginTop: "99rem",
                                              fontSize: "30px",
                                              fontWeight: "bold",
                                            }}
                                          >
                                            1
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column position-relative"
                                            style={{
                                              width: "300px",
                                              height: "16vh",
                                            }}
                                          >
                                            {/* <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="s07"
                                        style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                                    >
                                        S07
                                    </span> */}

                                            {/* Static content for each row */}
                                            <div style={{ ...customStyles }}>
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div className="d-flex">
                                            <div
                                              id="j9"
                                              className=" position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center "
                                              style={{
                                                width: "216px",
                                                height: "23vh",
                                              }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                J09
                                              </span>
                                            </div>
                                            <div
                                              id="j10"
                                              className=" position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center "
                                              style={{
                                                width: "84px",
                                                height: "23vh",
                                              }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                J10
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div
                                          className="d-flex flex-column"
                                          style={{ width: "12em" }}
                                        >
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>{" "}
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="d-flex flex-column">
                                          <div
                                            id="k1"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              K01
                                            </span>
                                          </div>
                                          <div
                                            id="k2"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              K02
                                            </span>
                                          </div>
                                          <div
                                            id="k3"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              K03
                                            </span>
                                          </div>
                                          <div
                                            id="k4"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              K04
                                            </span>
                                          </div>
                                          <div
                                            id="k5"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              K05
                                            </span>
                                          </div>
                                          <div
                                            id="k6"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              K06
                                            </span>
                                          </div>
                                          <div
                                            className="main  py-1 px-1  d-flex flex-column position-relative"
                                            style={{ width: "367px" }}
                                          >
                                            {/* <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="s07"
                                        style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                                    >
                                        S07
                                    </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{ ...customStyles }}
                                            ></div>
                                          </div>
                                          <div
                                            id="k7"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              K07
                                            </span>
                                          </div>
                                          <div
                                            id="k8"
                                            className="d-flex position-relative"
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              K08
                                            </span>
                                            <div
                                              id="k8_1"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                              style={{
                                                width: "100px",
                                                height: "15vh",
                                              }}
                                            >
                                              1
                                            </div>
                                            <div
                                              id="k8_2"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center "
                                              style={{
                                                width: "267px",
                                                height: "15vh",
                                              }}
                                            >
                                              2
                                            </div>
                                          </div>
                                          <div
                                            id="k9"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "18vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              K09
                                            </span>
                                          </div>
                                          <div
                                            className="main  py-1 px-1  d-flex flex-column  position-relative"
                                            style={{ width: "367px" }}
                                          >
                                            {/* <span
                                        className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                        id="s07"
                                        style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                                    >
                                        S07
                                    </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{ ...customStyles }}
                                            ></div>
                                          </div>
                                          <div
                                            id="k10"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "16vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              K10
                                            </span>
                                          </div>

                                          <div className="d-flex position-relative">
                                            <div
                                              id="k11"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center "
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                K11
                                              </span>

                                              <div
                                                id="j10_1"
                                                className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                style={{
                                                  width: "120px",
                                                  height: "23vh",
                                                }}
                                              >
                                                1
                                              </div>
                                              <div
                                                id="k11_2"
                                                className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center "
                                                style={{
                                                  width: "248px",
                                                  height: "23vh",
                                                }}
                                              >
                                                2
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        <div
                                          className="d-flex flex-column"
                                          style={{ width: "12em" }}
                                        >
                                          <div
                                            id="s6"
                                            className="col-md-2 bg-secondary border border-light rounded position-relative"
                                            style={{
                                              height: "5vh",
                                              width: "12em",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-2  rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              S6
                                            </span>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="d-flex flex-column">
                                          <div
                                            id="l1"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              L01
                                            </span>
                                          </div>
                                          <div
                                            id="l2"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              L02
                                            </span>
                                          </div>
                                          <div
                                            id="l3"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              L03
                                            </span>
                                          </div>
                                          <div
                                            id="l4"
                                            className="position-relative bg-secondary border rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              L04
                                            </span>
                                          </div>
                                          <div
                                            id="l5"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              L05
                                            </span>
                                          </div>
                                          <div
                                            id="l6"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              L06
                                            </span>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div style={{ ...customStyles }}>
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            id="l7"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              L07
                                            </span>
                                          </div>
                                          <div
                                            id="l8"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "20vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              L08
                                            </span>
                                          </div>
                                          <div
                                            id="l9"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              L09
                                            </span>
                                          </div>
                                          <div
                                            id="l10"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "300px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              L10
                                            </span>
                                          </div>
                                          <div
                                            className="d-flex align-items-center justify-content-center position-absolute border-light border border-2"
                                            style={{
                                              height: "12.9vh",
                                              width: "198px",
                                              backgroundColor: "#953dd1",
                                              zIndex: "2",
                                              marginLeft: "10.5rem",
                                              marginTop: "100rem",
                                              fontSize: "30px",
                                              fontWeight: "bold",
                                            }}
                                          >
                                            Rack
                                          </div>
                                          <div className="d-flex">
                                            <div
                                              id="l11"
                                              className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "199px",
                                                height: "23vh",
                                              }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                L11
                                              </span>
                                            </div>
                                            <div
                                              // id='m12'
                                              className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "166px",
                                                height: "23vh",
                                              }}
                                            >
                                              {/* <span
                                                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                                                style={{ zIndex: 1, backdropFilter: 'blur(1px)' }}
                                                                            >
                                                                                M12
                                                                            </span> */}
                                            </div>
                                          </div>
                                        </div>

                                        <div
                                          className="d-flex flex-column"
                                          style={{ width: "12em" }}
                                        >
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="d-flex flex-column">
                                          <div
                                            id="m1"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "274px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              M01
                                            </span>
                                          </div>
                                          <div
                                            className="d-flex align-items-center justify-content-center position-absolute border-light border border-2"
                                            style={{
                                              height: "45.9vh",
                                              width: "148px",
                                              backgroundColor: "#96c74f",
                                              zIndex: "2",
                                              marginLeft: "17.2rem",
                                              marginTop: "0rem",
                                              fontSize: "30px",
                                              fontWeight: "bold",
                                            }}
                                          ></div>
                                          <div
                                            className="d-flex align-items-center justify-content-center position-absolute border-light border border-2"
                                            style={{
                                              height: "34.9vh",
                                              width: "67px",
                                              backgroundColor: "#96c74f",
                                              zIndex: "2",
                                              marginLeft: "13rem",
                                              marginTop: "0rem",
                                              fontSize: "30px",
                                              fontWeight: "bold",
                                            }}
                                          ></div>
                                          <div
                                            className="d-flex align-items-center justify-content-center position-absolute border-light border border-2"
                                            style={{
                                              height: "5.9vh",
                                              width: "160px",
                                              backgroundColor: "#96c74f",
                                              zIndex: "2",
                                              marginLeft: "3rem",
                                              marginTop: "0rem",
                                              fontSize: "30px",
                                              fontWeight: "bold",
                                            }}
                                          ></div>
                                          <div
                                            id="m2"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "274px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              M02
                                            </span>
                                          </div>
                                          <div
                                            id="m3"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "274px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              M03
                                            </span>
                                          </div>
                                          <div
                                            id="m4"
                                            className="position-relative bg-secondary border rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "274px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              M04
                                            </span>
                                          </div>
                                          <div
                                            id="m5"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "274px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              M05
                                            </span>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div style={{ ...customStyles }}>
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            id="m7"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "424px",
                                              height: "16vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              M07
                                            </span>
                                          </div>
                                          <div
                                            id="m8"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "424px",
                                              height: "18vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              M08
                                            </span>
                                          </div>
                                          <div
                                            id="m9"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "424px",
                                              height: "17vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              M09
                                            </span>
                                          </div>
                                          <div
                                            id="m10"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "424px",
                                              height: "17vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              M10
                                            </span>
                                          </div>
                                          <div
                                            id="m11"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "424px",
                                              height: "18vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              M11
                                            </span>
                                          </div>
                                          <div className="d-flex">
                                            <div
                                              id="m12"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "154px",
                                                height: "21vh",
                                              }}
                                            ></div>
                                            <div
                                              id="m13"
                                              className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "269px",
                                                height: "21vh",
                                              }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                M13
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="">
                                          <div
                                            id="m6"
                                            className="bg-secondary border border-light rounded position-relative"
                                            style={{
                                              height: "69vh",
                                              width: "150px",
                                              zIndex: "2",
                                              marginLeft: "-150px",
                                              marginTop: "358px",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-2  rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              M06
                                            </span>
                                          </div>
                                        </div>

                                        <div
                                          className="d-flex flex-column"
                                          style={{ width: "12em" }}
                                        >
                                          <div
                                            id="s7"
                                            className=" col-md-2 bg-secondary border border-light rounded position-relative"
                                            style={{
                                              height: "5vh",
                                              width: "12em",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-2  rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              S7
                                            </span>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                        </div>
                                        <div
                                          className="col-md-1 bg-light"
                                          style={{ width: "0px" }}
                                        ></div>
                                        <div className="d-flex flex-column">
                                          <div
                                            id="n1"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              N01
                                            </span>
                                          </div>
                                          <div
                                            id="n2"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              N02
                                            </span>
                                          </div>
                                          <div
                                            id="n3"
                                            className="d-flex position-relative"
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              N03
                                            </span>
                                            <div
                                              id="n3_1"
                                              className=" bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "98px",
                                                height: "23vh",
                                              }}
                                            >
                                              1
                                            </div>
                                            <div
                                              id="n3_3"
                                              className=" bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "268px",
                                                height: "23vh",
                                              }}
                                            >
                                              3
                                            </div>
                                          </div>
                                          <div
                                            id="n4"
                                            className="position-relative bg-secondary border rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              N04
                                            </span>
                                          </div>
                                          <div
                                            id="n5"
                                            className="d-flex position-relative"
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              N05
                                            </span>
                                            <div
                                              id="n5_1"
                                              className=" bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "218px",
                                                height: "23vh",
                                              }}
                                            >
                                              1
                                            </div>
                                            <div
                                              id="n5_3"
                                              className=" bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "148px",
                                                height: "23vh",
                                              }}
                                            >
                                              3
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div style={{ ...customStyles }}>
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            id="n6"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "22vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              N06
                                            </span>
                                          </div>
                                          <div
                                            id="n7"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "22vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              N07
                                            </span>
                                          </div>
                                          <div
                                            id="n8"
                                            className="d-flex position-relative"
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              N08
                                            </span>
                                            <div
                                              id="n8_1"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "183px",
                                                height: "19vh",
                                              }}
                                            >
                                              1
                                            </div>
                                            <div
                                              id="n8_2"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "183px",
                                                height: "19vh",
                                              }}
                                            >
                                              2
                                            </div>
                                          </div>
                                          <div
                                            className="d-flex align-items-center justify-content-center position-absolute border-light border border-2"
                                            style={{
                                              height: "35.9vh",
                                              width: "92px",
                                              backgroundColor: "#f5adad",
                                              zIndex: "2",
                                              marginLeft: "0rem",
                                              marginTop: "99rem",
                                              fontSize: "30px",
                                              fontWeight: "bold",
                                            }}
                                          >
                                            2
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div style={{ ...customStyles }}>
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div className="d-flex position-relative">
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              N09
                                            </span>
                                            <div
                                              id="n9_1"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center "
                                              style={{
                                                width: "125px",
                                                height: "25vh",
                                              }}
                                            >
                                              1
                                            </div>
                                            <div
                                              id="n9_2"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center "
                                              style={{
                                                width: "125px",
                                                height: "25vh",
                                              }}
                                            >
                                              2
                                            </div>
                                            <div
                                              id="n10"
                                              className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                              style={{
                                                width: "125px",
                                                height: "25vh",
                                              }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                N10
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div
                                          className="d-flex flex-column"
                                          style={{ width: "12em" }}
                                        >
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                        </div>
                                        <div
                                          className="d-flex flex-column"
                                          style={{ marginLeft: "2px" }}
                                        >
                                          <div
                                            id="o1"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              O01
                                            </span>
                                          </div>
                                          <div
                                            id="o2"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              O02
                                            </span>
                                          </div>
                                          <div
                                            id="o3"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              O03
                                            </span>
                                          </div>
                                          <div
                                            id="o4"
                                            className="position-relative bg-secondary border rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              O04
                                            </span>
                                          </div>
                                          <div
                                            id="o5"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              O05
                                            </span>
                                          </div>
                                          <div
                                            id="o6"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              O06
                                            </span>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div style={{ ...customStyles }}>
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            id="o7"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "16vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              O07
                                            </span>
                                          </div>
                                          <div
                                            id="o8"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "16vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              O08
                                            </span>
                                          </div>
                                          <div
                                            id="o9"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "17vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              O09
                                            </span>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div style={{ ...customStyles }}>
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            id="o10"
                                            className="d-flex position-relative"
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              O10
                                            </span>
                                            <div
                                              id="o10_1"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "210px",
                                                height: "15vh",
                                              }}
                                            >
                                              1
                                            </div>
                                            <div
                                              id="o10_2"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "145px",
                                                height: "15vh",
                                              }}
                                            >
                                              2
                                            </div>
                                          </div>
                                          <div
                                            id="o11"
                                            className="d-flex position-relative"
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              O11
                                            </span>
                                            <div
                                              id="n10_1"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "142px",
                                                height: "25vh",
                                              }}
                                            >
                                              1
                                            </div>
                                            <div
                                              id="o11_2"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "213px",
                                                height: "25vh",
                                              }}
                                            >
                                              2
                                            </div>
                                          </div>
                                        </div>
                                        <div
                                          className="d-flex flex-column"
                                          style={{ width: "12em" }}
                                        >
                                          <div
                                            id="s8"
                                            className=" col-md-2 bg-secondary border border-light rounded position-relative"
                                            style={{
                                              height: "5vh",
                                              width: "12em",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-2  rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              S8
                                            </span>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>{" "}
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="d-flex flex-column">
                                          <div
                                            id="p1"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              P01
                                            </span>
                                          </div>
                                          <div
                                            id="p2"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              P02
                                            </span>
                                          </div>
                                          <div
                                            id="p3"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              P03
                                            </span>
                                          </div>
                                          <div
                                            id="p4"
                                            className="position-relative bg-secondary border rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              P04
                                            </span>
                                          </div>
                                          <div
                                            id="p5"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              P05
                                            </span>
                                          </div>
                                          <div
                                            id="p6"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "19vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              P06
                                            </span>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div style={{ ...customStyles }}>
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            id="p7"
                                            className="d-flex position-relative"
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              P07
                                            </span>
                                            <div
                                              id="p7_1"
                                              className=" bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "183px",
                                                height: "18vh",
                                              }}
                                            >
                                              1
                                            </div>
                                            <div
                                              id="p7_2"
                                              className=" bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "183px",
                                                height: "18vh",
                                              }}
                                            >
                                              2
                                            </div>
                                          </div>
                                          <div
                                            id="p8"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "16vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              P08
                                            </span>
                                          </div>
                                          <div
                                            id="p9"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              P09
                                            </span>
                                          </div>
                                          <div
                                            className="d-flex align-items-center justify-content-center position-absolute border-light border border-2"
                                            style={{
                                              height: "12.9vh",
                                              width: "198px",
                                              backgroundColor: "#953dd1",
                                              zIndex: "2",
                                              marginLeft: "10.5rem",
                                              marginTop: "105rem",
                                              fontSize: "30px",
                                              fontWeight: "bold",
                                            }}
                                          >
                                            Rack
                                          </div>
                                          <div
                                            id="p10"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "280px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              P10
                                            </span>
                                          </div>
                                          <div className="d-flex">
                                            <div
                                              id="p11"
                                              className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "267px",
                                                height: "25vh",
                                              }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                P11
                                              </span>
                                            </div>
                                            <div
                                              className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "100px",
                                                height: "25vh",
                                              }}
                                            >
                                                <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                P12
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div
                                          className="d-flex flex-column"
                                          style={{ width: "12em" }}
                                        >
                                          {/* <div id='s8' className=" col-md-2 bg-secondary border border-light rounded position-relative" style={{ height: '5vh', width: "7em" }}>
                                        <span
                                            className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-2  rounded"
                                            style={{ zIndex: 1, backdropFilter: 'blur(1px)' }}
                                        >
                                            S8
                                        </span>

                                    </div> */}

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="d-flex flex-column">
                                          <div
                                            id="q1"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "274px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              Q01
                                            </span>
                                          </div>
                                          <div
                                            className="d-flex align-items-center justify-content-center position-absolute border-light border border-2"
                                            style={{
                                              height: "45.9vh",
                                              width: "93px",
                                              backgroundColor: "#96c74f",
                                              zIndex: "2",
                                              marginLeft: "17.2rem",
                                              marginTop: "0rem",
                                              fontSize: "30px",
                                              fontWeight: "bold",
                                            }}
                                          ></div>
                                          <div
                                            className="d-flex align-items-center justify-content-center position-absolute border-light border border-2"
                                            style={{
                                              height: "34.9vh",
                                              width: "67px",
                                              backgroundColor: "#96c74f",
                                              zIndex: "2",
                                              marginLeft: "13rem",
                                              marginTop: "0rem",
                                              fontSize: "30px",
                                              fontWeight: "bold",
                                            }}
                                          ></div>
                                          <div
                                            className="d-flex align-items-center justify-content-center position-absolute border-light border border-2"
                                            style={{
                                              height: "5.9vh",
                                              width: "160px",
                                              backgroundColor: "#96c74f",
                                              zIndex: "2",
                                              marginLeft: "3rem",
                                              marginTop: "0rem",
                                              fontSize: "30px",
                                              fontWeight: "bold",
                                            }}
                                          ></div>
                                          <div
                                            id="q2"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "274px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              Q02
                                            </span>
                                          </div>
                                          <div
                                            id="q3"
                                            className="d-flex position-relative"
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              Q03
                                            </span>
                                            <div
                                              id="q3_1"
                                              className=" bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                              style={{
                                                width: "77px",
                                                height: "23vh",
                                              }}
                                            >
                                              1
                                            </div>
                                            <div
                                              id="q3_2"
                                              className=" bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                              style={{
                                                width: "66px",
                                                height: "23vh",
                                              }}
                                            >
                                              2
                                            </div>
                                            <div
                                              id="q3_3"
                                              className=" bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "130px",
                                                height: "23vh",
                                              }}
                                            >
                                              3
                                            </div>
                                          </div>
                                          <div
                                            id="q4"
                                            className="position-relative bg-secondary border rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "274px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              Q04
                                            </span>
                                          </div>
                                          <div
                                            id="q5"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "274px",
                                              height: "23vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              Q05
                                            </span>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div style={{ ...customStyles }}>
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            id="q7"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "16vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              Q07
                                            </span>
                                          </div>
                                          <div
                                            id="q8"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "16vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              Q08
                                            </span>
                                          </div>
                                          <div
                                            id="q9"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "16vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              Q09
                                            </span>
                                          </div>
                                          <div
                                            id="q10"
                                            className="d-flex position-relative"
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              Q10
                                            </span>
                                            <div
                                              id="q10_1"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "183px",
                                                height: "19vh",
                                              }}
                                            >
                                              1
                                            </div>
                                            <div
                                              id="q10_2"
                                              className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "183px",
                                                height: "19vh",
                                              }}
                                            >
                                              2
                                            </div>
                                          </div>
                                          <div
                                            id="q11"
                                            className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                            style={{
                                              width: "367px",
                                              height: "16vh",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              Q11
                                            </span>
                                          </div>
                                          <div className="d-flex">
                                            <div
                                              id='p12'
                                              className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "98px",
                                                height: "21vh",
                                              }}
                                            >
                                              <span
                                                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                                                style={{ zIndex: 1, backdropFilter: 'blur(1px)' }}
                                                                            >
                                                                                P12
                                                                            </span>
                                            </div>
                                            <div
                                              id="q12"
                                              className="position-relative bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center p-5"
                                              style={{
                                                width: "268px",
                                                height: "21vh",
                                              }}
                                            >
                                              <span
                                                className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                style={{
                                                  zIndex: 1,
                                                  backdropFilter: "blur(1px)",
                                                }}
                                              >
                                                Q12
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="">
                                          <div
                                            id="q6"
                                            className="bg-secondary border border-light rounded position-relative"
                                            style={{
                                              height: "69vh",
                                              width: "90px",
                                              zIndex: "2",
                                              marginLeft: "-92px",
                                              marginTop: "358px",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-2  rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              Q06
                                            </span>
                                          </div>
                                        </div>
                                        <div
                                          className="d-flex flex-column"
                                          style={{ width: "12em" }}
                                        >
                                          <div
                                            id="s9"
                                            className=" col-md-2 bg-secondary border border-light rounded position-relative"
                                            style={{
                                              height: "5vh",
                                              width: "12em",
                                            }}
                                          >
                                            <span
                                              className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-2  rounded"
                                              style={{
                                                zIndex: 1,
                                                backdropFilter: "blur(1px)",
                                              }}
                                            >
                                              S9
                                            </span>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>

                                          <div
                                            className="main  py-1 px-1 d-flex flex-column  position-relative"
                                            style={{ width: "193px" }}
                                          >
                                            {/* <span
                                  className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                  id="s07"
                                  style={{ zIndex: 1, backdropFilter: 'blur(1px)', fontSize: "10px" }}
                              >
                                  S07
                              </span> */}

                                            {/* Static content for each row */}
                                            <div
                                              style={{
                                                ...customStyles,
                                                height: "20vh",
                                                width: "193px",
                                                border: "none",
                                              }}
                                            >
                                              {/* Inner divs removed */}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="right_sec">
                                          <div className="d-flex gap-0 flex-row m-auto">
                                            {["R1", "R2", "R3", "R4"].map(
                                              (rowLabel) => (
                                                <div
                                                  key={rowLabel}
                                                  id={rowLabel} // Main box ID
                                                  className="main p-2 d-flex flex-column bg-dark border-light border border-1 position-relative"
                                                >
                                                  <span
                                                    className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                    style={{
                                                      zIndex: 1,
                                                      backdropFilter:
                                                        "blur(1px)",
                                                    }}
                                                  >
                                                    {rowLabel}
                                                  </span>
                                                  {[...Array(4)].map(
                                                    (_, rowIndex) => (
                                                      <div
                                                        key={rowIndex}
                                                        className="d-flex"
                                                      >
                                                        {[...Array(5)].map(
                                                          (_, colIndex) => {
                                                            const boxNumber =
                                                              rowIndex * 5 +
                                                              colIndex +
                                                              1; // Calculate box number
                                                            const boxId = `${rowLabel}_${boxNumber}`; // Generate unique ID
                                                            return (
                                                              <div
                                                                key={boxId}
                                                                id={boxId.toLowerCase()} // Assign unique ID to each inner box
                                                                className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                                style={{
                                                                  height:
                                                                    "11vh",
                                                                  width: "30px",
                                                                  fontSize:
                                                                    "10px",
                                                                }}
                                                              >
                                                                {boxNumber}
                                                              </div>
                                                            );
                                                          }
                                                        )}
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              )
                                            )}
                                          </div>

                                          <div
                                            className="bg-light border border-light rounded position-relative "
                                            style={{
                                              height: "23vh",
                                              width: "10px",
                                            }}
                                          ></div>
                                          <div className="d-flex gap-0 flex-row m-auto">
                                            {["R5", "R6", "R7", "R8"].map(
                                              (rowLabel) => (
                                                <div
                                                  key={rowLabel}
                                                  id={rowLabel} // Main box ID
                                                  className="main p-2 d-flex flex-column bg-dark border-light border border-1 position-relative"
                                                >
                                                  <span
                                                    className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                    style={{
                                                      zIndex: 1,
                                                      backdropFilter:
                                                        "blur(1px)",
                                                    }}
                                                  >
                                                    {rowLabel}
                                                  </span>
                                                  {[...Array(4)].map(
                                                    (_, rowIndex) => (
                                                      <div
                                                        key={rowIndex}
                                                        className="d-flex"
                                                      >
                                                        {[...Array(5)].map(
                                                          (_, colIndex) => {
                                                            const boxNumber =
                                                              rowIndex * 5 +
                                                              colIndex +
                                                              1; // Calculate box number
                                                            const boxId = `${rowLabel}_${boxNumber}`; // Generate unique ID
                                                            return (
                                                              <div
                                                                key={boxId}
                                                                id={boxId.toLowerCase()} // Assign unique ID to each inner box
                                                                className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                                style={{
                                                                  height:
                                                                    "11vh",
                                                                  width: "30px",
                                                                  fontSize:
                                                                    "10px",
                                                                }}
                                                              >
                                                                {boxNumber}
                                                              </div>
                                                            );
                                                          }
                                                        )}
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              )
                                            )}
                                          </div>

                                          <div className="d-flex gap-0 flex-row m-auto">
                                            {["R9", "R10", "R11", "R12"].map(
                                              (rowLabel) => (
                                                <div
                                                  key={rowLabel}
                                                  id={rowLabel} // Main box ID
                                                  className="main p-2 d-flex flex-column bg-dark border-light border border-1 position-relative"
                                                >
                                                  <span
                                                    className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                    style={{
                                                      zIndex: 1,
                                                      backdropFilter:
                                                        "blur(1px)",
                                                    }}
                                                  >
                                                    {rowLabel}
                                                  </span>
                                                  {[...Array(4)].map(
                                                    (_, rowIndex) => (
                                                      <div
                                                        key={rowIndex}
                                                        className="d-flex"
                                                      >
                                                        {[...Array(5)].map(
                                                          (_, colIndex) => {
                                                            const boxNumber =
                                                              rowIndex * 5 +
                                                              colIndex +
                                                              1; // Calculate box number
                                                            const boxId = `${rowLabel}_${boxNumber}`; // Generate unique ID
                                                            return (
                                                              <div
                                                                key={boxId}
                                                                id={boxId.toLowerCase()} // Assign unique ID to each inner box
                                                                className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                                style={{
                                                                  height:
                                                                    "11vh",
                                                                  width: "30px",
                                                                  fontSize:
                                                                    "10px",
                                                                }}
                                                              >
                                                                {boxNumber}
                                                              </div>
                                                            );
                                                          }
                                                        )}
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              )
                                            )}
                                          </div>

                                          <div
                                            className="bg-light border border-light rounded position-relative "
                                            style={{
                                              height: "27vh",
                                              width: "10px",
                                            }}
                                          ></div>
                                          <div className="d-flex gap-0 flex-row m-auto">
                                            {["R13", "R14", "R15", "R16"].map(
                                              (rowLabel) => (
                                                <div
                                                  key={rowLabel}
                                                  id={rowLabel} // Main box ID
                                                  className="main p-2 d-flex flex-column bg-dark border-light border border-1 position-relative"
                                                >
                                                  <span
                                                    className="position-absolute top-50 start-50 translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                                    style={{
                                                      zIndex: 1,
                                                      backdropFilter:
                                                        "blur(1px)",
                                                    }}
                                                  >
                                                    {rowLabel}
                                                  </span>
                                                  {[...Array(4)].map(
                                                    (_, rowIndex) => (
                                                      <div
                                                        key={rowIndex}
                                                        className="d-flex"
                                                      >
                                                        {[...Array(5)].map(
                                                          (_, colIndex) => {
                                                            const boxNumber =
                                                              rowIndex * 5 +
                                                              colIndex +
                                                              1; // Calculate box number
                                                            const boxId = `${rowLabel}_${boxNumber}`; // Generate unique ID
                                                            return (
                                                              <div
                                                                key={boxId}
                                                                id={boxId.toLowerCase()} // Assign unique ID to each inner box
                                                                className="bg-secondary border border-light rounded text-white d-flex align-items-center justify-content-center"
                                                                style={{
                                                                  height:
                                                                    "11vh",
                                                                  width: "30px",
                                                                  fontSize:
                                                                    "10px",
                                                                }}
                                                              >
                                                                {boxNumber}
                                                              </div>
                                                            );
                                                          }
                                                        )}
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="end_section d-flex mt-3">
                                        <div
                                          className=""
                                          style={{ marginRight: "261px" }}
                                        ></div>
                                        <div
                                          id="s10"
                                          className="rounded text-white d-flex "
                                          style={{
                                            justifyContent: "center",
                                            alignItems: "center",
                                          }}
                                        >
                                          <span
                                            className=" translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              width: "189px",
                                              marginLeft: "117px",
                                              marginTop: "-15px",
                                            }}
                                          >
                                            S10
                                          </span>
                                        </div>
                                        <div
                                          className=""
                                          style={{ marginRight: "274px" }}
                                        ></div>
                                        <div
                                          id="s11"
                                          className="rounded text-white d-flex "
                                          style={{
                                            justifyContent: "center",
                                            alignItems: "center",
                                          }}
                                        >
                                          <span
                                            className=" translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              width: "186px",
                                              marginLeft: "81px",
                                              marginTop: "-18px",
                                            }}
                                          >
                                            S11
                                          </span>
                                        </div>
                                        <div
                                          className=""
                                          style={{ marginRight: "346px" }}
                                        ></div>
                                        <div
                                          id="s12"
                                          className=" rounded text-white d-flex "
                                          style={{
                                            justifyContent: "center",
                                            alignItems: "center",
                                          }}
                                        >
                                          <span
                                            className=" translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              width: "186px",
                                              marginLeft: "14px",
                                              marginTop: "-23px",
                                            }}
                                          >
                                            S12
                                          </span>
                                        </div>
                                        <div
                                          className=""
                                          style={{ marginRight: "384px" }}
                                        ></div>
                                        <div
                                          id="s13"
                                          className=" rounded text-white d-flex center"
                                          style={{
                                            justifyContent: "center",
                                            alignItems: "center",
                                          }}
                                        >
                                          <span
                                            className=" translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              width: "106px",
                                              marginTop: "-28px",
                                            }}
                                          >
                                            S13
                                          </span>
                                        </div>
                                        <div
                                          className=""
                                          style={{ marginRight: "392px" }}
                                        ></div>
                                        <div
                                          id="s14"
                                          className=" rounded text-white d-flex "
                                          style={{
                                            justifyContent: "center",
                                            alignItems: "center",
                                          }}
                                        >
                                          <span
                                            className=" translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              width: "185px",
                                              marginLeft: "96px",
                                              marginTop: "-60px",
                                            }}
                                          >
                                            S14
                                          </span>
                                        </div>
                                        <div
                                          className=""
                                          style={{ marginRight: "368px" }}
                                        ></div>
                                        <div
                                          id="s15"
                                          className=" rounded text-white d-flex "
                                          style={{
                                            justifyContent: "center",
                                            alignItems: "center",
                                          }}
                                        >
                                          <span
                                            className=" translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              width: "200px",
                                              marginTop: "-62px",
                                              marginLeft: "-11px",
                                            }}
                                          >
                                            S15
                                          </span>
                                        </div>
                                        <div
                                          className=""
                                          style={{ marginRight: "375px" }}
                                        ></div>
                                        <div
                                          id="s16"
                                          className="rounded text-white d-flex "
                                          style={{
                                            justifyContent: "center",
                                            alignItems: "center",
                                          }}
                                        >
                                          <span
                                            className=" translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              width: "183px",
                                              marginLeft: "-23px",
                                              marginTop: "-77px",
                                            }}
                                          >
                                            S16
                                          </span>
                                        </div>
                                        <div
                                          className=""
                                          style={{ marginRight: "346px" }}
                                        ></div>
                                        <div
                                          id="s17"
                                          className="rounded text-white d-flex "
                                          style={{
                                            justifyContent: "center",
                                            alignItems: "center",
                                          }}
                                        >
                                          <span
                                            className=" translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              width: "109px",
                                              marginTop: "-64px",
                                              marginLeft: "-24px",
                                            }}
                                          >
                                            S17
                                          </span>
                                        </div>
                                        <div
                                          className=""
                                          style={{ marginRight: "429px" }}
                                        ></div>
                                        <div
                                          id="s18"
                                          className="rounded text-white d-flex "
                                          style={{
                                            justifyContent: "center",
                                            alignItems: "center",
                                          }}
                                        >
                                          <span
                                            className=" translate-middle text-center text-white bg-dark bg-opacity-75 px-3 py-1 rounded"
                                            style={{
                                              zIndex: 1,
                                              backdropFilter: "blur(1px)",
                                              width: "133px",
                                              marginTop: "-54px",
                                              marginLeft: "120px",
                                            }}
                                          >
                                            S18
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