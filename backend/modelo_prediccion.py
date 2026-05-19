"""
modelo_prediccion.py
Entrena el modelo de predicción de deserción y lo guarda como modelo.pkl
Correr UNA vez: python modelo_prediccion.py
"""
import mysql.connector
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import StandardScaler
import pickle

# ─── Conexión ─────────────────────────────────────────────────────────────────
conn = mysql.connector.connect(
    host="localhost", user="root", password="12345", database="usta_analytics"
)

# ─── Extraer datos ────────────────────────────────────────────────────────────
query = """
SELECT 
    e.id_estudiante,
    p.facultad,
    p.nombre AS programa,
    -- Promedio general de notas
    COALESCE(AVG(n.valor), 0) AS promedio_general,
    -- Cantidad de notas registradas
    COUNT(n.id_nota) AS num_notas,
    -- Proporción de notas reprobadas (< 3.0)
    COALESCE(SUM(CASE WHEN n.valor < 3.0 THEN 1 ELSE 0 END) / NULLIF(COUNT(n.id_nota), 0), 0) AS prop_reprobadas,
    -- Promedio mínimo (peor materia)
    COALESCE(MIN(n.valor), 0) AS nota_minima,
    -- Número de periodos distintos cursados
    COUNT(DISTINCT m.periodo) AS num_periodos,
    -- Número de materias en deserción previa
    SUM(CASE WHEN m.estado = 'Desertor' THEN 1 ELSE 0 END) AS materias_desercion,
    -- Sentimiento promedio encuestas (1=pos, 0=neu, -1=neg)
    COALESCE(AVG(CASE 
        WHEN rn.sentimiento = 'Positivo' THEN 1
        WHEN rn.sentimiento = 'Neutro'   THEN 0
        ELSE -1
    END), 0) AS sentimiento_promedio,
    -- Variable objetivo: ¿tuvo al menos una deserción?
    CASE WHEN SUM(CASE WHEN m.estado = 'Desertor' THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS desertor
FROM estudiante e
JOIN matricula m ON m.id_estudiante = e.id_estudiante
JOIN programa p ON p.id_programa = e.id_programa
LEFT JOIN nota n ON n.id_matricula = m.id_matricula
LEFT JOIN respuesta r ON r.id_estudiante = e.id_estudiante
LEFT JOIN resultado_npl rn ON rn.id_respuesta = r.id_respuesta
GROUP BY e.id_estudiante, p.facultad, p.nombre
HAVING COUNT(n.id_nota) > 0
"""

df = pd.read_sql(query, conn)
conn.close()

print(f"✅ Datos extraídos: {len(df)} estudiantes")
print(f"   Desertores: {df['desertor'].sum()} ({df['desertor'].mean()*100:.1f}%)")
print(f"   No desertores: {(df['desertor']==0).sum()}")

# ─── Features y target ────────────────────────────────────────────────────────
features = [
    'promedio_general', 'num_notas', 'prop_reprobadas',
    'nota_minima', 'num_periodos', 'materias_desercion',
    'sentimiento_promedio'
]

X = df[features].values
y = df['desertor'].values

# ─── Entrenar modelo ──────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

modelo = RandomForestClassifier(
    n_estimators=100,
    max_depth=8,
    min_samples_leaf=3,
    class_weight='balanced',
    random_state=42
)
modelo.fit(X_train, y_train)

# ─── Evaluar ──────────────────────────────────────────────────────────────────
y_pred = modelo.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"\n📊 Precisión del modelo: {acc*100:.1f}%")
print(classification_report(y_test, y_pred, target_names=["No desertor","Desertor"]))

# Importancia de features
importancias = dict(zip(features, modelo.feature_importances_))
print("\n🔍 Importancia de variables:")
for f, v in sorted(importancias.items(), key=lambda x: -x[1]):
    print(f"   {f}: {v:.3f}")

# ─── Guardar modelo ───────────────────────────────────────────────────────────
with open("modelo.pkl", "wb") as f:
    pickle.dump({"modelo": modelo, "features": features, "precision": round(acc*100, 1)}, f)

print(f"\n Modelo guardado como modelo.pkl")
