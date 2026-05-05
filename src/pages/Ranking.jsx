import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRanking } from '../hooks/useDados.js';
import { Trophy, Settings, ArrowRight } from 'lucide-react';
import Modal from '../components/common/Modal.jsx';

export default function Ranking() {
  const { ranking, esportes, times, loading } = useRanking();
  const [selecionado, setSelecionado] = useState(null);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Estado vazio: nenhum time criado
  if (!times || times.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
          <Trophy size={40} className="text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Bem-vindo ao Rankio!</h1>
        <p className="text-slate-400 mb-1">
          Seu torneio ainda está vazio.
        </p>
        <p className="text-slate-500 text-sm mb-8 max-w-xs">
          Para começar, crie os <strong>times</strong> que vão participar e depois adicione os <strong>esportes</strong> do torneio.
        </p>
        <button
          onClick={() => navigate('/configuracao')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-500/20 transition active:scale-95"
        >
          <Settings size={20} />
          Ir para Configuração
          <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  // Estado vazio: times existem mas nenhum jogo finalizado
  if (ranking.length > 0 && ranking.every(r => r.total === 0)) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Ranking</h1>
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
          <p className="text-sm text-slate-400 text-center">
            ⏳ Nenhum jogo finalizado ainda. O ranking será atualizado automaticamente conforme os jogos forem sendo concluídos.
          </p>
        </div>
        <ul className="space-y-2">
          {ranking.map((item, idx) => (
            <li key={item.time.id}>
              <div className="w-full flex items-center gap-3 bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
                <span className="w-8 text-center font-bold text-slate-500">{idx + 1}º</span>
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.time.cor }}
                />
                <span className="flex-1 font-medium text-slate-300">{item.time.nome}</span>
                <span className="font-bold text-lg tabular-nums text-slate-500">0</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Ranking</h1>

      <ul className="space-y-2">
        {ranking.map((item, idx) => (
          <li key={item.time.id}>
            <button
              onClick={() => setSelecionado(item)}
              className="w-full flex items-center gap-3 bg-slate-800/50 rounded-xl p-3 border border-slate-700/30 hover:border-blue-500/40 hover:bg-slate-800/70 transition text-left active:scale-[0.98]"
            >
              <span className="w-8 text-center font-bold text-slate-400">{idx + 1}º</span>
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.time.cor }}
              />
              <span className="flex-1 font-medium">{item.time.nome}</span>
              <span
                className={`font-bold text-lg tabular-nums ${
                  item.total < 0 ? 'text-red-400' : 'text-emerald-400'
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
            <div className="flex items-center gap-3 pb-3 border-b border-slate-700/50">
              <span
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: selecionado.time.cor }}
              />
              <div className="flex-1">
                <div className="text-xs text-slate-400">Pontuação total</div>
                <div
                  className={`text-2xl font-bold tabular-nums ${
                    selecionado.total < 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {selecionado.total > 0 ? '+' : ''}
                  {selecionado.total}
                </div>
              </div>
            </div>
            {esportes.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum esporte cadastrado.</p>
            ) : (
              <ul className="space-y-2">
                {esportes.map((esp) => {
                  const pts = selecionado.breakdown[esp.id] ?? 0;
                  return (
                    <li
                      key={esp.id}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="text-slate-300">{esp.nome}</span>
                      <span
                        className={`font-semibold tabular-nums ${
                          pts < 0 ? 'text-red-400' : pts === 0 ? 'text-slate-500' : 'text-emerald-400'
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
