import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Reportes() {
  const [dataFacultades, setDataFacultades] = useState([]);
  const [dataProgramas, setDataProgramas] = useState([]);
  const [facultad, setFacultad] = useState("Todos");

  useEffect(() => {
    // 🔹 Datos por facultad
    axios
      .get("http://127.0.0.1:8000/desercion_por_facultad")
      .then((res) => setDataFacultades(res.data))
      .catch((err) => console.error(err));

    // 🔹 Datos por programa
    axios
      .get("http://127.0.0.1:8000/desercion_por_programa")
      .then((res) => setDataProgramas(res.data))
      .catch((err) => console.error(err));
  }, []);

  // 🔹 Filtrado simple por facultad
  const filteredFacultades =
    facultad === "Todos"
      ? dataFacultades
      : dataFacultades.filter((d) => d.facultad === facultad);

  const filteredProgramas =
    facultad === "Todos"
      ? dataProgramas
      : dataProgramas.filter((d) => d.facultad === facultad);

  // 🔹 Gráfico por facultad
  const chartFacultades = {
    labels: filteredFacultades.map((d) => d.facultad),
    datasets: [
      {
        label: "% Deserción",
        data: filteredFacultades.map((d) => d.porcentaje_desercion),
        backgroundColor: ["#4e79a7", "#e15759", "#76b7b2", "#f28e2b"],
        barThickness: 40,
      },
    ],
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Reportes</h2>

      {/* 🔹 Filtros arriba */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <select value={facultad} onChange={(e) => setFacultad(e.target.value)}>
          <option>Todos</option>
          <option>Ingeniería</option>
          <option>Economía</option>
          <option>Derecho</option>
          <option>Filosofía</option>
        </select>
      </div>

      {/* 🔹 Sección 1: gráfico + tabla + resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Gráfico por facultad */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px" }}>
          <h3>Tasa de deserción por facultad</h3>
          <Bar data={chartFacultades} />
        </div>

        {/* Tabla detalle por facultad */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px" }}>
          <h3>Detalle</h3>
          <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "#eee" }}>
              <tr>
                <th>Facultad</th>
                <th>% Deserción</th>
              </tr>
            </thead>
            <tbody>
              {filteredFacultades.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.facultad}</td>
                  <td>{row.porcentaje_desercion}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumen */}
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            gridColumn: "span 2",
          }}
        >
          <h3>Resumen</h3>
          <p>Total facultades: {filteredFacultades.length}</p>
          <p>
            Mayor riesgo:{" "}
            {filteredFacultades.length > 0
              ? filteredFacultades.reduce((a, b) =>
                  a.porcentaje_desercion > b.porcentaje_desercion ? a : b
                ).facultad
              : "-"}
          </p>
          <p>
            Tasa global:{" "}
            {filteredFacultades.length > 0
              ? (
                  filteredFacultades.reduce(
                    (sum, d) => sum + d.porcentaje_desercion,
                    0
                  ) / filteredFacultades.length
                ).toFixed(2) + "%"
              : "-"}
          </p>
        </div>
      </div>

      {/* 🔹 Sección 2: detalle por programa */}
      <div
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "30px",
        }}
      >
        <h3>Detalle por programa</h3>
        <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#eee" }}>
            <tr>
              <th>Programa</th>
              <th>Facultad</th>
              <th>Matriculados</th>
              <th>Desertores</th>
              <th>Tasa</th>
            </tr>
          </thead>
          <tbody>
            {filteredProgramas.map((row, idx) => (
              <tr key={idx}>
                <td>{row.programa}</td>
                <td>{row.facultad}</td>
                <td>{row.matriculados}</td>
                <td>{row.desertores}</td>
                <td>{row.tasa}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Reportes;
