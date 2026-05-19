import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API = "http://127.0.0.1:8000";

// ─── Estilos ──────────────────────────────────────────────────────────────────
const card = {
  background: "#fff", borderRadius: 12,
  border: "1px solid #e5e7eb", padding: "20px",
};
const secTitle = {
  fontSize: 12, fontWeight: 700, color: "#6b7280",
  textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px",
};
const tabStyle = (active) => ({
  padding: "8px 20px", fontSize: 13, fontWeight: active ? 600 : 500,
  borderRadius: 8, cursor: "pointer",
  border: active ? "1.5px solid #2563eb" : "1.5px solid #e5e7eb",
  background: active ? "#eff6ff" : "#fff",
  color: active ? "#2563eb" : "#6b7280",
});
const inputStyle = {
  padding: "8px 12px", borderRadius: 8,
  border: "1px solid #e5e7eb", fontSize: 13, outline: "none",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const nivelColor = {
  Alto:  { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  Medio: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  Bajo:  { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
};

function NivelBadge({ nivel }) {
  const c = nivelColor[nivel] || nivelColor.Bajo;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px",
      borderRadius: 20, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {nivel}
    </span>
  );
}

function ProbBar({ prob, nivel }) {
  const color = nivel === "Alto" ? "#ef4444" : nivel === "Medio" ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#f3f4f6", overflow: "hidden" }}>
        <div style={{ width: `${prob}%`, height: "100%", background: color, borderRadius: 3,
          transition: "width 0.5s" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36 }}>{prob}%</span>
    </div>
  );
}

function Iniciales({ nombre }) {
  const partes = nombre?.split(" ") || [];
  const ini = ((partes[0]?.[0] || "") + (partes[1]?.[0] || "")).toUpperCase();
  return (
    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#eff6ff",
      color: "#2563eb", fontWeight: 700, fontSize: 14, display: "flex",
      alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {ini}
    </div>
  );
}

// ─── Panel detalle estudiante ─────────────────────────────────────────────────
function PanelEstudiante({ estudiante, onCerrar }) {
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!estudiante) return;
    setLoading(true);
    axios.get(`${API}/predicciones/estudiante/${estudiante.id_estudiante}`)
      .then(r => setDetalle(r.data))
      .finally(() => setLoading(false));
  }, [estudiante]);

  if (!estudiante) return (
    <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: 300, color: "#9ca3af", fontSize: 13 }}>
      Selecciona un estudiante para ver el detalle
    </div>
  );

  if (loading) return (
    <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: 300, color: "#9ca3af" }}>Cargando...</div>
  );

  const c = nivelColor[detalle?.nivel_riesgo] || nivelColor.Bajo;

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header estudiante */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <Iniciales nombre={detalle?.nombre} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{detalle?.nombre}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{detalle?.programa}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{detalle?.num_periodos} periodo(s) cursado(s)</div>
        </div>
        <NivelBadge nivel={detalle?.nivel_riesgo} />
      </div>

      {/* Probabilidad */}
      <div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Probabilidad de deserción</div>
        <ProbBar prob={detalle?.probabilidad} nivel={detalle?.nivel_riesgo} />
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          ["Promedio actual", detalle?.promedio_general?.toFixed(2), detalle?.promedio_general >= 3 ? "#15803d" : "#dc2626"],
          ["Materias desertadas", detalle?.materias_desercion, "#b45309"],
          ["Tasa reprobación", `${Math.round((detalle?.prop_reprobadas || 0) * 100)}%`,
            detalle?.prop_reprobadas > 0.3 ? "#dc2626" : "#15803d"],
          ["Notas registradas", detalle?.num_notas, "#2563eb"],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 2 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Factores de riesgo */}
      {detalle?.factores?.length > 0 && (
        <div>
          <p style={secTitle}>Factores de riesgo detectados</p>
          {detalle.factores.map((f, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%",
                  background: f.intensidad > 0.6 ? "#ef4444" : "#f59e0b", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#374151" }}>{f.factor}</span>
              </div>
              <div style={{ marginLeft: 16, height: 6, borderRadius: 3,
                background: "#f3f4f6", overflow: "hidden" }}>
                <div style={{ width: `${Math.round(f.intensidad * 100)}%`, height: "100%",
                  background: f.intensidad > 0.6 ? "#ef4444" : "#f59e0b", borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alerta */}
      {detalle?.nivel_riesgo === "Alto" && (
        <button style={{ width: "100%", padding: "10px", borderRadius: 8,
          border: "1px solid #fecaca", background: "#fef2f2",
          color: "#dc2626", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          Generar alerta ↗
        </button>
      )}
    </div>
  );
}

// ─── Tab Deserción ────────────────────────────────────────────────────────────
function TabDesercion({ periodo, resumen, loading }) {
  const [seleccionado, setSeleccionado]   = useState(null);
  const [filtroPrograma, setFiltroPrograma] = useState("Todos los programas");
  const [filtroNivel, setFiltroNivel]     = useState("Alto");

  const programas = ["Todos los programas",
    ...new Set((resumen?.estudiantes || []).map(e => e.programa))];

  const estudiantes = (resumen?.estudiantes || []).filter(e =>
    (filtroNivel === "Todos" || e.nivel_riesgo === filtroNivel) &&
    (filtroPrograma === "Todos los programas" || e.programa === filtroPrograma)
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginTop: 20 }}>
      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* KPIs */}
        <div style={{ display: "flex", gap: 12 }}>
          {[
            ["Riesgo alto",  resumen?.alto,  resumen?.pct_alto,  "#dc2626", "#fef2f2", "#fecaca"],
            ["Riesgo medio", resumen?.medio, resumen?.pct_medio, "#b45309", "#fffbeb", "#fde68a"],
            ["Riesgo bajo",  resumen?.bajo,  resumen?.pct_bajo,  "#15803d", "#f0fdf4", "#bbf7d0"],
          ].map(([label, val, pct, color, bg, border]) => (
            <div key={label} style={{ flex: 1, background: bg, borderRadius: 12,
              border: `1px solid ${border}`, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color }}>{loading ? "…" : val}</div>
              <div style={{ fontSize: 11, color }}>estudiantes · {pct}%</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
            Estudiantes en riesgo
          </span>
          <select value={filtroPrograma} onChange={e => setFiltroPrograma(e.target.value)}
            style={{ ...inputStyle, marginLeft: "auto" }}>
            {programas.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)}
            style={inputStyle}>
            <option value="Todos">Todos</option>
            <option value="Alto">Alto</option>
            <option value="Medio">Medio</option>
            <option value="Bajo">Bajo</option>
          </select>
        </div>

        {/* Tabla */}
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead style={{ position: "sticky", top: 0, background: "#f9fafb", zIndex: 1 }}>
                <tr>
                  {["Estudiante","Programa","Periodo","Prob.","Nivel"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left",
                      fontSize: 11, color: "#6b7280", fontWeight: 700,
                      borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? <tr><td colSpan={5} style={{ padding: 30, textAlign: "center", color: "#9ca3af" }}>
                      Cargando predicciones...
                    </td></tr>
                  : estudiantes.slice(0, 60).map((e, i) => (
                    <tr key={i}
                      onClick={() => setSeleccionado(e)}
                      style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer",
                        background: seleccionado?.id_estudiante === e.id_estudiante
                          ? "#eff6ff" : i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#2563eb" }}>{e.nombre}</div>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#6b7280", fontSize: 12 }}>
                        {e.programa}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#6b7280" }}>{e.periodo}</td>
                      <td style={{ padding: "10px 14px", width: 120 }}>
                        <ProbBar prob={e.probabilidad} nivel={e.nivel_riesgo} />
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <NivelBadge nivel={e.nivel_riesgo} />
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Panel detalle */}
      <PanelEstudiante estudiante={seleccionado} />
    </div>
  );
}

// ─── Tab Rendimiento ──────────────────────────────────────────────────────────
function TabRendimiento() {
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    axios.get(`${API}/predicciones/por_programa`)
      .then(r => setProgramas(r.data))
      .finally(() => setLoading(false));
  }, []);

  const chartData = {
    labels: programas.slice(0, 12).map(p => p.programa),
    datasets: [{
      label: "Riesgo promedio (%)",
      data: programas.slice(0, 12).map(p => p.promedio_riesgo),
      backgroundColor: programas.slice(0, 12).map(p =>
        p.promedio_riesgo >= 60 ? "#ef4444" :
        p.promedio_riesgo >= 35 ? "#f59e0b" : "#22c55e"),
      borderRadius: 6,
    }],
  };

  return (
    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={card}>
          <p style={secTitle}>Riesgo de deserción por programa</p>
          {loading
            ? <div style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>Cargando...</div>
            : <Bar data={chartData} options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { min: 0, max: 100,
                  ticks: { callback: v => `${v}%` } } },
              }} />
          }
        </div>

        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 20px 0" }}>
            <p style={secTitle}>Detalle por programa</p>
          </div>
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead style={{ position: "sticky", top: 0, background: "#f9fafb", zIndex: 1 }}>
                <tr>
                  {["Programa","Facultad","Estudiantes","Riesgo alto","Riesgo prom."].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left",
                      fontSize: 11, color: "#6b7280", fontWeight: 700,
                      borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {programas.map((p, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6",
                    background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{p.programa}</td>
                    <td style={{ padding: "10px 14px", color: "#6b7280", fontSize: 12 }}>{p.facultad}</td>
                    <td style={{ padding: "10px 14px", color: "#374151" }}>{p.total_estudiantes}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontWeight: 700,
                        color: p.en_riesgo_alto > 0 ? "#dc2626" : "#15803d" }}>
                        {p.en_riesgo_alto}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", width: 130 }}>
                      <ProbBar prob={p.promedio_riesgo}
                        nivel={p.promedio_riesgo >= 60 ? "Alto" : p.promedio_riesgo >= 35 ? "Medio" : "Bajo"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Matrícula ────────────────────────────────────────────────────────────
function TabMatricula({ resumen, loading }) {
  const estudiantes = resumen?.estudiantes || [];
  const [busqueda, setBusqueda] = useState("");

  const filtrados = estudiantes.filter(e =>
    e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.programa.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Agrupar por periodo
  const periodos = [...new Set(estudiantes.map(e => e.periodo))].sort();
  const porPeriodo = periodos.map(per => ({
    periodo: per,
    total: estudiantes.filter(e => e.periodo === per).length,
    alto:  estudiantes.filter(e => e.periodo === per && e.nivel_riesgo === "Alto").length,
    medio: estudiantes.filter(e => e.periodo === per && e.nivel_riesgo === "Medio").length,
    bajo:  estudiantes.filter(e => e.periodo === per && e.nivel_riesgo === "Bajo").length,
  }));

  return (
    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Resumen por periodo */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {porPeriodo.map(p => (
          <div key={p.periodo} style={{ ...card, flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>
              {p.periodo}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
              {p.total} matrículas analizadas
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626",
                background: "#fef2f2", padding: "2px 8px", borderRadius: 12 }}>
                {p.alto} alto
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309",
                background: "#fffbeb", padding: "2px 8px", borderRadius: 12 }}>
                {p.medio} medio
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d",
                background: "#f0fdf4", padding: "2px 8px", borderRadius: 12 }}>
                {p.bajo} bajo
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla completa */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ ...secTitle, margin: 0 }}>Todos los estudiantes analizados</p>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar..." style={{ ...inputStyle, width: 220 }} />
        </div>
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ position: "sticky", top: 0, background: "#f9fafb", zIndex: 1 }}>
              <tr>
                {["Estudiante","Programa","Facultad","Periodo","Probabilidad","Nivel"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left",
                    fontSize: 11, color: "#6b7280", fontWeight: 700,
                    borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#9ca3af" }}>
                    Cargando...
                  </td></tr>
                : filtrados.map((e, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6",
                    background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{e.nombre}</td>
                    <td style={{ padding: "10px 14px", color: "#6b7280", fontSize: 12 }}>{e.programa}</td>
                    <td style={{ padding: "10px 14px", color: "#6b7280", fontSize: 12 }}>{e.facultad}</td>
                    <td style={{ padding: "10px 14px", color: "#6b7280" }}>{e.periodo}</td>
                    <td style={{ padding: "10px 14px", width: 120 }}>
                      <ProbBar prob={e.probabilidad} nivel={e.nivel_riesgo} />
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <NivelBadge nivel={e.nivel_riesgo} />
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Predicciones() {
  const [activeTab, setActiveTab] = useState("Deserción");
  const [periodo, setPeriodo]     = useState("Todos");
  const [resumen, setResumen]     = useState(null);
  const [loading, setLoading]     = useState(true);

  const cargar = (p) => {
    setLoading(true);
    axios.get(`${API}/predicciones/resumen?periodo=${p}`)
      .then(r => setResumen(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar("Todos"); }, []);

  const exportar = () => {
    if (!resumen) return;
    const rows = [
      ["Nombre","Programa","Facultad","Periodo","Probabilidad","Nivel"],
      ...(resumen.estudiantes || []).map(e =>
        [e.nombre, e.programa, e.facultad, e.periodo, `${e.probabilidad}%`, e.nivel_riesgo]
      )
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `predicciones_${periodo}.csv`;
    a.click();
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div className="content">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>
              Predicciones — Riesgo estudiantil
            </h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
              Modelo actualizado: hoy · Precisión del modelo:{" "}
              <strong>{resumen?.precision_modelo ?? "—"}%</strong>
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <select value={periodo}
              onChange={e => { setPeriodo(e.target.value); cargar(e.target.value); }}
              style={{ ...inputStyle, fontWeight: 600 }}>
              <option value="Todos">Todos</option>
              <option value="2024-1">2024-1</option>
              <option value="2024-2">2024-2</option>
              <option value="2025-1">2025-1</option>
            </select>
            <button onClick={exportar}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb",
                background: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
              ↗ Exportar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginTop: 20 }}>
          {["Deserción","Rendimiento","Matrícula"].map(t => (
            <button key={t} style={tabStyle(activeTab === t)} onClick={() => setActiveTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {activeTab === "Deserción"    && <TabDesercion periodo={periodo} resumen={resumen} loading={loading} />}
        {activeTab === "Rendimiento"  && <TabRendimiento />}
        {activeTab === "Matrícula"    && <TabMatricula resumen={resumen} loading={loading} />}
      </div>
    </div>
  );
}
