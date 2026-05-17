import React, { useState } from "react";

const Encuestas = () => {
  const [file, setFile] = useState(null);

  const handleUpload = (e) => {
    setFile(e.target.files[0]);
    // Aquí puedes enviar el archivo al backend para análisis
  };

  return (
    <div>
      <h2>📑 Encuestas</h2>
      <input type="file" onChange={handleUpload} />
      {file && <p>Archivo seleccionado: {file.name}</p>}
    </div>
  );
};

export default Encuestas;
