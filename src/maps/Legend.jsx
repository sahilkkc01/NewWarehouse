import React from "react";

const Legend = ({ totalArea = 0 }) => {
  return (
    <div
      className="position-fixed bottom-0 start-0 bg-white p-3 shadow rounded mb-3 me-0 ms-5 manoj "
      style={{ zIndex: 1050, width: "200px", }}
    >
      <h6 className="fw-bold mt-2 mb-2">Legend</h6>
      <div className="d-flex align-items-center mb-2">
        <span
          className="me-2 d-inline-block rounded"
          style={{ width: "15px", height: "15px", backgroundColor: "#00b0c4" }}
        ></span>
        Spill Over
      </div>
      <div className="d-flex align-items-center mb-2">
        <span
          className="me-2 d-inline-block rounded"
          style={{ width: "15px", height: "15px", backgroundColor: "#8f51dd" }}
        ></span>
        Occupied
      </div>
      <div className="d-flex align-items-center mb-2">
        <span
          className="me-2 d-inline-block rounded"
          style={{ width: "15px", height: "15px", backgroundColor: "#ccc" }}
        ></span>
        Available
      </div>
      <div className="d-flex gap-2 align-items-center mt-2">
        <span>Total Area:</span>
        <span className="text-dark fw-semibold">{totalArea}SQM</span>
      </div>
    </div>
  );
};

export default Legend;
