import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API = "http://127.0.0.1:8000";

// ─── Estilos base ─────────────────────────────────────────────────────────────
const card = {
  background: "#fff", borderRadius: 12,
  border: "1px solid #e5e7eb", padding: "20px",
};
const secTitle = {
  fontSize: 12, fontWeight: 700, color: "#6b7280",
  textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px",
};
const tabStyle = (active) => ({
  padding: "8px 18px", fontSize: 13, fontWeight: active ? 600 : 500,
  borderRadius: 8, cursor: "pointer",
  border: active ? "1.5px solid #2563eb" : "1.5px solid #e5e7eb",
  background: active ? "#eff6ff" : "#fff",
  color: active ? "#2563eb" : "#6b7280",
});
const inputStyle = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb",
  fontSize: 13, outline: "none", background: "#fff",
};

// ─── Componentes pequeños ─────────────────────────────────────────────────────
function KPI({ label, value, color, sub }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || "#111827" }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function RiesgoBadge({ nivel }) {
  const m = { Alto: ["#fef2f2","#dc2626"], Medio: ["#fffbeb","#b45309"], Bajo: ["#f0fdf4","#15803d"] };
  const [bg, color] = m[nivel] || m.Bajo;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px",
      borderRadius: 20, background: bg, color }}>
      {nivel}
    </span>
  );
}

function NotaBar({ valor }) {
  const pct = (valor / 5) * 100;
  const color = valor >= 3.5 ? "#22c55e" : valor >= 3.0 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#f3f4f6", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 30 }}>{valor}</span>
    </div>
  );
}

