import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import BottomNav from "./components/common/BottomNav";

// Code-split das paginas: cada uma vira um chunk separado, carregado on-demand.
const Ranking = lazy(() => import("./pages/Ranking"));
const Esportes = lazy(() => import("./pages/Esportes"));
const Configuracao = lazy(() => import("./pages/Configuracao"));
const Chaveamento = lazy(() => import("./pages/Chaveamento"));
const EsporteDetalhe = lazy(() => import("./pages/EsporteDetalhe"));
const JogoDetalhe = lazy(() => import("./pages/JogoDetalhe"));

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-text">
      <main className="flex-1 overflow-auto px-4 pt-6 pb-24">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/ranking" replace />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/esportes" element={<Esportes />} />
            <Route path="/esportes/:esporteId" element={<EsporteDetalhe />} />
            <Route path="/esportes/:esporteId/jogos/:jogoId" element={<JogoDetalhe />} />
            <Route path="/configuracao" element={<Configuracao />} />
            <Route path="/chaveamento" element={<Chaveamento />} />
            <Route path="/chaveamento/:esporteId" element={<Chaveamento />} />
            <Route
              path="*"
              element={
                <div className="flex-1 p-8 text-center">
                  <h1 className="text-2xl font-bold mb-4">404</h1>
                  <p className="text-slate-400">Página não encontrada.</p>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}

export default App;
