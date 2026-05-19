from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import mysql.connector
import csv, io
from datetime import date
import pickle
import os
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="12345",
        database="usta_analytics"
    )

# ─── Modelos ──────────────────────────────────────────────────────────────────

class EncuestaCreate(BaseModel):
    nombre: str
    objetivo: Optional[str] = ""
    preguntas: List[str] = []

class EncuestaUpdate(BaseModel):
    estado: Optional[str] = None

# ─── Endpoints existentes ─────────────────────────────────────────────────────

@app.get("/")
def home():
    return {"message": "API USTA Analytics funcionando 🚀"}

@app.get("/estudiantes")
def get_estudiantes():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM estudiante;")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data

@app.get("/cursos")
def get_cursos():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM curso;")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data

@app.get("/matriculas")
def get_matriculas():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
    SELECT e.nombre AS estudiante, c.nombre AS curso
    FROM matricula m
    JOIN estudiante e ON m.id_estudiante = e.id_estudiante
    JOIN curso c ON m.id_curso = c.id_curso;
    """
    cursor.execute(query)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data

@app.get("/promedios")
def get_promedios():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
    SELECT c.nombre AS curso, AVG(n.valor) AS promedio
    FROM nota n
    JOIN curso c ON n.id_curso = c.id_curso
    GROUP BY c.nombre;
    """
    cursor.execute(query)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data

@app.get("/programa/{programa_id}")
def get_estudiantes_programa(programa_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
    SELECT e.nombre, p.nombre AS programa
    FROM estudiante e
    JOIN programa p ON e.id_programa = p.id_programa
    WHERE p.id_programa = %s;
    """
    cursor.execute(query, (programa_id,))
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data

@app.get("/estudiantes_por_facultad")
def estudiantes_por_facultad() -> List[Dict]:
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        query = """
        SELECT 
            c.area AS facultad,
            COUNT(m.id_estudiante) AS total_estudiantes
        FROM matricula m
        JOIN curso c ON m.id_curso = c.id_curso
        WHERE m.periodo = '2024-2'
        GROUP BY c.area
        ORDER BY total_estudiantes DESC;
        """
        cursor.execute(query)
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        return results
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Error en la base de datos: {err}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inesperado: {e}")

@app.get("/desercion_por_facultad")
def desercion_por_facultad():
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        query = """
        SELECT p.nombre AS facultad,
               ROUND(SUM(m.estado = 'Desertor') / COUNT(*) * 100, 2) AS porcentaje_desercion
        FROM MATRICULA m
        JOIN ESTUDIANTE e ON m.id_estudiante = e.id_estudiante
        JOIN PROGRAMA p ON e.id_programa = p.id_programa
        GROUP BY p.nombre
        ORDER BY porcentaje_desercion DESC;
        """
        cursor.execute(query)
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        return results
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Error en la base de datos: {err}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inesperado: {e}")

@app.get("/desercion_por_programa")
def desercion_por_programa(periodo: str = "Todos"):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    query = f"""
    SELECT 
        p.nombre AS programa,
        p.facultad AS facultad,
        m.periodo AS periodo,
        COUNT(m.id_matricula) AS matriculados,
        SUM(CASE WHEN m.estado = 'Desertor' THEN 1 ELSE 0 END) AS desertores,
        ROUND(
            (SUM(CASE WHEN m.estado = 'Desertor' THEN 1 ELSE 0 END) / COUNT(m.id_matricula)) * 100, 2
        ) AS tasa
    FROM MATRICULA m
    JOIN CURSO c ON m.id_curso = c.id_curso
    JOIN PROGRAMA p ON c.id_programa = p.id_programa
    {f"WHERE m.periodo = '{periodo}'" if periodo != "Todos" else ""}
    GROUP BY p.nombre, p.facultad, m.periodo
    ORDER BY p.facultad, p.nombre, m.periodo;
    """
    cursor.execute(query)
    data = cursor.fetchall()
    conn.close()
    return data

@app.get("/detalle_facultad")
def detalle_facultad(periodo: str = "Todos"):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    query = f"""
    SELECT 
        p.facultad,
        ROUND(
            (SUM(CASE WHEN m.estado = 'Desertor' THEN 1 ELSE 0 END) / COUNT(m.id_matricula)) * 100, 2
        ) AS porcentaje_desercion
    FROM MATRICULA m
    JOIN CURSO c ON m.id_curso = c.id_curso
    JOIN PROGRAMA p ON c.id_programa = p.id_programa
    {f"WHERE m.periodo = '{periodo}'" if periodo != "Todos" else ""}
    GROUP BY p.facultad
    ORDER BY p.facultad;
    """
    cursor.execute(query)
    data = cursor.fetchall()
    conn.close()
    return data

# ─── Endpoints de encuestas ───────────────────────────────────────────────────

@app.get("/encuestas")
def listar_encuestas():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            e.id_encuesta,
            e.nombre,
            e.objetivo,
            e.fecha,
            COALESCE(e.estado, 'Borrador') AS estado,
            COUNT(DISTINCT r.id_respuesta) AS respuestas
        FROM encuesta e
        LEFT JOIN pregunta p ON p.id_encuesta = e.id_encuesta
        LEFT JOIN respuesta r ON r.id_pregunta = p.id_pregunta
        GROUP BY e.id_encuesta
        ORDER BY e.fecha DESC;
    """)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    for row in data:
        if row["fecha"]:
            row["fecha"] = row["fecha"].strftime("%b %Y")
    return data

