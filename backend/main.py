from fastapi import FastAPI
import mysql.connector

app = FastAPI()

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
    conn.close()
    return data

@app.get("/cursos")
def get_cursos():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM curso;")
    data = cursor.fetchall()
    conn.close()
    return data

# 🔹 Nuevo endpoint: estudiantes matriculados en cursos
@app.get("/matriculas")
def get_matriculas():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
    SELECT e.nombre AS estudiante, c.nombre AS curso
    FROM matricula m
    JOIN estudiante e ON m.estudiante_id = e.id
    JOIN curso c ON m.curso_id = c.id;
    """
    cursor.execute(query)
    data = cursor.fetchall()
    conn.close()
    return data

@app.get("/promedios")
def get_promedios():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
    SELECT c.nombre AS curso, AVG(n.valor) AS promedio
    FROM nota n
    JOIN curso c ON n.curso_id = c.id
    GROUP BY c.nombre;
    """
    cursor.execute(query)
    data = cursor.fetchall()
    conn.close()
    return data


@app.get("/programa/{programa_id}")
def get_estudiantes_programa(programa_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
    SELECT e.nombre, p.nombre AS programa
    FROM estudiante e
    JOIN programa p ON e.programa_id = p.id
    WHERE p.id = %s;
    """
    cursor.execute(query, (programa_id,))
    data = cursor.fetchall()
    conn.close()
    return data
