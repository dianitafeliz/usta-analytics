import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend
);

function Reportes() {
  const [dataFacultades, setDataFacultades] = useState([]);
  const [dataProgramas, setDataProgramas] = useState([]);
  const [facultad, setFacultad] = useState("Todos");
  const [periodo, setPeriodo] = useState("Todos");

  useEffect(() => {
    axios
      .get(`http://127.0.0.1:8000/detalle_facultad?periodo=${periodo}`)
      .then((res) => setDataFacultades(res.data))
      .catch((err) => console.error(err));

    axios
      .get(`http://127.0.0.1:8000/desercion_por_programa?periodo=${periodo}`)
      .then((res) => setDataProgramas(res.data))
      .catch((err) => console.error(err));
  }, [periodo]);

  // Filtro por facultad
  const filteredFacultades =
    facultad === "Todos"
      ? dataFacultades
      : dataFacultades.filter((d) => d.facultad === facultad);

  const filteredProgramas =
    facultad === "Todos"
      ? dataProgramas
      : dataProgramas.filter((d) => d.facultad === facultad);

  // ✅ Agrupar por programa para la TABLA (sumar matriculados y desertores)
  const programasAgrupados = Object.values(
    filteredProgramas.reduce((acc, row) => {
      const key = row.programa;
      if (!acc[key]) {
        acc[key] = {
          programa: row.programa,
          facultad: row.facultad,
          matriculados: 0,
          desertores: 0,
        };
      }
      acc[key].matriculados += row.matriculados;
      acc[key].desertores += row.desertores;
      return acc;
    }, {})
  ).map((r) => ({
    ...r,
    tasa: ((r.desertores / r.matriculados) * 100).toFixed(2),
  }));

  // ✅ Gráfico de barras — usa programas agrupados
  const chartProgramasBar = {
    labels: programasAgrupados.map((d) => d.programa),
    datasets: [
      {
        label: "% Deserción",
        data: programasAgrupados.map((d) => parseFloat(d.tasa)),
        backgroundColor: ["#4e79a7", "#e15759", "#76b7b2", "#f28e2b",
          "#59a14f", "#edc948", "#b07aa1", "#ff9da7"],
        barThickness: 40,
      },
    ],
  };

  // ✅ Gráfico de líneas — usa filas con periodo (datos sin agrupar)
  const periodos = [...new Set(filteredProgramas.map((d) => d.periodo))].sort();
  const facultadesUnicas = [...new Set(filteredProgramas.map((d) => d.facultad))];
  const colores = ["#4e79a7", "#e15759", "#76b7b2", "#f28e2b", "#59a14f"];

  const chartFacultadesLine = {
    labels: periodos,
    datasets: facultadesUnicas.map((fac, idx) => ({
      label: fac,
      data: periodos.map((per) => {
        const filas = filteredProgramas.filter(
          (d) => d.facultad === fac && d.periodo === per
        );
        if (filas.length === 0) return null;
        const totalMat = filas.reduce((s, d) => s + d.matriculados, 0);
        const totalDes = filas.reduce((s, d) => s + d.desertores, 0);
        return parseFloat(((totalDes / totalMat) * 100).toFixed(2));
      }),
      borderColor: colores[idx % colores.length],
      backgroundColor: colores[idx % colores.length],
      fill: false,
      tension: 0.3,
      spanGaps: false,
    })),
  };

  // Resumen
  const totalMat = programasAgrupados.reduce((s, d) => s + d.matriculados, 0);
  const totalDes = programasAgrupados.reduce((s, d) => s + d.desertores, 0);
  const tasaGlobal = totalMat > 0 ? ((totalDes / totalMat) * 100).toFixed(2) : "-";

  const mayorRiesgo =
    filteredFacultades.length > 0
      ? filteredFacultades.reduce((a, b) =>
          (a.porcentaje_desercion || 0) > (b.porcentaje_desercion || 0) ? a : b
        ).facultad
      : "-";

  return (
    <div style={{ padding: "20px" }}>
      <h2>Reportes</h2>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <select value={facultad} onChange={(e) => setFacultad(e.target.value)}>
          <option value="Todos">Todos</option>
          <option value="Ingeniería">Ingeniería</option>
          <option value="Ciencias Económicas">Ciencias Económicas</option>
          <option value="Ciencias Jurídicas">Ciencias Jurídicas</option>
          <option value="Filosofía">Filosofía</option>
        </select>

        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
          <option value="Todos">Todos los periodos</option>
          <option value="2024-1">2024-1</option>
          <option value="2024-2">2024-2</option>
          <option value="2025-1">2025-1</option>
        </select>
      </div>

      {/* Fila 1: barras + tabla programas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px" }}>
          <h3>Tasa de deserción por programa</h3>
          <Bar data={chartProgramasBar} />
        </div>

        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px" }}>
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
              {programasAgrupados.map((row, idx) => (
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

      {/* Fila 2: líneas + tabla facultades */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px" }}>
          <h3>Evolución por periodo</h3>
          <Line data={chartFacultadesLine} />
        </div>

        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px" }}>
          <h3>Detalle por facultad</h3>
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
      </div>

      {/* Resumen */}
      <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", marginTop: "20px" }}>
        <h3>Resumen</h3>
        <p>Total facultades: {filteredFacultades.length}</p>
        <p>Mayor riesgo: {mayorRiesgo}</p>
        <p>Tasa global: {tasaGlobal}%</p>
        <p>Total desertores: {totalDes}</p>
        <p>Total matriculados: {totalMat}</p>
      </div>
    </div>
  );
}

export default Reportes;