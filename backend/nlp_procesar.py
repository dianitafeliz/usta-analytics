"""
nlp_procesar.py
Corre después de cargar encuestas_sin_nlp.sql
Analiza cada respuesta con pysentimiento y llena resultado_npl
"""
import mysql.connector
from tqdm import tqdm

# ─── Conexión ─────────────────────────────────────────────────────────────────
conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="12345",
    database="usta_analytics"
)
cursor = conn.cursor(dictionary=True)

# ─── Cargar modelo NLP en español ────────────────────────────────────────────
print("Cargando modelo NLP (pysentimiento)...")
from pysentimiento import create_analyzer
analyzer = create_analyzer(task="sentiment", lang="es")
print("✅ Modelo cargado")

# ─── Obtener respuestas sin analizar ─────────────────────────────────────────
cursor.execute("""
    SELECT r.id_respuesta, r.respuesta_texto
    FROM respuesta r
    LEFT JOIN resultado_npl rn ON rn.id_respuesta = r.id_respuesta
    WHERE rn.id_resultado IS NULL
    ORDER BY r.id_respuesta
""")
respuestas = cursor.fetchall()
print(f"📝 Respuestas por analizar: {len(respuestas)}")

# ─── Mapa de etiquetas ────────────────────────────────────────────────────────
# pysentimiento devuelve: POS, NEG, NEU
mapa = {"POS": "Positivo", "NEG": "Negativo", "NEU": "Neutro"}

# ─── Procesar ─────────────────────────────────────────────────────────────────
insert_cursor = conn.cursor()
procesados = 0
errores = 0

for row in tqdm(respuestas, desc="Analizando sentimientos"):
    try:
        resultado = analyzer.predict(row["respuesta_texto"])
        sentimiento = mapa.get(resultado.output, "Neutro")
        # La confianza es el score de la etiqueta ganadora
        confianza = round(resultado.probas[resultado.output], 4)

        insert_cursor.execute("""
            INSERT INTO resultado_npl (id_respuesta, sentimiento, confianza)
            VALUES (%s, %s, %s)
        """, (row["id_respuesta"], sentimiento, confianza))
        procesados += 1

        # Commit cada 100 registros
        if procesados % 100 == 0:
            conn.commit()
            print(f"  → {procesados} procesados...")

    except Exception as e:
        errores += 1
        print(f"  ⚠ Error en respuesta {row['id_respuesta']}: {e}")

conn.commit()
cursor.close()
insert_cursor.close()
conn.close()

print(f"\n✅ Completado: {procesados} respuestas analizadas, {errores} errores")
