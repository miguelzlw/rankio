import { useParams, useNavigate } from 'react-router-dom';
import { useEsportes, useJogos, useTimes } from '../hooks/useDados.js';
import { GitBranch, Settings, ArrowRight } from 'lucide-react';
import BracketMataMata from '../components/chaveamento/BracketMataMata.jsx';
import GrupoTable from '../components/chaveamento/GrupoTable.jsx';
import RodadasColetivo from '../components/chaveamento/RodadasColetivo.jsx';

export default function Chaveamento() {
  const { esporteId } = useParams();
  const navigate = useNavigate();
  const { data: esportes } = useEsportes();
  const { data: jogos } = useJogos();
  const { data: times } = useTimes();

  // Sem esportes criados
  if (esportes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center mb-6">
          <GitBranch size={40} className="text-cyan-400" />
        </div>
        <h1 className="text-xl font-bold mb-2">Sem chaveamentos</h1>
        <p className="text-slate-400 text-sm mb-8 max-w-xs">
          Crie <strong>times</strong> e <strong>esportes</strong> primeiro, depois gere os jogos na aba de Configuração.
        </p>
        <button
          onClick={() => navigate('/configuracao')}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition active:scale-95"
        >
          <Settings size={20} />
          Ir para Configuração
          <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  const esporte = esporteId ? esportes.find((e) => e.id === esporteId) : esportes[0];
  const timesPorId = new Map(times.map((t) => [t.id, t]));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-3">Chaveamento</h1>

      <select
        value={esporte?.id ?? ''}
        onChange={(e) => navigate(`/chaveamento/${e.target.value}`)}
        className="w-full border border-white/20 bg-surface text-text rounded-lg px-3 py-2 mb-4 focus:outline-none focus:border-accent"
      >
        {esportes.map((e) => (
          <option key={e.id} value={e.id}>{e.nome}</option>
        ))}
      </select>

      {esporte && <RenderEsporte esporte={esporte} jogos={jogos} times={times} timesPorId={timesPorId} />}
    </div>
  );
}

function RenderEsporte({ esporte, jogos, times, timesPorId }) {
  const jogosDoEsporte = jogos.filter((j) => j.esporteId === esporte.id);

  if (jogosDoEsporte.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/30 text-center">
        <GitBranch size={32} className="text-slate-500 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">
          Nenhum jogo gerado para <strong>{esporte.nome}</strong>.
        </p>
        <p className="text-slate-500 text-xs mt-1">
          Vá em Configuração → Jogos e gere o chaveamento deste esporte.
        </p>
      </div>
    );
  }

  if (esporte.tipo === 'coletivo') {
    return <RodadasColetivo jogos={jogosDoEsporte} times={times} />;
  }

  if (esporte.formato === 'mata-mata') {
    const mm = jogosDoEsporte.filter((j) => j.fase === 'mata-mata');
    return <BracketMataMata jogos={mm} timesPorId={timesPorId} />;
  }

  if (esporte.formato === 'grupos-mata-mata') {
    const grupos = esporte.config?.grupos || [];
    const mm = jogosDoEsporte.filter((j) => j.fase === 'mata-mata');
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          {grupos.map((g) => (
            <GrupoTable
              key={g.grupoId}
              grupoId={g.grupoId}
              timeIds={g.timeIds}
              esporteId={esporte.id}
              jogos={jogosDoEsporte}
              times={times}
            />
          ))}
        </div>
        {mm.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Mata-mata</h3>
            <BracketMataMata jogos={mm} timesPorId={timesPorId} />
          </div>
        )}
        {mm.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            O mata-mata será gerado após todos os jogos da fase de grupos terminarem.
          </p>
        )}
      </div>
    );
  }

  return null;
}