@app.post("/encuestas")
def crear_encuesta(body: EncuestaCreate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO encuesta (nombre, objetivo, fecha, estado) VALUES (%s, %s, %s, 'Borrador')",
        (body.nombre, body.objetivo, date.today())
    )
    id_encuesta = cursor.lastrowid
    for texto in body.preguntas:
        if texto.strip():
            cursor.execute(
                "INSERT INTO pregunta (texto, id_encuesta) VALUES (%s, %s)",
                (texto.strip(), id_encuesta)
            )
    conn.commit()
    cursor.close()
    conn.close()
    return {"id_encuesta": id_encuesta, "mensaje": "Encuesta creada correctamente"}

@app.patch("/encuestas/{id_encuesta}")
def actualizar_encuesta(id_encuesta: int, body: EncuestaUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    if body.estado:
        cursor.execute(
            "UPDATE encuesta SET estado = %s WHERE id_encuesta = %s",
            (body.estado, id_encuesta)
        )
    conn.commit()
    cursor.close()
    conn.close()
    return {"mensaje": "Encuesta actualizada"}

@app.get("/encuestas/{id_encuesta}/resultados")
def resultados_encuesta(id_encuesta: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id_pregunta, texto FROM pregunta WHERE id_encuesta = %s", (id_encuesta,))
    preguntas = cursor.fetchall()
    if not preguntas:
        raise HTTPException(status_code=404, detail="Encuesta sin preguntas")
    ids = [p["id_pregunta"] for p in preguntas]
    fmt = ",".join(["%s"] * len(ids))
    cursor.execute(f"SELECT COUNT(*) AS total FROM respuesta WHERE id_pregunta IN ({fmt})", ids)
    total_resp = cursor.fetchone()["total"]
    cursor.execute(f"""
        SELECT rn.sentimiento, COUNT(*) AS cnt
        FROM respuesta r
        JOIN resultado_npl rn ON rn.id_respuesta = r.id_respuesta
        WHERE r.id_pregunta IN ({fmt})
        GROUP BY rn.sentimiento
    """, ids)
    sent_rows = cursor.fetchall()
    total_sent = sum(r["cnt"] for r in sent_rows) or 1
    sent_map = {r["sentimiento"]: r["cnt"] for r in sent_rows}
    sentimiento_global = {
        "positivo": round(sent_map.get("Positivo", 0) / total_sent * 100),
        "neutro":   round(sent_map.get("Neutro",   0) / total_sent * 100),
        "negativo": round(sent_map.get("Negativo", 0) / total_sent * 100),
    }
    por_pregunta = []
    for p in preguntas:
        cursor.execute("""
            SELECT rn.sentimiento, COUNT(*) AS cnt
            FROM respuesta r
            JOIN resultado_npl rn ON rn.id_respuesta = r.id_respuesta
            WHERE r.id_pregunta = %s
            GROUP BY rn.sentimiento
        """, (p["id_pregunta"],))
        filas = cursor.fetchall()
        tot = sum(f["cnt"] for f in filas) or 1
        mp = {f["sentimiento"]: f["cnt"] for f in filas}
        por_pregunta.append({
            "texto":    p["texto"],
            "positivo": round(mp.get("Positivo", 0) / tot * 100),
            "neutro":   round(mp.get("Neutro",   0) / tot * 100),
            "negativo": round(mp.get("Negativo", 0) / tot * 100),
        })
    cursor.execute(f"""
        SELECT r.respuesta_texto AS texto, rn.sentimiento,
               ROUND(rn.confianza * 100) AS confianza
        FROM respuesta r
        JOIN resultado_npl rn ON rn.id_respuesta = r.id_respuesta
        WHERE r.id_pregunta IN ({fmt})
        ORDER BY rn.confianza DESC
        LIMIT 50
    """, ids)
    comentarios = cursor.fetchall()
    cursor.close()
    conn.close()
    return {
        "total_respuestas": total_resp,
        "total_preguntas":  len(preguntas),
        "sentimiento_global": sentimiento_global,
        "por_pregunta": por_pregunta,
        "comentarios":  comentarios,
    }

@app.post("/encuestas/{id_encuesta}/cargar_respuestas")
async def cargar_respuestas(id_encuesta: int, file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    filas = list(reader)  # leer todo antes de abrir conexión

    # Cargar modelo UNA sola vez
    from pysentimiento import create_analyzer
    analyzer = create_analyzer(task="sentiment", lang="es")
    mapa = {"POS": "Positivo", "NEG": "Negativo", "NEU": "Neutro"}

    conn = get_connection()
    cursor = conn.cursor()
    insertados = 0

    for row in filas:
        id_pregunta   = int(row["id_pregunta"])
        respuesta_txt = row["respuesta_texto"].strip()
        id_estudiante = int(row.get("id_estudiante", 0))

        cursor.execute("""
            INSERT INTO respuesta (id_estudiante, id_pregunta, respuesta_texto, fecha_respuesta)
            VALUES (%s, %s, %s, CURDATE())
        """, (id_estudiante, id_pregunta, respuesta_txt))
        id_respuesta = cursor.lastrowid

        try:
            resultado   = analyzer.predict(respuesta_txt)
            sentimiento = mapa.get(resultado.output, "Neutro")
            confianza   = round(resultado.probas[resultado.output], 4)
        except Exception:
            sentimiento, confianza = "Neutro", 0.5

        cursor.execute("""
            INSERT INTO resultado_npl (id_respuesta, sentimiento, confianza)
            VALUES (%s, %s, %s)
        """, (id_respuesta, sentimiento, confianza))
        insertados += 1

    conn.commit()
    cursor.close()
    conn.close()
    return {"insertados": insertados, "mensaje": f"{insertados} respuestas procesadas con NLP"}

# ─── Endpoints de académico ───────────────────────────────────────────────────


# Generar endpoints del backend para academico


# ─── ENDPOINTS ACADÉMICO - pegar al final de main.py ─────────────────────────

@app.get("/academico/resumen")
def resumen_academico():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Promedio general
    cursor.execute("""
        SELECT ROUND(AVG(n.valor), 2) AS promedio_global
        FROM nota n
    """)
    promedio_global = cursor.fetchone()["promedio_global"] or 0

    # Total estudiantes activos
    cursor.execute("""
        SELECT COUNT(DISTINCT id_estudiante) AS total
        FROM matricula WHERE estado = 'Activa'
    """)
    activos = cursor.fetchone()["total"]

    # Total desertores
    cursor.execute("""
        SELECT COUNT(DISTINCT id_estudiante) AS total
        FROM matricula WHERE estado = 'Desertor'
    """)
    desertores = cursor.fetchone()["total"]

    # Estudiantes en riesgo (promedio < 3.0)
    cursor.execute("""
        SELECT COUNT(DISTINCT m.id_estudiante) AS total
        FROM matricula m
        JOIN nota n ON n.id_matricula = m.id_matricula
        GROUP BY m.id_estudiante
        HAVING AVG(n.valor) < 3.0
    """)
    en_riesgo = len(cursor.fetchall())

    cursor.close()
    conn.close()
    return {
        "promedio_global": promedio_global,
        "activos": activos,
        "desertores": desertores,
        "en_riesgo": en_riesgo,
    }


@app.get("/academico/rendimiento_por_facultad")
def rendimiento_por_facultad():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            p.facultad,
            ROUND(AVG(n.valor), 2) AS promedio,
            COUNT(DISTINCT m.id_estudiante) AS estudiantes,
            SUM(CASE WHEN m.estado = 'Desertor' THEN 1 ELSE 0 END) AS desertores
        FROM nota n
        JOIN matricula m ON m.id_matricula = n.id_matricula
        JOIN curso c ON c.id_curso = m.id_curso
        JOIN programa p ON p.id_programa = c.id_programa
        GROUP BY p.facultad
        ORDER BY promedio DESC
    """)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data


@app.get("/academico/rendimiento_por_programa")
def rendimiento_por_programa():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            p.nombre AS programa,
            p.facultad,
            ROUND(AVG(n.valor), 2) AS promedio,
            COUNT(DISTINCT m.id_estudiante) AS estudiantes,
            SUM(CASE WHEN n.valor < 3.0 THEN 1 ELSE 0 END) AS notas_bajas
        FROM nota n
        JOIN matricula m ON m.id_matricula = n.id_matricula
        JOIN curso c ON c.id_curso = m.id_curso
        JOIN programa p ON p.id_programa = c.id_programa
        GROUP BY p.nombre, p.facultad
        ORDER BY promedio DESC
    """)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data


@app.get("/academico/estudiantes_riesgo")
def estudiantes_riesgo():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            e.id_estudiante,
            e.nombre,
            p.nombre AS programa,
            p.facultad,
            ROUND(AVG(n.valor), 2) AS promedio,
            COUNT(CASE WHEN m.estado = 'Desertor' THEN 1 END) AS materias_desercion,
            CASE 
                WHEN AVG(n.valor) < 2.5 THEN 'Alto'
                WHEN AVG(n.valor) < 3.0 THEN 'Medio'
                ELSE 'Bajo'
            END AS nivel_riesgo
        FROM estudiante e
        JOIN matricula m ON m.id_estudiante = e.id_estudiante
        JOIN nota n ON n.id_matricula = m.id_matricula
        JOIN programa p ON p.id_programa = e.id_programa
        GROUP BY e.id_estudiante, e.nombre, p.nombre, p.facultad
        HAVING AVG(n.valor) < 3.0
        ORDER BY promedio ASC
        LIMIT 50
    """)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data


@app.get("/academico/notas_por_curso")
def notas_por_curso(periodo: str = "Todos"):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    where = f"WHERE m.periodo = '{periodo}'" if periodo != "Todos" else ""
    cursor.execute(f"""
        SELECT 
            c.nombre AS curso,
            p.nombre AS programa,
            p.facultad,
            m.periodo,
            ROUND(AVG(n.valor), 2) AS promedio,
            COUNT(DISTINCT m.id_estudiante) AS estudiantes,
            SUM(CASE WHEN n.valor < 3.0 THEN 1 ELSE 0 END) AS reprobados
        FROM nota n
        JOIN matricula m ON m.id_matricula = n.id_matricula
        JOIN curso c ON c.id_curso = m.id_curso
        JOIN programa p ON p.id_programa = c.id_programa
        {where}
        GROUP BY c.nombre, p.nombre, p.facultad, m.periodo
        ORDER BY promedio ASC
        LIMIT 100
    """)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data


@app.get("/academico/historial_matriculas")
def historial_matriculas(periodo: str = "Todos"):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    where = f"WHERE m.periodo = '{periodo}'" if periodo != "Todos" else ""
    cursor.execute(f"""
        SELECT 
            m.periodo,
            m.estado,
            COUNT(*) AS total,
            p.facultad
        FROM matricula m
        JOIN curso c ON c.id_curso = m.id_curso
        JOIN programa p ON p.id_programa = c.id_programa
        {where}
        GROUP BY m.periodo, m.estado, p.facultad
        ORDER BY m.periodo, p.facultad
    """)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data


@app.get("/academico/notas_estudiante/{id_estudiante}")
def notas_estudiante(id_estudiante: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            e.nombre AS estudiante,
            c.nombre AS curso,
            m.periodo,
            n.corte,
            n.valor,
            m.estado
        FROM nota n
        JOIN matricula m ON m.id_matricula = n.id_matricula
        JOIN estudiante e ON e.id_estudiante = m.id_estudiante
        JOIN curso c ON c.id_curso = m.id_curso
        WHERE e.id_estudiante = %s
        ORDER BY m.periodo, c.nombre, n.corte
    """, (id_estudiante,))
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data


# ─── ETL: Cargar notas por CSV ────────────────────────────────────────────────
@app.post("/academico/cargar_notas")
async def cargar_notas(file: UploadFile = File(...)):
    """
    CSV: id_matricula, valor, corte
    El ETL valida antes de insertar:
    - Que id_matricula exista
    - Que valor esté entre 0 y 5
    - Que corte sea Corte 1, Corte 2 o Corte 3
    - Que no exista ya esa nota
    """
    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    filas = list(reader)

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    insertados = 0
    errores = []
    omitidos = 0

    for i, row in enumerate(filas, 1):
        try:
            id_matricula = int(row["id_matricula"])
            valor        = float(row["valor"])
            corte        = row["corte"].strip()

            # Validar rango de nota
            if not (0 <= valor <= 5):
                errores.append({"fila": i, "error": f"Nota {valor} fuera de rango (0-5)"})
                continue

            # Validar corte
            if corte not in ["Corte 1", "Corte 2", "Corte 3"]:
                errores.append({"fila": i, "error": f"Corte '{corte}' inválido"})
                continue

            # Validar que la matrícula exista
            cursor.execute("SELECT id_matricula FROM matricula WHERE id_matricula = %s", (id_matricula,))
            if not cursor.fetchone():
                errores.append({"fila": i, "error": f"Matrícula {id_matricula} no existe"})
                continue

            # Validar que no exista ya esa nota
            cursor.execute("""
                SELECT id_nota FROM nota 
                WHERE id_matricula = %s AND corte = %s
            """, (id_matricula, corte))
            if cursor.fetchone():
                omitidos += 1
                continue

            # Insertar
            cursor.execute("""
                INSERT INTO nota (id_matricula, valor, corte)
                VALUES (%s, %s, %s)
            """, (id_matricula, valor, corte))
            insertados += 1

        except Exception as e:
            errores.append({"fila": i, "error": str(e)})

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "insertados": insertados,
        "omitidos": omitidos,
        "errores": errores[:20],  # máximo 20 errores
        "mensaje": f"{insertados} notas cargadas, {omitidos} ya existían, {len(errores)} errores"
    }
    
