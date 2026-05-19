import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, Title, Tooltip, Legend,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const API = "http://127.0.0.1:8000";

// ─── Estilos ──────────────────────────────────────────────────────────────────
const card = {
  background: "#fff", borderRadius: 14,
  border: "1px solid #e5e7eb", padding: "20px",
};
const secTitle = {
  fontSize: 12, fontWeight: 700, color: "#6b7280",
  textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px",
};
const selectStyle = {
  padding: "8px 12px", borderRadius: 8,
  border: "1px solid #e5e7eb", fontSize: 13,
  outline: "none", background: "#fff", fontWeight: 500,
};
const thStyle = {
  padding: "10px 14px", textAlign: "left",
  fontSize: 11, color: "#6b7280", fontWeight: 700,
  borderBottom: "1px solid #e5e7eb", background: "#f9fafb",
};
const tdStyle = { padding: "10px 14px", fontSize: 13 };

// ─── KPI resumen ──────────────────────────────────────────────────────────────
function KPICard({ label, value, color }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || "#111827" }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Reportes() {
  const [dataFacultades, setDataFacultades] = useState([]);
  const [dataProgramas,  setDataProgramas]  = useState([]);
  const [facultad, setFacultad] = useState("Todos");
  const [periodo,  setPeriodo]  = useState("Todos");

  useEffect(() => {
    axios.get(`${API}/detalle_facultad?periodo=${periodo}`)
      .then(r => setDataFacultades(r.data))
      .catch(e => console.error(e));
    axios.get(`${API}/desercion_por_programa?periodo=${periodo}`)
      .then(r => setDataProgramas(r.data))
      .catch(e => console.error(e));
  }, [periodo]);

  // Filtros
  const filteredFacultades = facultad === "Todos"
    ? dataFacultades
    : dataFacultades.filter(d => d.facultad === facultad);

  const filteredProgramas = facultad === "Todos"
    ? dataProgramas
    : dataProgramas.filter(d => d.facultad === facultad);

  // Agrupar por programa para tabla y barras
  const programasAgrupados = Object.values(
    filteredProgramas.reduce((acc, row) => {
      const key = row.programa;
      if (!acc[key]) acc[key] = { programa: row.programa, facultad: row.facultad, matriculados: 0, desertores: 0 };
      acc[key].matriculados += row.matriculados;
      acc[key].desertores   += row.desertores;
      return acc;
    }, {})
  ).map(r => ({ ...r, tasa: ((r.desertores / r.matriculados) * 100).toFixed(2) }));

  // Gráfico barras
  const coloresBarra = ["#3b82f6","#ef4444","#22c55e","#f59e0b","#8b5cf6","#ec4899","#14b8a6","#f97316"];
  const chartBarras = {
    labels: programasAgrupados.map(d => d.programa),
    datasets: [{
      label: "% Deserción",
      data: programasAgrupados.map(d => parseFloat(d.tasa)),
      backgroundColor: coloresBarra,
      borderRadius: 6,
      barThickness: 36,
    }],
  };

  // Gráfico líneas
  const periodos        = [...new Set(filteredProgramas.map(d => d.periodo))].sort();
  const facultadesUnicas = [...new Set(filteredProgramas.map(d => d.facultad))];
  const coloresLinea    = ["#3b82f6","#ef4444","#22c55e","#f59e0b","#8b5cf6"];

  const chartLineas = {
    labels: periodos,
    datasets: facultadesUnicas.map((fac, idx) => ({
      label: fac,
      data: periodos.map(per => {
        const filas   = filteredProgramas.filter(d => d.facultad === fac && d.periodo === per);
        if (!filas.length) return null;
        const totalMat = filas.reduce((s, d) => s + d.matriculados, 0);
        const totalDes = filas.reduce((s, d) => s + d.desertores, 0);
        return parseFloat(((totalDes / totalMat) * 100).toFixed(2));
      }),
      borderColor:     coloresLinea[idx % coloresLinea.length],
      backgroundColor: coloresLinea[idx % coloresLinea.length],
      fill: false, tension: 0.3, spanGaps: false,
    })),
  };

  // Resumen
  const totalMat  = programasAgrupados.reduce((s, d) => s + d.matriculados, 0);
  const totalDes  = programasAgrupados.reduce((s, d) => s + d.desertores, 0);
  const tasaGlobal = totalMat > 0 ? ((totalDes / totalMat) * 100).toFixed(2) : "-";
  const mayorRiesgo = filteredFacultades.length > 0
    ? filteredFacultades.reduce((a, b) =>
        (a.porcentaje_desercion || 0) > (b.porcentaje_desercion || 0) ? a : b).facultad
    : "-";

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div className="content">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>
              Reporte de Deserción
            </h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
              Análisis de deserción por programa y facultad
            </p>
          </div>
          {/* Filtros */}
          <div style={{ display: "flex", gap: 10 }}>
            <select value={facultad} onChange={e => setFacultad(e.target.value)} style={selectStyle}>
              <option value="Todos">Todas las facultades</option>
              <option value="Ingeniería">Ingeniería</option>
              <option value="Ciencias Económicas">Ciencias Económicas</option>
              <option value="Ciencias Jurídicas">Ciencias Jurídicas</option>
              <option value="Filosofía">Filosofía</option>
            </select>
            <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={selectStyle}>
              <option value="Todos">Todos los periodos</option>
              <option value="2024-1">2024-1</option>
              <option value="2024-2">2024-2</option>
              <option value="2025-1">2025-1</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 20 }}>

          {/* KPIs */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <KPICard label="Total facultades"  value={filteredFacultades.length} color="#2563eb" />
            <KPICard label="Total matriculados" value={totalMat}                 color="#15803d" />
            <KPICard label="Total desertores"   value={totalDes}                 color="#dc2626" />
            <KPICard label="Tasa global"         value={`${tasaGlobal}%`}        color="#b45309" />
            <KPICard label="Mayor riesgo"        value={mayorRiesgo}             color="#7c3aed" />
          </div>

          {/* Gráfico barras + tabla programas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={card}>
              <p style={secTitle}>Tasa de deserción por programa</p>
              <Bar data={chartBarras} options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { ticks: { callback: v => `${v}%` } } },
              }} />
            </div>

            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "20px 20px 0" }}>
                <p style={secTitle}>Detalle por programa</p>
              </div>
              <div style={{ maxHeight: 380, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Programa","Facultad","Matriculados","Desertores","Tasa"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {programasAgrupados.map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f3f4f6",
                        background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{row.programa}</td>
                        <td style={{ ...tdStyle, color: "#6b7280" }}>{row.facultad}</td>
                        <td style={tdStyle}>{row.matriculados}</td>
                        <td style={{ ...tdStyle, color: "#dc2626", fontWeight: 600 }}>{row.desertores}</td>
                        <td style={{ ...tdStyle, fontWeight: 700,
                          color: parseFloat(row.tasa) > 10 ? "#dc2626" : "#15803d" }}>
                          {row.tasa}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Gráfico líneas + tabla facultades */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={card}>
              <p style={secTitle}>Evolución de deserción por periodo</p>
              <Line data={chartLineas} options={{
                responsive: true,
                plugins: { legend: { position: "bottom",
                  labels: { boxWidth: 12, font: { size: 11 } } } },
                scales: { y: { ticks: { callback: v => `${v}%` } } },
              }} />
            </div>

            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "20px 20px 0" }}>
                <p style={secTitle}>Detalle por facultad</p>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Facultad","% Deserción"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredFacultades.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6",
                      background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{row.facultad}</td>
                      <td style={{ ...tdStyle, fontWeight: 700,
                        color: (row.porcentaje_desercion || 0) > 10 ? "#dc2626" : "#15803d" }}>
                        {row.porcentaje_desercion}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
