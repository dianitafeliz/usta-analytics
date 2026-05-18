import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";

// ─── Estilos ──────────────────────────────────────────────────────────────────
const S = {
  card: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: "20px",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
    margin: "0 0 14px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  tab: (active) => ({
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    borderRadius: 8,
    border: active ? "1.5px solid #2563eb" : "1.5px solid #e5e7eb",
    background: active ? "#eff6ff" : "#fff",
    color: active ? "#2563eb" : "#6b7280",
    cursor: "pointer",
  }),
  grid: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: 20,
    marginTop: 20,
  },
};

const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "#374151", marginBottom: 6, marginTop: 14,
};
const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid #e5e7eb", fontSize: 13, outline: "none",
  boxSizing: "border-box",
};

// ─── Badge ────────────────────────────────────────────────────────────────────
const badgeColors = {
  Activa:   { bg: "#dcfce7", color: "#15803d" },
  Cerrada:  { bg: "#fee2e2", color: "#dc2626" },
  Borrador: { bg: "#f3f4f6", color: "#6b7280" },
};
function Badge({ estado }) {
  const b = badgeColors[estado] || badgeColors.Borrador;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px",
      borderRadius: 20, background: b.bg, color: b.color }}>
      {estado}
    </span>
  );
}

// ─── Barra de sentimiento global ──────────────────────────────────────────────
function SentimientoBar({ positivo, neutro, negativo }) {
  return (
    <div>
      <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", gap: 2 }}>
        <div style={{ width: `${positivo}%`, background: "#22c55e" }} />
        <div style={{ width: `${neutro}%`, background: "#f59e0b" }} />
        <div style={{ width: `${negativo}%`, background: "#ef4444" }} />
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
        {[["#22c55e","Positivo",positivo],["#f59e0b","Neutro",neutro],["#ef4444","Negativo",negativo]].map(([c,l,v]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#374151" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />
            {v}% {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Barra por pregunta ───────────────────────────────────────────────────────
function PreguntaBar({ texto, positivo, neutro, negativo }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>{texto}</div>
      <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 1 }}>
        <div style={{ width: `${positivo}%`, background: "#22c55e" }} />
        <div style={{ width: `${neutro}%`, background: "#f59e0b" }} />
        <div style={{ width: `${negativo}%`, background: "#ef4444" }} />
      </div>
    </div>
  );
}

// ─── Comentario NLP ───────────────────────────────────────────────────────────
const sentColors = {
  Positivo: { border: "#22c55e", bg: "#f0fdf4", label: "#15803d" },
  Negativo: { border: "#ef4444", bg: "#fef2f2", label: "#dc2626" },
  Neutro:   { border: "#f59e0b", bg: "#fffbeb", label: "#b45309" },
};
function Comentario({ sentimiento, confianza, texto }) {
  const c = sentColors[sentimiento] || sentColors.Neutro;
  return (
    <div style={{ borderLeft: `3px solid ${c.border}`, background: c.bg,
      borderRadius: "0 8px 8px 0", padding: "10px 14px", marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: c.label, marginBottom: 4 }}>
        {sentimiento} · confianza {confianza}%
      </div>
      <div style={{ fontSize: 13, color: "#374151", fontStyle: "italic" }}>"{texto}"</div>
    </div>
  );
}

// ─── Modal cargar CSV ─────────────────────────────────────────────────────────
function ModalCargarCSV({ encuestaId, onClose, onCargado }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const cargar = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      await axios.post(
        `http://127.0.0.1:8000/encuestas/${encuestaId}/cargar_respuestas`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      onCargado();
      onClose();
    } catch {
      setError("Error al cargar el archivo. Verifica el formato.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: 440,
        padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Cargar respuestas</h3>
          <button onClick={onClose} style={{ background: "none", border: "none",
            fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>×</button>
        </div>

        <div style={{ background: "#f9fafb", border: "2px dashed #d1d5db", borderRadius: 10,
          padding: 28, textAlign: "center", marginBottom: 16, cursor: "pointer" }}
          onClick={() => fileRef.current.click()}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
            {file ? file.name : "Haz clic o arrastra un archivo CSV"}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            Formato: id_pregunta, respuesta_texto, id_estudiante
          </div>
          <input ref={fileRef} type="file" accept=".csv"
            style={{ display: "none" }} onChange={e => setFile(e.target.files[0])} />
        </div>

        {error && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 12 }}>{error}</div>}

        <div style={{ background: "#eff6ff", borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", marginBottom: 4 }}>
            Formato esperado del CSV
          </div>
          <code style={{ fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
            id_pregunta,respuesta_texto,id_estudiante<br />
            1,"La calidad docente es excelente",101
          </code>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 8,
            border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 13 }}>
            Cancelar
          </button>
          <button onClick={cargar} disabled={!file || loading}
            style={{ padding: "9px 20px", borderRadius: 8, border: "none",
              background: file ? "#2563eb" : "#93c5fd", color: "#fff",
              cursor: file ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600 }}>
            {loading ? "Procesando..." : "Cargar y analizar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Datos mock (fallback si el backend no responde) ──────────────────────────
const mockEncuestas = [
  { id_encuesta: 1, nombre: "Percepción académica 2024-2", estado: "Cerrada", respuestas: 342, fecha: "Oct 2024" },
  { id_encuesta: 2, nombre: "Clima universitario 2024-2",  estado: "Activa",  respuestas: 198, fecha: "Nov 2024" },
  { id_encuesta: 3, nombre: "Satisfacción docente 2024-1", estado: "Cerrada", respuestas: 520, fecha: "May 2024" },
];
const mockDetalle = {
  total_respuestas: 342, total_preguntas: 8,
  sentimiento_global: { positivo: 64, neutro: 22, negativo: 14 },
  por_pregunta: [
    { texto: "¿Cómo valoras la calidad docente?",          positivo: 72, neutro: 18, negativo: 10 },
    { texto: "¿Cómo valoras los recursos de aprendizaje?", positivo: 55, neutro: 30, negativo: 15 },
    { texto: "¿Te sientes apoyado en dificultades?",       positivo: 40, neutro: 25, negativo: 35 },
  ],
  comentarios: [
    { sentimiento: "Positivo", confianza: 94, texto: "Los profesores explican muy bien y siempre están dispuestos a ayudar." },
    { sentimiento: "Positivo", confianza: 88, texto: "El ambiente en clase es muy motivador." },
    { sentimiento: "Negativo", confianza: 91, texto: "No hay suficiente apoyo cuando tenemos dificultades." },
    { sentimiento: "Neutro",   confianza: 76, texto: "Los recursos están bien pero podrían mejorar." },
  ],
};

// ─── Pestaña Resultados ───────────────────────────────────────────────────────
function TabResultados() {
  const [encuestas, setEncuestas]           = useState([]);
  const [seleccionada, setSeleccionada]     = useState(null);
  const [detalle, setDetalle]               = useState(null);
  const [filtroSentimiento, setFiltro]      = useState("Todos");
  const [modalCSV, setModalCSV]             = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/encuestas")
      .then(r => {
        setEncuestas(r.data);
        if (r.data.length > 0) cargarDetalle(r.data[0]);
      })
      .catch(() => {
        setEncuestas(mockEncuestas);
        cargarDetalle(mockEncuestas[0], true);
      });
  }, []);

  const cargarDetalle = (enc, useMock = false) => {
    setSeleccionada(enc);
    setLoadingDetalle(true);
    if (useMock) { setDetalle(mockDetalle); setLoadingDetalle(false); return; }
    axios.get(`http://127.0.0.1:8000/encuestas/${enc.id_encuesta}/resultados`)
      .then(r => setDetalle(r.data))
      .catch(() => setDetalle(mockDetalle))
      .finally(() => setLoadingDetalle(false));
  };

  const exportar = () => {
    if (!detalle) return;
    const rows = [["Sentimiento","Confianza","Texto"],
      ...detalle.comentarios.map(c => [c.sentimiento, c.confianza, `"${c.texto}"`])];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${seleccionada?.nombre || "encuesta"}_resultados.csv`;
    a.click();
  };

  const comentariosFiltrados = detalle?.comentarios?.filter(c =>
    filtroSentimiento === "Todos" || c.sentimiento === filtroSentimiento
  ) || [];

  return (
    <div style={S.grid}>
      {/* Lista */}
      <div style={S.card}>
        <p style={S.sectionTitle}>Encuestas recientes</p>
        {encuestas.map(enc => (
          <div key={enc.id_encuesta} onClick={() => cargarDetalle(enc)}
            style={{ padding: 14, borderRadius: 10, marginBottom: 8, cursor: "pointer",
              background: seleccionada?.id_encuesta === enc.id_encuesta ? "#eff6ff" : "#f9fafb",
              border: seleccionada?.id_encuesta === enc.id_encuesta
                ? "1.5px solid #93c5fd" : "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", flex: 1 }}>{enc.nombre}</div>
              <Badge estado={enc.estado} />
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
              {enc.respuestas ?? 0} respuestas · {enc.fecha}
            </div>
          </div>
        ))}
      </div>

      {/* Detalle */}
      {seleccionada && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
                  {seleccionada.nombre}
                </h3>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  {detalle?.total_respuestas ?? "—"} respuestas ·{" "}
                  {detalle?.total_preguntas ?? "—"} preguntas · Análisis NLP completado
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setModalCSV(true)}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e5e7eb",
                    background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                  📄 Cargar CSV
                </button>
                <button onClick={exportar}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e5e7eb",
                    background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                  ↗ Exportar
                </button>
              </div>
            </div>

            {loadingDetalle ? (
              <div style={{ textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 13 }}>
                Cargando análisis...
              </div>
            ) : detalle && (
              <>
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                    Sentimiento global — análisis NLP
                  </div>
                  <SentimientoBar {...detalle.sentimiento_global} />
                </div>
                {detalle.por_pregunta?.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 12 }}>
                      Sentimiento por pregunta
                    </div>
                    {detalle.por_pregunta.map((p, i) => <PreguntaBar key={i} {...p} />)}
                  </div>
                )}
              </>
            )}
          </div>

          {detalle && (
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <p style={{ ...S.sectionTitle, margin: 0 }}>Comentarios clasificados por NLP</p>
                <select value={filtroSentimiento} onChange={e => setFiltro(e.target.value)}
                  style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8,
                    border: "1px solid #e5e7eb", outline: "none" }}>
                  <option>Todos</option>
                  <option>Positivo</option>
                  <option>Neutro</option>
                  <option>Negativo</option>
                </select>
              </div>



              <div style={{ maxHeight: 350, overflowY: "auto", paddingRight: 8 }}>
  {comentariosFiltrados.length === 0
    ? <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 20 }}>
        No hay comentarios para este filtro.
      </div>
    : comentariosFiltrados.map((c, i) => <Comentario key={i} {...c} />)
  }
</div>
            </div>
          )}
        </div>
      )}

      {modalCSV && (
        <ModalCargarCSV
          encuestaId={seleccionada?.id_encuesta}
          onClose={() => setModalCSV(false)}
          onCargado={() => cargarDetalle(seleccionada)}
        />
      )}
    </div>
  );
}

// ─── Pestaña Mis Encuestas ────────────────────────────────────────────────────
function TabMisEncuestas({ onNueva }) {
  const [encuestas, setEncuestas] = useState([]);

  const cargar = () => {
    axios.get("http://127.0.0.1:8000/encuestas")
      .then(r => setEncuestas(r.data))
      .catch(() => setEncuestas(mockEncuestas));
  };

  useEffect(() => { cargar(); }, []);

  const cambiarEstado = async (id, estado) => {
    try {
      await axios.patch(`http://127.0.0.1:8000/encuestas/${id}`, { estado });
      cargar();
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {encuestas.map(enc => (
          <div key={enc.id_encuesta} style={{ ...S.card, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", flex: 1 }}>{enc.nombre}</div>
              <Badge estado={enc.estado} />
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {enc.respuestas ?? 0} respuestas · {enc.fecha}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              {enc.estado !== "Activa" && (
                <button onClick={() => cambiarEstado(enc.id_encuesta, "Activa")}
                  style={{ flex: 1, padding: 7, fontSize: 12, borderRadius: 8,
                    border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#15803d", cursor: "pointer" }}>
                  Activar
                </button>
              )}
              {enc.estado === "Activa" && (
                <button onClick={() => cambiarEstado(enc.id_encuesta, "Cerrada")}
                  style={{ flex: 1, padding: 7, fontSize: 12, borderRadius: 8,
                    border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer" }}>
                  Cerrar
                </button>
              )}
            </div>
          </div>
        ))}
        <div onClick={onNueva}
          style={{ ...S.card, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", border: "2px dashed #d1d5db", background: "#f9fafb",
            minHeight: 140, flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 24, color: "#9ca3af" }}>+</div>
          <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>Nueva encuesta</div>
        </div>
      </div>
    </div>
  );
}

// ─── Pestaña Crear Encuesta ───────────────────────────────────────────────────
function TabCrearEncuesta({ onCreada }) {
  const [nombre, setNombre]       = useState("");
  const [objetivo, setObjetivo]   = useState("");
  const [preguntas, setPreguntas] = useState(["", ""]);
  const [loading, setLoading]     = useState(false);
  const [ok, setOk]               = useState(false);

  const agregarPregunta  = () => setPreguntas([...preguntas, ""]);
  const cambiarPregunta  = (i, val) => { const a = [...preguntas]; a[i] = val; setPreguntas(a); };
  const eliminarPregunta = (i) => setPreguntas(preguntas.filter((_, idx) => idx !== i));

  const guardar = async () => {
    if (!nombre.trim()) return;
    setLoading(true);
    try {
      await axios.post("http://127.0.0.1:8000/encuestas", {
        nombre, objetivo, preguntas: preguntas.filter(Boolean),
      });
      setOk(true);
      setTimeout(() => { setOk(false); onCreada(); }, 1500);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ marginTop: 20, maxWidth: 600 }}>
      <div style={S.card}>
        <p style={S.sectionTitle}>Información general</p>
        <label style={labelStyle}>Nombre de la encuesta</label>
        <input value={nombre} onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Percepción académica 2025-1" style={inputStyle} />
        <label style={labelStyle}>Objetivo</label>
        <textarea value={objetivo} onChange={e => setObjetivo(e.target.value)}
          placeholder="Describe el propósito de esta encuesta..." rows={3}
          style={{ ...inputStyle, resize: "vertical" }} />

        <p style={{ ...S.sectionTitle, marginTop: 24 }}>Preguntas</p>
        {preguntas.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
            <span style={{ width: 24, fontSize: 13, color: "#9ca3af", fontWeight: 700 }}>{i + 1}</span>
            <input value={p} onChange={e => cambiarPregunta(i, e.target.value)}
              placeholder={`Pregunta ${i + 1}...`} style={{ ...inputStyle, flex: 1 }} />
            {preguntas.length > 1 && (
              <button onClick={() => eliminarPregunta(i)}
                style={{ background: "#fef2f2", border: "1px solid #fecaca",
                  borderRadius: 8, padding: "0 12px", height: 38, cursor: "pointer", color: "#dc2626" }}>
                ✕
              </button>
            )}
          </div>
        ))}
        <button onClick={agregarPregunta}
          style={{ background: "none", border: "1px dashed #d1d5db", borderRadius: 8,
            width: "100%", padding: 10, cursor: "pointer", color: "#6b7280", fontSize: 13, marginTop: 4 }}>
          + Agregar pregunta
        </button>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
          <button onClick={guardar} disabled={loading || !nombre.trim()}
            style={{ padding: "10px 28px", borderRadius: 8, border: "none",
              background: nombre.trim() ? "#2563eb" : "#93c5fd",
              color: "#fff", cursor: nombre.trim() ? "pointer" : "not-allowed",
              fontSize: 14, fontWeight: 600 }}>
            {ok ? "✓ Creada" : loading ? "Creando..." : "Crear encuesta"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Encuestas() {
  const [activeTab, setActiveTab] = useState("Resultados");
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div className="content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>
              Gestión de encuestas
            </h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
              Crea encuestas y analiza resultados con NLP automático
            </p>
          </div>
          <button onClick={() => setActiveTab("Crear encuesta")}
            style={{ padding: "10px 18px", borderRadius: 10, border: "none",
              background: "#2563eb", color: "#fff", fontWeight: 600,
              fontSize: 13, cursor: "pointer", marginTop: 4 }}>
            + Nueva encuesta
          </button>
        </div>

        <div style={{ display: "flex", gap: 4, margin: "20px 0 0" }}>
          {["Resultados", "Mis encuestas", "Crear encuesta"].map(t => (
            <button key={t} style={S.tab(activeTab === t)} onClick={() => setActiveTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {activeTab === "Resultados"     && <TabResultados key={refreshKey} />}
        {activeTab === "Mis encuestas"  && <TabMisEncuestas key={refreshKey} onNueva={() => setActiveTab("Crear encuesta")} />}
        {activeTab === "Crear encuesta" && <TabCrearEncuesta onCreada={() => { refresh(); setActiveTab("Mis encuestas"); }} />}
      </div>
    </div>
  );
}
