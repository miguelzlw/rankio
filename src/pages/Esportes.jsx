import { Link, useNavigate } from 'react-router-dom';
import { useEsportes, useJogos, useTimes } from '../hooks/useDados.js';
import { Trophy, Users, Gamepad2, Settings, ArrowRight } from 'lucide-react';

export default function Esportes() {
  const { data: esportes, loading: le, error: ee } = useEsportes();
  const { data: jogos, loading: lj, error: ej } = useJogos();
  const { data: times, loading: lt, error: et } = useTimes();
  const navigate = useNavigate();

  const error = ee || ej || et;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <span className="text-red-500 text-2xl">⚠️</span>
        </div>
        <h1 className="text-xl font-bold mb-2">Erro de conexão</h1>
        <p className="text-slate-400 text-sm">
          Não foi possível conectar ao banco de dados. Verifique as configurações.
        </p>
      </div>
    );
  }

  if (le || lj || lt) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Sem times criados
  if (!times || times.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-6">
          <Users size={40} className="text-purple-400" />
        </div>
        <h1 className="text-xl font-bold mb-2">Nenhum time criado</h1>
        <p className="text-slate-400 text-sm mb-8 max-w-xs">
          Antes de criar esportes, você precisa cadastrar pelo menos <strong>2 times</strong> na configuração.
        </p>
        <button
          onClick={() => navigate('/configuracao')}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-purple-500/20 transition active:scale-95"
        >
          <Settings size={20} />
          Criar times
          <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  // Times existem mas sem esportes
  if (esportes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
          <Gamepad2 size={40} className="text-amber-400" />
        </div>
        <h1 className="text-xl font-bold mb-2">Nenhum esporte criado</h1>
        <p className="text-slate-400 text-sm mb-2">
          Você já tem <strong>{times.length} time{times.length > 1 ? 's' : ''}</strong> cadastrado{times.length > 1 ? 's' : ''}! 🎉
        </p>
        <p className="text-slate-500 text-sm mb-8 max-w-xs">
          Agora crie os esportes/brincadeiras do torneio com suas regras de pontuação.
        </p>
        <button
          onClick={() => navigate('/configuracao')}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95"
        >
          <Settings size={20} />
          Criar esportes
          <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Esportes</h1>

      <ul className="space-y-3">
        {esportes.map((esp) => {
          const jogosDoEsporte = jogos.filter((j) => j.esporteId === esp.id);
          const finalizados = jogosDoEsporte.filter((j) => j.status === 'finalizado').length;
          const total = jogosDoEsporte.length;
          return (
            <li key={esp.id}>
              <Link
                to={`/esportes/${esp.id}`}
                className="block bg-slate-800/50 rounded-xl p-4 border border-slate-700/30 hover:border-blue-500/40 hover:bg-slate-800/70 transition active:scale-[0.98]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h2 className="font-semibold text-lg">{esp.nome}</h2>
                    <div className="flex gap-3 text-xs text-slate-400 mt-1">
                      <span className="inline-flex items-center gap-1">
                        {esp.tipo === '1v1' ? <Trophy size={14} /> : <Users size={14} />}
                        {esp.tipo === '1v1' ? '1 vs 1' : 'Coletivo'}
                      </span>
                      {esp.formato && (
                        <span>
                          {esp.formato === 'mata-mata' ? 'Mata-mata' : 'Grupos + Mata-mata'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {finalizados}/{total}
                    </div>
                    <div className="text-xs text-slate-500">jogos</div>
                  </div>
                </div>
                {total > 0 && (
                  <div className="mt-3 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${(finalizados / total) * 100}%` }}
                    />
                  </div>
                )}
                {total === 0 && (
                  <p className="text-xs text-slate-500 mt-3">
                    Nenhum jogo gerado. Gere o chaveamento na aba Config → Jogos.
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
