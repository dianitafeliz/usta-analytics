import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

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

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, subColor, icon, color, bg }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 160, display: "flex",
      flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>{label}</div>
        <div style={{ fontSize: 20, background: bg || "#f3f4f6",
          borderRadius: 8, width: 36, height: 36, display: "flex",
          alignItems: "center", justifyContent: "center" }}>{icon}</div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: color || "#111827",
        lineHeight: 1 }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 12, color: subColor || "#6b7280",
          fontWeight: 500 }}>{sub}</div>
      )}
    </div>
  );
}

// ─── Barra de riesgo por facultad ─────────────────────────────────────────────
function RiesgoBar({ facultad, tasa, desertores, total }) {
  const color = tasa >= 15 ? "#ef4444" : tasa >= 8 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        marginBottom: 5, fontSize: 13 }}>
        <span style={{ fontWeight: 600, color: "#374151" }}>{facultad}</span>
        <span style={{ fontWeight: 700, color }}>{tasa}%</span>
      </div>
      <div style={{ height: 10, borderRadius: 5, background: "#f3f4f6", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(tasa * 3, 100)}%`, height: "100%",
          background: color, borderRadius: 5, transition: "width 0.6s" }} />
      </div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
        {desertores} desertores de {total} matrículas
      </div>
    </div>
  );
}

// ─── Badge nivel riesgo ───────────────────────────────────────────────────────
function NivelBadge({ nivel }) {
  const m = {
    Alto:  ["#fef2f2","#dc2626"],
    Medio: ["#fffbeb","#b45309"],
    Bajo:  ["#f0fdf4","#15803d"],
  };
  const [bg, color] = m[nivel] || m.Bajo;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px",
      borderRadius: 20, background: bg, color }}>{nivel}</span>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("Todos");

  const cargar = (p) => {
    setLoading(true);
    axios.get(`${API}/dashboard/resumen?periodo=${p}`)
      .then(r => setData(r.data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar("Todos"); }, []);

  const kpis          = data?.kpis          || {};
  const porFacultad   = data?.por_facultad  || [];
  const porPeriodo    = data?.por_periodo   || [];
  const distNotas     = data?.dist_notas    || {};
  const encuesta      = data?.ultima_encuesta;
  const enRiesgo      = data?.en_riesgo     || [];
  const promFacultad  = data?.promedio_facultad || [];

  // Gráfico barras apiladas — matrículas por periodo
  const chartPeriodo = {
    labels: porPeriodo.map(p => p.periodo),
    datasets: [
      { label: "Activas",     data: porPeriodo.map(p => p.activas),
        backgroundColor: "#3b82f6", borderRadius: 4 },
      { label: "Finalizadas", data: porPeriodo.map(p => p.finalizadas),
        backgroundColor: "#22c55e", borderRadius: 4 },
      { label: "Desertores",  data: porPeriodo.map(p => p.desertores),
        backgroundColor: "#ef4444", borderRadius: 4 },
    ],
  };

  // Gráfico dona — distribución de notas
  const chartNotas = {
    labels: ["Excelente (≥4.5)","Bueno (3.5-4.5)","Aceptable (3-3.5)","Reprobado (<3)"],
    datasets: [{
      data: [distNotas.excelente, distNotas.bueno, distNotas.aceptable, distNotas.reprobado],
      backgroundColor: ["#22c55e","#3b82f6","#f59e0b","#ef4444"],
      borderWidth: 0,
    }],
  };

  // Gráfico líneas — promedio por facultad
  const chartPromedios = {
    labels: promFacultad.map(f => f.facultad),
    datasets: [{
      label: "Promedio",
      data: promFacultad.map(f => f.promedio),
      borderColor: "#2563eb",
      backgroundColor: "rgba(37,99,235,0.08)",
      pointBackgroundColor: "#2563eb",
      pointRadius: 5,
      tension: 0.4,
      fill: true,
    }],
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div className="content">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>
              Dashboard principal
            </h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
              Panorama general de la institución · Actualizado hoy
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <select value={periodo}
              onChange={e => { setPeriodo(e.target.value); cargar(e.target.value); }}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb",
                fontSize: 13, outline: "none", fontWeight: 600 }}>
              <option value="Todos">Todos los periodos</option>
              <option value="2024-1">2024-1</option>
              <option value="2024-2">2024-2</option>
              <option value="2025-1">2025-1</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: "#9ca3af", fontSize: 14 }}>
            Cargando datos...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 20 }}>

            {/* Fila 1: KPIs */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <KPICard
                label="Estudiantes activos"
                value={kpis.total_estudiantes ?? "—"}
                sub={`${kpis.activas ?? 0} matrículas activas`}
                icon="👥" bg="#eff6ff" color="#1d4ed8"
              />
              <KPICard
                label="Tasa de deserción"
                value={`${kpis.tasa_desercion ?? 0}%`}
                sub={`${kpis.desertores ?? 0} desertores`}
                subColor="#dc2626" icon="📉" bg="#fef2f2" color="#dc2626"
              />
              <KPICard
                label="Promedio académico"
                value={kpis.promedio ?? "—"}
                sub="Sobre 5.0 · Estable"
                subColor="#15803d" icon="📊" bg="#f0fdf4" color="#15803d"
              />
              <KPICard
                label="Matrículas totales"
                value={kpis.total_matriculas ?? "—"}
                sub={`${kpis.finalizadas ?? 0} finalizadas`}
                icon="🎓" bg="#fffbeb" color="#b45309"
              />
            </div>

            {/* Fila 2: Deserción por facultad + Estudiantes en riesgo */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={card}>
                <p style={secTitle}>Deserción por facultad</p>
                {porFacultad.map((f, i) => (
                  <RiesgoBar key={i} facultad={f.facultad}
                    tasa={f.tasa} desertores={f.desertores} total={f.total} />
                ))}
              </div>

              <div style={card}>
                <p style={secTitle}>Estudiantes en riesgo alto</p>
                {enRiesgo.length === 0
                  ? <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 20 }}>
                      No hay datos de predicción disponibles
                    </div>
                  : enRiesgo.map((e, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center",
                      padding: "10px 0", borderBottom: i < enRiesgo.length - 1
                        ? "1px solid #f3f4f6" : "none", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%",
                        background: "#fef2f2", color: "#dc2626", fontWeight: 700,
                        fontSize: 12, display: "flex", alignItems: "center",
                        justifyContent: "center", flexShrink: 0 }}>
                        {e.nombre.split(" ").map(n => n[0]).slice(0,2).join("")}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                          {e.nombre}
                        </div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>
                          {e.facultad}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626",
                        marginRight: 8 }}>{e.probabilidad}%</div>
                      <NivelBadge nivel={e.nivel_riesgo} />
                    </div>
                  ))
                }
                {enRiesgo.length > 0 && (
                  <button style={{ width: "100%", marginTop: 14, padding: "9px",
                    borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb",
                    fontSize: 13, cursor: "pointer", color: "#374151", fontWeight: 600 }}
                    onClick={() => window.location.href = "/predicciones"}>
                    Ver todos los casos ↗
                  </button>
                )}
              </div>
            </div>

            {/* Fila 3: Matrículas por periodo + Distribución notas */}
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
              <div style={card}>
                <p style={secTitle}>Tendencia de matrículas por periodo</p>
                <Bar data={chartPeriodo} options={{
                  responsive: true,
                  plugins: { legend: { position: "bottom",
                    labels: { boxWidth: 12, font: { size: 11 } } } },
                  scales: { x: { stacked: true }, y: { stacked: true } },
                }} />
              </div>

              <div style={card}>
                <p style={secTitle}>Distribución de notas</p>
                <Doughnut data={chartNotas} options={{
                  responsive: true,
                  cutout: "65%",
                  plugins: { legend: { position: "bottom",
                    labels: { boxWidth: 12, font: { size: 11 } } } },
                }} />
                <div style={{ display: "flex", justifyContent: "center",
                  gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                  {[
                    ["#22c55e", distNotas.excelente, "Exc."],
                    ["#3b82f6", distNotas.bueno,     "Bien"],
                    ["#f59e0b", distNotas.aceptable, "Acep."],
                    ["#ef4444", distNotas.reprobado, "Rep."],
                  ].map(([color, val, label]) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color }}>{val}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fila 4: Promedio por facultad + Última encuesta */}
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
              <div style={card}>
                <p style={secTitle}>Promedio académico por facultad</p>
                <Line data={chartPromedios} options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { y: { min: 0, max: 5,
                    ticks: { callback: v => `${v}.0` } } },
                }} />
              </div>

              <div style={card}>
                <p style={secTitle}>Última encuesta — NLP</p>
                {encuesta ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827",
                      marginBottom: 14 }}>{encuesta.nombre}</div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                      {[
                        [encuesta.pct_positivo, "Positivo", "#22c55e", "#f0fdf4"],
                        [encuesta.pct_neutro,   "Neutro",   "#f59e0b", "#fffbeb"],
                        [encuesta.pct_negativo, "Negativo", "#ef4444", "#fef2f2"],
                      ].map(([pct, label, color, bg]) => (
                        <div key={label} style={{ flex: 1, background: bg,
                          borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color }}>{pct}%</div>
                          <div style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ height: 10, borderRadius: 5, overflow: "hidden",
                      display: "flex", gap: 2, marginBottom: 12 }}>
                      <div style={{ width: `${encuesta.pct_positivo}%`, background: "#22c55e" }} />
                      <div style={{ width: `${encuesta.pct_neutro}%`,   background: "#f59e0b" }} />
                      <div style={{ width: `${encuesta.pct_negativo}%`, background: "#ef4444" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 14 }}>
                      {encuesta.total} respuestas · Análisis NLP automático
                    </div>
                    <button style={{ width: "100%", padding: "9px", borderRadius: 8,
                      border: "1px solid #e5e7eb", background: "#f9fafb",
                      fontSize: 13, cursor: "pointer", color: "#374151", fontWeight: 600 }}
                      onClick={() => window.location.href = "/encuestas"}>
                      Ver encuesta completa ↗
                    </button>
                  </>
                ) : (
                  <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 30 }}>
                    No hay encuestas con análisis NLP
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