// ─── Tab: Dashboard ───────────────────────────────────────────────────────────
function TabDashboard() {
  const [resumen, setResumen]     = useState(null);
  const [facultades, setFacultades] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/academico/resumen`),
      axios.get(`${API}/academico/rendimiento_por_facultad`),
    ]).then(([r1, r2]) => {
      setResumen(r1.data);
      setFacultades(r2.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, color: "#9ca3af", textAlign: "center" }}>Cargando...</div>;

  const chartData = {
    labels: facultades.map(f => f.facultad),
    datasets: [{
      label: "Promedio",
      data: facultades.map(f => f.promedio),
      backgroundColor: ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6"],
      borderRadius: 6,
    }],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 20 }}>
      {/* KPIs */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <KPI label="Promedio global" value={resumen?.promedio_global ?? "—"} color="#2563eb" sub="Sobre 5.0" />
        <KPI label="Estudiantes activos" value={resumen?.activos ?? "—"} color="#15803d" />
        <KPI label="Desertores" value={resumen?.desertores ?? "—"} color="#dc2626" />
        <KPI label="En riesgo" value={resumen?.en_riesgo ?? "—"} color="#b45309" sub="Promedio < 3.0" />
      </div>

      {/* Gráfico + tabla facultades */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={card}>
          <p style={secTitle}>Promedio por facultad</p>
          <Bar data={chartData} options={{
            responsive: true, plugins: { legend: { display: false } },
            scales: { y: { min: 0, max: 5 } },
          }} />
        </div>
        <div style={card}>
          <p style={secTitle}>Detalle por facultad</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                {["Facultad","Promedio","Estudiantes","Desertores"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px",
                    fontSize: 11, color: "#6b7280", fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facultades.map((f, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
                  <td style={{ padding: "8px" }}>{f.facultad}</td>
                  <td style={{ padding: "8px" }}><NotaBar valor={f.promedio} /></td>
                  <td style={{ padding: "8px", color: "#6b7280" }}>{f.estudiantes}</td>
                  <td style={{ padding: "8px", color: "#dc2626", fontWeight: 600 }}>{f.desertores}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Notas por curso ─────────────────────────────────────────────────────
function TabNotas() {
  const [notas, setNotas]     = useState([]);
  const [periodo, setPeriodo] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);

  const cargar = (p) => {
    setLoading(true);
    axios.get(`${API}/academico/notas_por_curso?periodo=${p}`)
      .then(r => setNotas(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar("Todos"); }, []);

  const filtradas = notas.filter(n =>
    n.curso.toLowerCase().includes(busqueda.toLowerCase()) ||
    n.programa.toLowerCase().includes(busqueda.toLowerCase()) ||
    n.facultad.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar curso, programa o facultad..."
          style={{ ...inputStyle, width: 280 }} />
        <select value={periodo} onChange={e => { setPeriodo(e.target.value); cargar(e.target.value); }}
          style={inputStyle}>
          <option value="Todos">Todos los periodos</option>
          <option value="2024-1">2024-1</option>
          <option value="2024-2">2024-2</option>
          <option value="2025-1">2025-1</option>
        </select>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{filtradas.length} cursos</span>
      </div>

      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ maxHeight: 520, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ position: "sticky", top: 0, background: "#f9fafb", zIndex: 1 }}>
              <tr>
                {["Curso","Programa","Facultad","Periodo","Promedio","Estudiantes","Reprobados"].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left",
                    fontSize: 11, color: "#6b7280", fontWeight: 700,
                    borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={7} style={{ padding: 30, textAlign: "center", color: "#9ca3af" }}>Cargando...</td></tr>
                : filtradas.map((n, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6",
                    background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{n.curso}</td>
                    <td style={{ padding: "10px 14px", color: "#6b7280" }}>{n.programa}</td>
                    <td style={{ padding: "10px 14px", color: "#6b7280" }}>{n.facultad}</td>
                    <td style={{ padding: "10px 14px" }}>{n.periodo}</td>
                    <td style={{ padding: "10px 14px", width: 130 }}><NotaBar valor={n.promedio} /></td>
                    <td style={{ padding: "10px 14px", color: "#374151" }}>{n.estudiantes}</td>
                    <td style={{ padding: "10px 14px", color: n.reprobados > 0 ? "#dc2626" : "#15803d",
                      fontWeight: 600 }}>{n.reprobados}</td>
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

// ─── Tab: Estudiantes en riesgo ───────────────────────────────────────────────
function TabRiesgo() {
  const [estudiantes, setEstudiantes] = useState([]);
  const [filtroRiesgo, setFiltro]     = useState("Todos");
  const [busqueda, setBusqueda]       = useState("");
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    axios.get(`${API}/academico/estudiantes_riesgo`)
      .then(r => setEstudiantes(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = estudiantes.filter(e =>
    (filtroRiesgo === "Todos" || e.nivel_riesgo === filtroRiesgo) &&
    (e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
     e.programa.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Resumen */}
      <div style={{ display: "flex", gap: 12 }}>
        {["Alto","Medio","Bajo"].map(nivel => {
          const cnt = estudiantes.filter(e => e.nivel_riesgo === nivel).length;
          const colors = { Alto: "#dc2626", Medio: "#b45309", Bajo: "#15803d" };
          return (
            <div key={nivel} style={{ ...card, flex: 1, cursor: "pointer",
              border: filtroRiesgo === nivel ? `2px solid ${colors[nivel]}` : "1px solid #e5e7eb" }}
              onClick={() => setFiltro(filtroRiesgo === nivel ? "Todos" : nivel)}>
              <div style={{ fontSize: 26, fontWeight: 800, color: colors[nivel] }}>{cnt}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Riesgo {nivel}</div>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10 }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar estudiante o programa..."
          style={{ ...inputStyle, width: 280 }} />
        <span style={{ fontSize: 12, color: "#9ca3af", alignSelf: "center" }}>
          {filtrados.length} estudiantes
        </span>
      </div>

      {/* Tabla */}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ maxHeight: 480, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ position: "sticky", top: 0, background: "#f9fafb", zIndex: 1 }}>
              <tr>
                {["ID","Nombre","Programa","Facultad","Promedio","Nivel riesgo"].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left",
                    fontSize: 11, color: "#6b7280", fontWeight: 700,
                    borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#9ca3af" }}>Cargando...</td></tr>
                : filtrados.map((e, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6",
                    background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 14px", color: "#9ca3af" }}>{e.id_estudiante}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{e.nombre}</td>
                    <td style={{ padding: "10px 14px", color: "#6b7280" }}>{e.programa}</td>
                    <td style={{ padding: "10px 14px", color: "#6b7280" }}>{e.facultad}</td>
                    <td style={{ padding: "10px 14px", width: 120 }}><NotaBar valor={e.promedio} /></td>
                    <td style={{ padding: "10px 14px" }}><RiesgoBadge nivel={e.nivel_riesgo} /></td>
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

// ─── Tab: Buscar estudiante ───────────────────────────────────────────────────
function TabEstudiante() {
  const [idBusqueda, setId] = useState("");
  const [notas, setNotas]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const buscar = () => {
    if (!idBusqueda) return;
    setLoading(true);
    setError("");
    axios.get(`${API}/academico/notas_estudiante/${idBusqueda}`)
      .then(r => {
        if (r.data.length === 0) setError("No se encontraron notas para este estudiante.");
        setNotas(r.data);
      })
      .catch(() => setError("Estudiante no encontrado."))
      .finally(() => setLoading(false));
  };

  const nombre = notas.length > 0 ? notas[0].estudiante : "";
  const promedio = notas.length > 0
    ? (notas.reduce((s, n) => s + n.valor, 0) / notas.length).toFixed(2)
    : null;

  return (
    <div style={{ marginTop: 20, maxWidth: 900 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input value={idBusqueda} onChange={e => setId(e.target.value)}
          onKeyDown={e => e.key === "Enter" && buscar()}
          placeholder="ID del estudiante..." style={{ ...inputStyle, width: 220 }} />
        <button onClick={buscar}
          style={{ padding: "8px 20px", borderRadius: 8, border: "none",
            background: "#2563eb", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          Buscar
        </button>
      </div>

      {error && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {notas.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{ ...card, flex: 1 }}>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Estudiante</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{nombre}</div>
            </div>
            <div style={{ ...card, flex: 1 }}>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Promedio general</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: promedio >= 3 ? "#15803d" : "#dc2626", marginTop: 4 }}>
                {promedio}
              </div>
            </div>
            <div style={{ ...card, flex: 1 }}>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Total notas</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{notas.length}</div>
            </div>
          </div>

          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            <div style={{ maxHeight: 440, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0, background: "#f9fafb", zIndex: 1 }}>
                  <tr>
                    {["Curso","Periodo","Corte","Nota","Estado"].map(h => (
                      <th key={h} style={{ padding: "12px 14px", textAlign: "left",
                        fontSize: 11, color: "#6b7280", fontWeight: 700,
                        borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {notas.map((n, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6",
                      background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600 }}>{n.curso}</td>
                      <td style={{ padding: "10px 14px", color: "#6b7280" }}>{n.periodo}</td>
                      <td style={{ padding: "10px 14px", color: "#6b7280" }}>{n.corte}</td>
                      <td style={{ padding: "10px 14px", width: 120 }}><NotaBar valor={n.valor} /></td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px",
                          borderRadius: 20,
                          background: n.estado === "Activa" ? "#dcfce7" : n.estado === "Desertor" ? "#fee2e2" : "#f3f4f6",
                          color: n.estado === "Activa" ? "#15803d" : n.estado === "Desertor" ? "#dc2626" : "#6b7280" }}>
                          {n.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab: ETL Cargar notas ────────────────────────────────────────────────────
function TabETL() {
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [resultado, setResultado] = useState(null);
  const [etapas, setEtapas]     = useState([]);
  const fileRef = useRef();

  const pasos = [
    { id: 1, label: "Extracción", desc: "Lectura del archivo CSV", icon: "📂" },
    { id: 2, label: "Validación", desc: "Verificar notas, cortes y matrículas", icon: "🔍" },
    { id: 3, label: "Transformación", desc: "Normalizar y preparar registros", icon: "⚙️" },
    { id: 4, label: "Carga", desc: "Insertar en base de datos", icon: "💾" },
  ];

  const cargar = async () => {
    if (!file) return;
    setLoading(true);
    setResultado(null);
    setEtapas([1]);

    await new Promise(r => setTimeout(r, 600));
    setEtapas([1, 2]);
    await new Promise(r => setTimeout(r, 700));
    setEtapas([1, 2, 3]);
    await new Promise(r => setTimeout(r, 500));

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/academico/cargar_notas`, formData,
        { headers: { "Content-Type": "multipart/form-data" } });
      setEtapas([1, 2, 3, 4]);
      setResultado(res.data);
    } catch (e) {
      setResultado({ error: "Error al conectar con el servidor." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 20, maxWidth: 700 }}>
      <div style={card}>
        <p style={secTitle}>Pipeline ETL — Carga de notas</p>

        {/* Visualización del pipeline */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
          {pasos.map((paso, i) => {
            const activo  = etapas.includes(paso.id);
            const actual  = loading && etapas[etapas.length - 1] === paso.id;
            return (
              <React.Fragment key={paso.id}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", margin: "0 auto 8px",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                    background: activo ? "#eff6ff" : "#f9fafb",
                    border: activo ? "2px solid #2563eb" : "2px solid #e5e7eb",
                    transition: "all 0.4s",
                    boxShadow: actual ? "0 0 0 4px #bfdbfe" : "none" }}>
                    {paso.icon}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700,
                    color: activo ? "#2563eb" : "#9ca3af" }}>{paso.label}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{paso.desc}</div>
                </div>
                {i < pasos.length - 1 && (
                  <div style={{ width: 40, height: 2, flexShrink: 0,
                    background: etapas.includes(paso.id + 1) ? "#2563eb" : "#e5e7eb",
                    transition: "background 0.4s", marginBottom: 28 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Carga de archivo */}
        <div style={{ background: "#f9fafb", border: "2px dashed #d1d5db", borderRadius: 10,
          padding: 24, textAlign: "center", cursor: "pointer", marginBottom: 16 }}
          onClick={() => fileRef.current.click()}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
            {file ? file.name : "Haz clic para seleccionar el CSV de notas"}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            Formato: id_matricula, valor, corte
          </div>
          <input ref={fileRef} type="file" accept=".csv"
            style={{ display: "none" }} onChange={e => { setFile(e.target.files[0]); setEtapas([]); setResultado(null); }} />
        </div>

        {/* Formato esperado */}
        <div style={{ background: "#eff6ff", borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", marginBottom: 4 }}>
            Formato esperado
          </div>
          <code style={{ fontSize: 11, color: "#374151", fontFamily: "monospace", display: "block" }}>
            id_matricula,valor,corte<br />
            100,4.5,Corte 1<br />
            101,3.2,Corte 2<br />
            102,2.8,Corte 3
          </code>
        </div>

        <button onClick={cargar} disabled={!file || loading}
          style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none",
            background: file && !loading ? "#2563eb" : "#93c5fd",
            color: "#fff", fontWeight: 600, fontSize: 14,
            cursor: file && !loading ? "pointer" : "not-allowed" }}>
          {loading ? "Procesando ETL..." : "Ejecutar ETL"}
        </button>

        {/* Resultado */}
        {resultado && !resultado.error && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, background: "#f0fdf4", borderRadius: 8, padding: "12px 16px",
                border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#15803d" }}>{resultado.insertados}</div>
                <div style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>Notas cargadas</div>
              </div>
              <div style={{ flex: 1, background: "#fffbeb", borderRadius: 8, padding: "12px 16px",
                border: "1px solid #fde68a" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#b45309" }}>{resultado.omitidos}</div>
                <div style={{ fontSize: 12, color: "#b45309", fontWeight: 600 }}>Ya existían</div>
              </div>
              <div style={{ flex: 1, background: "#fef2f2", borderRadius: 8, padding: "12px 16px",
                border: "1px solid #fecaca" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#dc2626" }}>{resultado.errores?.length ?? 0}</div>
                <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>Errores</div>
              </div>
            </div>
            {resultado.errores?.length > 0 && (
              <div style={{ background: "#fef2f2", borderRadius: 8, padding: 12,
                border: "1px solid #fecaca", maxHeight: 160, overflowY: "auto" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>
                  Errores detectados:
                </div>
                {resultado.errores.map((e, i) => (
                  <div key={i} style={{ fontSize: 11, color: "#7f1d1d", marginBottom: 4 }}>
                    Fila {e.fila}: {e.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {resultado?.error && (
          <div style={{ marginTop: 16, padding: 12, background: "#fef2f2",
            borderRadius: 8, color: "#dc2626", fontSize: 13 }}>
            {resultado.error}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
const TABS = ["Dashboard","Notas por curso","Riesgo académico","Buscar estudiante","Cargar notas (ETL)"];

export default function Academico() {
  const [activeTab, setActiveTab] = useState("Dashboard");

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div className="content">
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>
            Módulo Académico
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
            Rendimiento, riesgo académico y carga de notas con ETL
          </p>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 20, flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t} style={tabStyle(activeTab === t)} onClick={() => setActiveTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {activeTab === "Dashboard"          && <TabDashboard />}
        {activeTab === "Notas por curso"    && <TabNotas />}
        {activeTab === "Riesgo académico"   && <TabRiesgo />}
        {activeTab === "Buscar estudiante"  && <TabEstudiante />}
        {activeTab === "Cargar notas (ETL)" && <TabETL />}
      </div>
    </div>
  );
}
