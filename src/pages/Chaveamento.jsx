import { useParams, useNavigate } from 'react-router-dom';
import { useEsportes, useJogos, useTimes } from '../hooks/useDados.js';
import BracketMataMata from '../components/chaveamento/BracketMataMata.jsx';
import GrupoTable from '../components/chaveamento/GrupoTable.jsx';
import RodadasColetivo from '../components/chaveamento/RodadasColetivo.jsx';

export default function Chaveamento() {
  const { esporteId } = useParams();
  const navigate = useNavigate();
  const { data: esportes } = useEsportes();
  const { data: jogos } = useJogos();
  const { data: times } = useTimes();

  const esporte = esporteId ? esportes.find((e) => e.id === esporteId) : esportes[0];
  const timesPorId = new Map(times.map((t) => [t.id, t]));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-3">Chaveamento</h1>

      {esportes.length === 0 ? (
        <p className="text-sm text-slate-500">Crie um esporte primeiro.</p>
      ) : (
        <>
          <select
            value={esporte?.id ?? ''}
            onChange={(e) => navigate(`/chaveamento/${e.target.value}`)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-4 bg-white"
          >
            {esportes.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>

          {esporte && <RenderEsporte esporte={esporte} jogos={jogos} times={times} timesPorId={timesPorId} />}
        </>
      )}
    </div>
  );
}

function RenderEsporte({ esporte, jogos, times, timesPorId }) {
  const jogosDoEsporte = jogos.filter((j) => j.esporteId === esporte.id);
  if (jogosDoEsporte.length === 0) {
    return <p className="text-sm text-slate-500">Nenhum jogo gerado ainda.</p>;
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
