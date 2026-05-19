import React from "react";
import { Link } from "react-router-dom";
import "../styles/Sidebar.css";

const Sidebar = () => {
  return (
    <div className="sidebar">
      <h2>USTA Analytics</h2>
      <ul>
        <li><Link to="/">Dashboard</Link></li>
        <li><Link to="/desercion">Deserción</Link></li>
        <li><Link to="/predicciones">Predicciones</Link></li>
        <li><Link to="/encuestas">Encuestas</Link></li>
        <li><Link to="/academico">Académico</Link></li>
      </ul>
    </div>
  );
};

export default Sidebar;
