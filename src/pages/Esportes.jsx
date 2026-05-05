import { Link } from 'react-router-dom';
import { useEsportes, useJogos } from '../hooks/useDados.js';
import { Trophy, Users } from 'lucide-react';

export default function Esportes() {
  const { data: esportes, loading: le } = useEsportes();
  const { data: jogos, loading: lj } = useJogos();

  if (le || lj) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Esportes</h1>

      {esportes.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p>Nenhum esporte cadastrado.</p>
          <p className="text-sm mt-1">Crie esportes em Configuração.</p>
        </div>
      )}

      <ul className="space-y-3">
        {esportes.map((esp) => {
          const jogosDoEsporte = jogos.filter((j) => j.esporteId === esp.id);
          const finalizados = jogosDoEsporte.filter((j) => j.status === 'finalizado').length;
          const total = jogosDoEsporte.length;
          return (
            <li key={esp.id}>
              <Link
                to={`/esportes/${esp.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h2 className="font-semibold text-lg">{esp.nome}</h2>
                    <div className="flex gap-3 text-xs text-slate-500 mt-1">
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
                    <div className="text-sm font-medium text-slate-900">
                      {finalizados}/{total}
                    </div>
                    <div className="text-xs text-slate-400">jogos</div>
                  </div>
                </div>
                {total > 0 && (
                  <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(finalizados / total) * 100}%` }}
                    />
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
