import mysql.connector

conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="12345",
    database="usta_analytics"
)

cursor = conn.cursor()

# Promedio de notas por curso
query = """
SELECT c.nombre, AVG(n.valor) AS promedio
FROM nota n
JOIN curso c ON n.curso_id = c.id
GROUP BY c.nombre;
"""
cursor.execute(query)

for row in cursor.fetchall():
    print(row)

conn.close()
