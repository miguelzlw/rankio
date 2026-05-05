import { useState } from 'react';
import { useRanking } from '../hooks/useDados.js';
import Modal from '../components/common/Modal.jsx';

export default function Ranking() {
  const { ranking, esportes, loading } = useRanking();
  const [selecionado, setSelecionado] = useState(null);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Ranking</h1>

      {loading && <p className="text-slate-500">Carregando...</p>}

      {!loading && ranking.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p>Nenhum time cadastrado ainda.</p>
          <p className="text-sm mt-1">Vá em Configuração para começar.</p>
        </div>
      )}

      <ul className="space-y-2">
        {ranking.map((item, idx) => (
          <li key={item.time.id}>
            <button
              onClick={() => setSelecionado(item)}
              className="w-full flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition text-left"
            >
              <span className="w-8 text-center font-bold text-slate-400">{idx + 1}º</span>
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.time.cor }}
              />
              <span className="flex-1 font-medium">{item.time.nome}</span>
              <span
                className={`font-bold text-lg tabular-nums ${
                  item.total < 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {item.total > 0 ? '+' : ''}
                {item.total}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Modal
        open={!!selecionado}
        onClose={() => setSelecionado(null)}
        title={selecionado?.time.nome}
      >
        {selecionado && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <span
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: selecionado.time.cor }}
              />
              <div className="flex-1">
                <div className="text-xs text-slate-500">Pontuação total</div>
                <div
                  className={`text-2xl font-bold tabular-nums ${
                    selecionado.total < 0 ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  {selecionado.total > 0 ? '+' : ''}
                  {selecionado.total}
                </div>
              </div>
            </div>
            {esportes.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum esporte cadastrado.</p>
            ) : (
              <ul className="space-y-2">
                {esportes.map((esp) => {
                  const pts = selecionado.breakdown[esp.id] ?? 0;
                  return (
                    <li
                      key={esp.id}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="text-slate-700">{esp.nome}</span>
                      <span
                        className={`font-semibold tabular-nums ${
                          pts < 0 ? 'text-red-600' : pts === 0 ? 'text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {pts > 0 ? '+' : ''}
                        {pts}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