# ─── PREDICCIONES ────────────────────────────────────────────────
   
# ─── Cargar modelo entrenado ──────────────────────────────────────────────────

modelo_cache = None

def cargar_modelo():
    global modelo_cache

    if modelo_cache is None:
        ruta_modelo = os.path.join(os.path.dirname(__file__), "modelo.pkl")

        if not os.path.exists(ruta_modelo):
            raise HTTPException(
                status_code=500,
                detail="No se encontró modelo.pkl. Ejecuta modelo_prediccion.py"
            )

        with open(ruta_modelo, "rb") as f:
            modelo_cache = pickle.load(f)

    return modelo_cache
 
@app.get("/predicciones/resumen")
def predicciones_resumen(periodo: str = "Todos"):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
 
    modelo_data = cargar_modelo()
    modelo      = modelo_data["modelo"]
    precision   = modelo_data["precision"]
 
    where = f"AND m.periodo = '{periodo}'" if periodo != "Todos" else ""
 
    cursor.execute(f"""
        SELECT 
            e.id_estudiante,
            e.nombre,
            p.nombre AS programa,
            p.facultad,
            m.periodo,
            COALESCE(AVG(n.valor), 0)          AS promedio_general,
            COUNT(n.id_nota)                    AS num_notas,
            COALESCE(SUM(CASE WHEN n.valor < 3.0 THEN 1 ELSE 0 END) 
                / NULLIF(COUNT(n.id_nota),0), 0) AS prop_reprobadas,
            COALESCE(MIN(n.valor), 0)           AS nota_minima,
            COUNT(DISTINCT m.periodo)           AS num_periodos,
            SUM(CASE WHEN m.estado='Desertor' THEN 1 ELSE 0 END) AS materias_desercion,
            COALESCE(AVG(CASE 
                WHEN rn.sentimiento='Positivo' THEN 1
                WHEN rn.sentimiento='Neutro'   THEN 0
                ELSE -1 END), 0)               AS sentimiento_promedio
        FROM estudiante e
        JOIN matricula m ON m.id_estudiante = e.id_estudiante
        JOIN programa p ON p.id_programa = e.id_programa
        LEFT JOIN nota n ON n.id_matricula = m.id_matricula
        LEFT JOIN respuesta r ON r.id_estudiante = e.id_estudiante
        LEFT JOIN resultado_npl rn ON rn.id_respuesta = r.id_respuesta
        WHERE 1=1 {where}
        GROUP BY e.id_estudiante, e.nombre, p.nombre, p.facultad, m.periodo
        HAVING COUNT(n.id_nota) > 0
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
 
    features = ["promedio_general","num_notas","prop_reprobadas",
                "nota_minima","num_periodos","materias_desercion","sentimiento_promedio"]
 
    resultado = []
    for r in rows:
        X = np.array([[float(r[f]) for f in features]])
        prob = modelo.predict_proba(X)[0][1]
        nivel = "Alto" if prob >= 0.70 else "Medio" if prob >= 0.40 else "Bajo"
        resultado.append({
            **r,
            "probabilidad": round(prob * 100, 1),
            "nivel_riesgo": nivel,
        })
 
    alto  = sum(1 for r in resultado if r["nivel_riesgo"] == "Alto")
    medio = sum(1 for r in resultado if r["nivel_riesgo"] == "Medio")
    bajo  = sum(1 for r in resultado if r["nivel_riesgo"] == "Bajo")
    total = len(resultado)
 
    return {
        "precision_modelo": precision,
        "total": total,
        "alto":  alto,
        "medio": medio,
        "bajo":  bajo,
        "pct_alto":  round(alto/total*100, 1) if total else 0,
        "pct_medio": round(medio/total*100, 1) if total else 0,
        "pct_bajo":  round(bajo/total*100, 1) if total else 0,
        "estudiantes": sorted(resultado, key=lambda x: -x["probabilidad"])
    }
 
 
@app.get("/predicciones/estudiante/{id_estudiante}")
def prediccion_estudiante(id_estudiante: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
 
    cursor.execute("""
        SELECT 
            e.id_estudiante, e.nombre, e.genero,
            p.nombre AS programa, p.facultad,
            COALESCE(AVG(n.valor), 0)           AS promedio_general,
            COUNT(n.id_nota)                     AS num_notas,
            COALESCE(SUM(CASE WHEN n.valor < 3.0 THEN 1 ELSE 0 END)
                / NULLIF(COUNT(n.id_nota),0), 0) AS prop_reprobadas,
            COALESCE(MIN(n.valor), 0)            AS nota_minima,
            COUNT(DISTINCT m.periodo)            AS num_periodos,
            SUM(CASE WHEN m.estado='Desertor' THEN 1 ELSE 0 END) AS materias_desercion,
            COALESCE(AVG(CASE 
                WHEN rn.sentimiento='Positivo' THEN 1
                WHEN rn.sentimiento='Neutro'   THEN 0
                ELSE -1 END), 0)                AS sentimiento_promedio
        FROM estudiante e
        JOIN matricula m ON m.id_estudiante = e.id_estudiante
        JOIN programa p ON p.id_programa = e.id_programa
        LEFT JOIN nota n ON n.id_matricula = m.id_matricula
        LEFT JOIN respuesta r ON r.id_estudiante = e.id_estudiante
        LEFT JOIN resultado_npl rn ON rn.id_respuesta = r.id_respuesta
        WHERE e.id_estudiante = %s
        GROUP BY e.id_estudiante, e.nombre, e.genero, p.nombre, p.facultad
    """, (id_estudiante,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
 
    if not row:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
 
    modelo_data = cargar_modelo()
    modelo      = modelo_data["modelo"]
    features    = modelo_data["features"]
 
    X    = np.array([[float(row[f]) for f in features]])
    prob = modelo.predict_proba(X)[0][1]
    nivel = "Alto" if prob >= 0.70 else "Medio" if prob >= 0.40 else "Bajo"
 
    # Factores de riesgo basados en los datos reales
    factores = []
    if row["promedio_general"] < 3.0:
        factores.append({"factor": "Bajo rendimiento académico",
                         "intensidad": min(1, (3.0 - row["promedio_general"]) / 3.0)})
    if row["prop_reprobadas"] > 0.3:
        factores.append({"factor": "Alta tasa de reprobación",
                         "intensidad": min(1, row["prop_reprobadas"])})
    if row["materias_desercion"] > 0:
        factores.append({"factor": "Historial de deserción",
                         "intensidad": min(1, row["materias_desercion"] / 5)})
    if row["sentimiento_promedio"] < -0.2:
        factores.append({"factor": "Percepción negativa (encuestas)",
                         "intensidad": min(1, abs(row["sentimiento_promedio"]))})
    if row["num_notas"] < 3:
        factores.append({"factor": "Pocas notas registradas",
                         "intensidad": 0.5})
 
    return {
        **row,
        "probabilidad": round(prob * 100, 1),
        "nivel_riesgo": nivel,
        "factores": factores,
    }
 
 
@app.get("/predicciones/por_programa")
def predicciones_por_programa():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
 
    modelo_data = cargar_modelo()
    modelo      = modelo_data["modelo"]
 
    cursor.execute("""
        SELECT 
            e.id_estudiante,
            p.nombre AS programa,
            p.facultad,
            COALESCE(AVG(n.valor), 0) AS promedio_general,
            COUNT(n.id_nota) AS num_notas,
            COALESCE(SUM(CASE WHEN n.valor < 3.0 THEN 1 ELSE 0 END)
                / NULLIF(COUNT(n.id_nota),0), 0) AS prop_reprobadas,
            COALESCE(MIN(n.valor), 0) AS nota_minima,
            COUNT(DISTINCT m.periodo) AS num_periodos,
            SUM(CASE WHEN m.estado='Desertor' THEN 1 ELSE 0 END) AS materias_desercion,
            COALESCE(AVG(CASE 
                WHEN rn.sentimiento='Positivo' THEN 1
                WHEN rn.sentimiento='Neutro'   THEN 0
                ELSE -1 END), 0) AS sentimiento_promedio
        FROM estudiante e
        JOIN matricula m ON m.id_estudiante = e.id_estudiante
        JOIN programa p ON p.id_programa = e.id_programa
        LEFT JOIN nota n ON n.id_matricula = m.id_matricula
        LEFT JOIN respuesta r ON r.id_estudiante = e.id_estudiante
        LEFT JOIN resultado_npl rn ON rn.id_respuesta = r.id_respuesta
        GROUP BY e.id_estudiante, p.nombre, p.facultad
        HAVING COUNT(n.id_nota) > 0
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
 
    features = ["promedio_general","num_notas","prop_reprobadas",
                "nota_minima","num_periodos","materias_desercion","sentimiento_promedio"]
 
    prog_map = {}
    for r in rows:
        X    = np.array([[float(r[f]) for f in features]])
        prob = modelo.predict_proba(X)[0][1]
        key  = r["programa"]
        if key not in prog_map:
            prog_map[key] = {"programa": r["programa"], "facultad": r["facultad"],
                              "probs": [], "total": 0, "alto": 0}
        prog_map[key]["probs"].append(prob)
        prog_map[key]["total"] += 1
        if prob >= 0.70:
            prog_map[key]["alto"] += 1
 
    resultado = []
    for v in prog_map.values():
        promedio_riesgo = round(sum(v["probs"]) / len(v["probs"]) * 100, 1)
        resultado.append({
            "programa": v["programa"],
            "facultad": v["facultad"],
            "total_estudiantes": v["total"],
            "en_riesgo_alto": v["alto"],
            "promedio_riesgo": promedio_riesgo,
        })
 


# ─── ENDPOINTS DASHBOARD  ─────────────────────────
 
@app.get("/dashboard/resumen")
def dashboard_resumen(periodo: str = "Todos"):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    where = f"WHERE m.periodo = '{periodo}'" if periodo != "Todos" else ""
 
    # KPIs principales
    cursor.execute(f"""
        SELECT
            COUNT(DISTINCT m.id_estudiante) AS total_estudiantes,
            SUM(CASE WHEN m.estado = 'Activa'    THEN 1 ELSE 0 END) AS activas,
            SUM(CASE WHEN m.estado = 'Desertor'  THEN 1 ELSE 0 END) AS desertores,
            SUM(CASE WHEN m.estado = 'Finalizada'THEN 1 ELSE 0 END) AS finalizadas,
            COUNT(*) AS total_matriculas
        FROM matricula m {where}
    """)
    kpis = cursor.fetchone()
 
    # Promedio general
    cursor.execute(f"""
        SELECT ROUND(AVG(n.valor), 2) AS promedio
        FROM nota n
        JOIN matricula m ON m.id_matricula = n.id_matricula
        {where}
    """)
    promedio = cursor.fetchone()["promedio"] or 0
 
    # Tasa deserción
    tasa = round(kpis["desertores"] / kpis["total_matriculas"] * 100, 1) if kpis["total_matriculas"] else 0
 
    # Deserción por facultad
    cursor.execute(f"""
        SELECT p.facultad,
            COUNT(*) AS total,
            SUM(CASE WHEN m.estado = 'Desertor' THEN 1 ELSE 0 END) AS desertores,
            ROUND(SUM(CASE WHEN m.estado = 'Desertor' THEN 1 ELSE 0 END) / COUNT(*) * 100, 1) AS tasa
        FROM matricula m
        JOIN curso c ON c.id_curso = m.id_curso
        JOIN programa p ON p.id_programa = c.id_programa
        {where}
        GROUP BY p.facultad
        ORDER BY tasa DESC
    """)
    por_facultad = cursor.fetchall()
 
    # Matrículas por periodo
    cursor.execute("""
        SELECT periodo,
            COUNT(*) AS total,
            SUM(CASE WHEN estado = 'Desertor'   THEN 1 ELSE 0 END) AS desertores,
            SUM(CASE WHEN estado = 'Activa'     THEN 1 ELSE 0 END) AS activas,
            SUM(CASE WHEN estado = 'Finalizada' THEN 1 ELSE 0 END) AS finalizadas
        FROM matricula
        GROUP BY periodo ORDER BY periodo
    """)
    por_periodo = cursor.fetchall()
 
    # Promedio por facultad
    cursor.execute(f"""
        SELECT p.facultad, ROUND(AVG(n.valor), 2) AS promedio
        FROM nota n
        JOIN matricula m ON m.id_matricula = n.id_matricula
        JOIN curso c ON c.id_curso = m.id_curso
        JOIN programa p ON p.id_programa = c.id_programa
        {where}
        GROUP BY p.facultad ORDER BY promedio DESC
    """)
    promedio_facultad = cursor.fetchall()
 
    # Distribución de notas (rangos)
    cursor.execute(f"""
        SELECT
            SUM(CASE WHEN n.valor >= 4.5 THEN 1 ELSE 0 END) AS excelente,
            SUM(CASE WHEN n.valor >= 3.5 AND n.valor < 4.5 THEN 1 ELSE 0 END) AS bueno,
            SUM(CASE WHEN n.valor >= 3.0 AND n.valor < 3.5 THEN 1 ELSE 0 END) AS aceptable,
            SUM(CASE WHEN n.valor < 3.0 THEN 1 ELSE 0 END) AS reprobado
        FROM nota n
        JOIN matricula m ON m.id_matricula = n.id_matricula
        {where}
    """)
    dist_notas = cursor.fetchone()
 
    # Última encuesta
    cursor.execute("""
        SELECT e.nombre,
            SUM(CASE WHEN rn.sentimiento = 'Positivo' THEN 1 ELSE 0 END) AS positivo,
            SUM(CASE WHEN rn.sentimiento = 'Neutro'   THEN 1 ELSE 0 END) AS neutro,
            SUM(CASE WHEN rn.sentimiento = 'Negativo' THEN 1 ELSE 0 END) AS negativo,
            COUNT(*) AS total
        FROM encuesta e
        JOIN pregunta p ON p.id_encuesta = e.id_encuesta
        JOIN respuesta r ON r.id_pregunta = p.id_pregunta
        JOIN resultado_npl rn ON rn.id_respuesta = r.id_respuesta
        GROUP BY e.id_encuesta, e.nombre
        ORDER BY e.fecha DESC LIMIT 1
    """)
    ultima_encuesta = cursor.fetchone()
    if ultima_encuesta and ultima_encuesta["total"]:
        t = ultima_encuesta["total"]
        ultima_encuesta["pct_positivo"] = round(ultima_encuesta["positivo"] / t * 100)
        ultima_encuesta["pct_neutro"]   = round(ultima_encuesta["neutro"]   / t * 100)
        ultima_encuesta["pct_negativo"] = round(ultima_encuesta["negativo"] / t * 100)
 
    # Estudiantes en riesgo alto (del modelo si existe)
    try:
        modelo_data = cargar_modelo()
        modelo      = modelo_data["modelo"]
        features    = modelo_data["features"]
        cursor.execute("""
            SELECT e.id_estudiante, e.nombre, p.nombre AS programa, p.facultad,
                COALESCE(AVG(n.valor), 0) AS promedio_general,
                COUNT(n.id_nota) AS num_notas,
                COALESCE(SUM(CASE WHEN n.valor < 3.0 THEN 1 ELSE 0 END)
                    / NULLIF(COUNT(n.id_nota),0), 0) AS prop_reprobadas,
                COALESCE(MIN(n.valor), 0) AS nota_minima,
                COUNT(DISTINCT m.periodo) AS num_periodos,
                SUM(CASE WHEN m.estado='Desertor' THEN 1 ELSE 0 END) AS materias_desercion,
                COALESCE(AVG(CASE WHEN rn.sentimiento='Positivo' THEN 1
                    WHEN rn.sentimiento='Neutro' THEN 0 ELSE -1 END), 0) AS sentimiento_promedio
            FROM estudiante e
            JOIN matricula m ON m.id_estudiante = e.id_estudiante
            JOIN programa p ON p.id_programa = e.id_programa
            LEFT JOIN nota n ON n.id_matricula = m.id_matricula
            LEFT JOIN respuesta r ON r.id_estudiante = e.id_estudiante
            LEFT JOIN resultado_npl rn ON rn.id_respuesta = r.id_respuesta
            GROUP BY e.id_estudiante, e.nombre, p.nombre, p.facultad
            HAVING COUNT(n.id_nota) > 0
        """)
        est_rows = cursor.fetchall()
        en_riesgo = []
        for r in est_rows:
            X    = [[float(r[f]) for f in features]]
            prob = modelo.predict_proba(X)[0][1]
            if prob >= 0.70:
                en_riesgo.append({
                    "nombre": r["nombre"], "programa": r["programa"],
                    "facultad": r["facultad"], "probabilidad": round(prob*100,1),
                    "nivel_riesgo": "Alto"
                })
        en_riesgo = sorted(en_riesgo, key=lambda x: -x["probabilidad"])[:6]
    except Exception:
        en_riesgo = []
 
    cursor.close()
    conn.close()
    return {
        "kpis": {**kpis, "promedio": promedio, "tasa_desercion": tasa},
        "por_facultad": por_facultad,
        "por_periodo": por_periodo,
        "promedio_facultad": promedio_facultad,
        "dist_notas": dist_notas,
        "ultima_encuesta": ultima_encuesta,
        "en_riesgo": en_riesgo,
    }


