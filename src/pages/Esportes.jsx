import { Link, useNavigate } from 'react-router-dom';
import { useEsportes, useJogos, useTimes } from '../hooks/useDados.js';
import { Trophy, Users, Gamepad2, Settings, ArrowRight, ChevronRight } from 'lucide-react';

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
    <div className="animate-fade-in">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 via-surface to-surface border border-white/10 p-5 mb-5">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
            <Gamepad2 size={24} className="text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Esportes</h1>
            <p className="text-sm text-slate-400">Toque em um esporte para ver os jogos.</p>
          </div>
        </div>
      </header>

      <ul className="space-y-3">
        {esportes.map((esp) => {
          const jogosDoEsporte = jogos.filter((j) => j.esporteId === esp.id);
          const finalizados = jogosDoEsporte.filter((j) => j.status === 'finalizado').length;
          const total = jogosDoEsporte.length;
          const aoVivo = jogosDoEsporte.some((j) => j.status === 'ao_vivo');
          const pct = total > 0 ? Math.round((finalizados / total) * 100) : 0;
          return (
            <li key={esp.id}>
              <Link
                to={`/esportes/${esp.id}`}
                className="group block relative overflow-hidden rounded-2xl bg-surface/60 border border-white/10 hover:border-accent/40 transition active:scale-[0.99]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-accent/0 group-hover:from-primary/10 group-hover:to-accent/10 transition" />

                <div className="relative p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    {esp.tipo === '1v1' ? (
                      <Trophy size={20} className="text-accent" />
                    ) : (
                      <Users size={20} className="text-accent" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-text truncate">{esp.nome}</h2>
                      {aoVivo && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                          Ao vivo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {esp.tipo === '1v1' ? '1 vs 1' : 'Coletivo'}
                      {esp.formato && ' • ' + (esp.formato === 'mata-mata' ? 'Mata-mata' : 'Grupos + MM')}
                    </p>

                    {total > 0 ? (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 tabular-nums">
                          {finalizados}/{total}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-2 italic">
                        Nenhum jogo gerado ainda
                      </p>
                    )}
                  </div>

                  <ChevronRight
                    size={20}
                    className="text-slate-500 group-hover:text-accent group-hover:translate-x-0.5 transition flex-shrink-0"
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
