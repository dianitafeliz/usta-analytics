import React, { useEffect, useState } from "react";
import "../styles/Dashboard.css";
import FacultadChart from "./FacultadChart";

function Dashboard() {
  const [data, setData] = useState([]);

  // Llamada al backend FastAPI
  useEffect(() => {
    fetch("http://localhost:8000/estudiantes_por_facultad")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error("Error cargando datos:", err));
  }, []);

  return (
    <div className="dashboard">
      <h1>Dashboard principal — Período 2024-2</h1>
      <button>Exportar</button>

      <div className="cards">
        <div className="card">Estudiantes activos: (espacio)</div>
        <div className="card">Tasa de deserción: (espacio)</div>
        <div className="card">Promedio académico: (espacio)</div>
        <div className="card">Alertas activas: (espacio)</div>
      </div>

      <div className="charts">
        {/* Aquí ya ubicas tu gráfico en el espacio del dashboard */}
        <div className="chart">
          <FacultadChart dataFromApi={data} />
        </div>
        <div className="chart">📈 Tendencia de matrícula (placeholder)</div>
      </div>

      <div className="surveys">
        <div className="card">Última encuesta — Percepción académica (espacio)</div>
      </div>
    </div>
  );
}

export default Dashboard;
