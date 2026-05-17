import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Reportes from "./components/Reportes";
import Encuestas from "./components/Encuestas";
import Academico from "./components/Academico";
import "./styles/App.css";


function App() {
  return (
    <Router>
      <div className="app">
        <Sidebar />
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/encuestas" element={<Encuestas />} />
            <Route path="/academico" element={<Academico />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
