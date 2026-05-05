// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Ranking from "./pages/Ranking";
import Esportes from "./pages/Esportes";
import Configuracao from "./pages/Configuracao";
import Chaveamento from "./pages/Chaveamento";
import EsporteDetalhe from "./pages/EsporteDetalhe";
import JogoDetalhe from "./pages/JogoDetalhe";
import BottomNav from "./components/common/BottomNav";

function App() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-text">
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/ranking" replace />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/esportes" element={<Esportes />} />
          <Route path="/esportes/:esporteId" element={<EsporteDetalhe />} />
          <Route path="/esportes/:esporteId/jogos/:jogoId" element={<JogoDetalhe />} />
          <Route path="/configuracao" element={<Configuracao />} />
          <Route path="/chaveamento" element={<Chaveamento />} />
          <Route path="/chaveamento/:esporteId" element={<Chaveamento />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  );
}

export default App;
