import React, { useState, useEffect, useRef, useCallback } from "react";
// import Nav from "../../main/nav";
// import Footer from "../../main/footer";
import axios from "axios";
import Swal from "sweetalert2";
import Legend from "./Legend";
import { Link } from "react-router-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ApiBaseUrl, LocalApiBaseUrl } from "../Config";

export default function OycMap({
  setActiveGridSelection,
  activeGridSelection,
  onClose,
  setModalVisible2,
  SelectedGrids,
  setSelectedGrids
}) {
  const [zoomLevel, setZoomLevel] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const transformRef = useRef(null);

  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const rafRef = useRef(null);
  const dragTimeoutRef = useRef(null);

  const customStyles = {
    marginTop: "0px",
    height: "100%",
    width: "80px",
    backgroundColor: "#f0f0f0",
    borderRadius: "0px",
    border: "none",
  };

  const handleWheel = useCallback((event) => {
    event.preventDefault();
    if (!containerRef.current) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const zoomFactor = event.deltaY > 0 ? 0.85 : 1.1;
      setZoomLevel((prevZoom) =>
        Math.max(0.5, Math.min(prevZoom * zoomFactor, 5))
      );
      rafRef.current = null;
    });
  }, []);

  const handleMouseDown = (event) => {
    setIsDragging(true);
    setStartPos({
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    });
  };

  const handleMouseMove = useCallback(
    (event) => {
      if (!isDragging) return;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const newX = event.clientX - startPos.x;
        const newY = event.clientY - startPos.y;

        setPosition({ x: newX, y: newY });
        rafRef.current = null;
      });
    },
    [isDragging, startPos]
  );

  const handleMouseUp = useCallback(() => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }

    dragTimeoutRef.current = setTimeout(() => {
      setIsDragging(false);
      dragTimeoutRef.current = null;
    }, 50);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseUp);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseUp);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, [handleWheel, handleMouseMove, handleMouseUp]);

  const [Data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const GetData = useCallback(async () => {
     setLoading(true);
    try {
       const response = await axios.get(
      `${LocalApiBaseUrl}getoycmapdata`
    );

      if (response.data?.data) {
        setData(response.data.data);
      } else {
        Swal.fire({
          icon: "info",
          text: "Something went wrong!",
          timer: 3000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        text: `Error fetching data: ${error.message}`,
        timer: 3000,
        showConfirmButton: false,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    GetData();
  }, []);


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
      <div className="container">
        <div className="row align-items-center justify-content-center">
            <div className="col-md-6">
            <div className="row align-items-center justify-content-center">

           
          {Data?.map((data, i) => (
            <div key={i} style={{ width: "235px" }} className="mb-5">
              <button onClick={()=>{
                 setActiveGridSelection(data);
                 onClose();
                 setModalVisible2(true)
              }} className="main bg-dark p-1 d-flex flex-column border-light border border-2 position-relative w-auto">
                <div
                  className={`border border-light rounded text-white d-flex align-items-center justify-content-center bg-secondary`}
                  style={{ width: "200px", height: "200px" }}
                >
                  <h5 className="text-white">{data.location_code}</h5>
                </div>
              </button>
            </div>
          ))}
           </div>
           </div>
        </div>
      </div>
    </>
  );
}
