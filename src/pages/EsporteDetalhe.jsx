import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEsportes, useJogos, useTimes } from '../hooks/useDados.js';
import Badge from '../components/common/Badge.jsx';
import TimeChip from '../components/common/TimeChip.jsx';
import { classificarGrupo, pontuacaoTimeNoEsporte } from '../services/scoring.js';

export default function EsporteDetalhe() {
  const { esporteId } = useParams();
  const navigate = useNavigate();
  const { data: esportes } = useEsportes();
  const { data: jogos } = useJogos();
  const { data: times } = useTimes();

  const esporte = esportes.find((e) => e.id === esporteId);
  if (!esporte) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  const jogosDoEsporte = jogos
    .filter((j) => j.esporteId === esporteId)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  const timesPorId = new Map(times.map((t) => [t.id, t]));
  const participantes = times.filter((t) => esporte.timesParticipantes?.includes(t.id));

  // Classificacao parcial: pontuacao de cada time NESTE esporte ate agora
  const classificacao = participantes
    .map((t) => ({
      time: t,
      pontos: pontuacaoTimeNoEsporte(t.id, esporteId, jogos),
    }))
    .sort((a, b) => b.pontos - a.pontos);

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 text-sm mb-2"
      >
        <ArrowLeft size={16} /> Voltar
      </button>
      <h1 className="text-2xl font-bold mb-1">{esporte.nome}</h1>
      <p className="text-sm text-slate-500 mb-4">
        {esporte.tipo === '1v1' ? '1 vs 1' : 'Coletivo'}
        {esporte.formato &&
          ' • ' + (esporte.formato === 'mata-mata' ? 'Mata-mata' : 'Grupos + Mata-mata')}
      </p>

      {classificacao.length > 0 && (
        <section className="bg-white rounded-xl p-3 shadow-sm mb-4">
          <h2 className="font-semibold mb-2 text-sm text-slate-700">Classificação parcial</h2>
          <ul>
            {classificacao.map((c, i) => (
              <li
                key={c.time.id}
                className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0"
              >
                <span className="w-6 text-slate-400 text-sm">{i + 1}º</span>
                <TimeChip time={c.time} size="sm" />
                <span
                  className={`ml-auto font-semibold tabular-nums text-sm ${
                    c.pontos < 0 ? 'text-red-600' : ''
                  }`}
                >
                  {c.pontos > 0 ? '+' : ''}
                  {c.pontos}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Jogos</h2>
        {jogosDoEsporte.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum jogo gerado. Vá em Configuração &gt; Gerenciar Jogos.
          </p>
        ) : (
          <ul className="space-y-2">
            {jogosDoEsporte.map((j) => {
              const timeA = timesPorId.get(j.timeAId);
              const timeB = timesPorId.get(j.timeBId);
              return (
                <li key={j.id}>
                  <Link
                    to={`/esportes/${esporteId}/jogos/${j.id}`}
                    className="block bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs text-slate-500">
                        Jogo {j.ordem}
                        {j.fase === 'grupos' && j.grupoId && ` • Grupo ${j.grupoId.replace('G', '')}`}
                        {j.fase === 'mata-mata' && ' • Mata-mata'}
                        {j.fase?.startsWith('rodada-') && ` • Rodada ${j.fase.split('-')[1]}`}
                      </span>
                      <Badge status={j.status} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <TimeChip time={timeA} size="sm" placeholder="A definir" />
                      <span className="font-bold text-slate-700 tabular-nums">
                        {j.pontosTimeA ?? 0} × {j.pontosTimeB ?? 0}
                      </span>
                      <TimeChip time={timeB} size="sm" placeholder="A definir" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
