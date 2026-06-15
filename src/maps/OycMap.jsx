import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { LocalApiBaseUrl } from "../Config";

export default function OycMap({
  setActiveGridSelection,
  onClose,
  setModalVisible2,
}) {
  const [Data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const GetData = useCallback(async () => {
    setLoading(true);

    try {
      const response = await axios.get(
        `${LocalApiBaseUrl}getoycmapdata`
      );

      console.log(response.data);

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
  }, [GetData]);

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
                <div
                  key={i}
                  style={{ width: "235px" }}
                  className="mb-5"
                >
                  <button
                    onClick={() => {
                      setActiveGridSelection(data);
                      onClose();
                      setModalVisible2(true);
                    }}
                    className="main bg-dark p-1 d-flex flex-column border-light border border-2 position-relative w-auto"
                  >
                    <div
                      className="border border-light rounded text-white d-flex align-items-center justify-content-center bg-secondary"
                      style={{
                        width: "200px",
                        height: "200px",
                      }}
                    >
                      <h5 className="text-white">
                        {data.location_code}
                      </h5>
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