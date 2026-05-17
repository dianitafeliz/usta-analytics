from fastapi import FastAPI, HTTPException
import mysql.connector
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict




app = FastAPI()

# 🔹 Configurar CORS (para permitir llamadas desde tu frontend en React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # tu frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔹 Función de conexión a la base de datos
def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="12345",   # tu contraseña de MySQL
        database="usta_analytics"
    )

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

# 🔹 Endpoint corregido: estudiantes por facultad/área
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
