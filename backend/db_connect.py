import mysql.connector

# Conexión a la base de datos
conn = mysql.connector.connect(
    host="localhost",
    user="root",          # tu usuario de MySQL
    password="12345",  # tu contraseña de MySQL
    database="usta_analytics"
)

cursor = conn.cursor()

# Probar con una consulta
cursor.execute("SHOW TABLES;")
for table in cursor.fetchall():
    print(table)

conn.close()
