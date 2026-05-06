import { Link, useParams } from 'react-router-dom';
import { useEsportes, useJogos, useTimes } from '../hooks/useDados.js';
import Badge from '../components/common/Badge.jsx';
import TimeChip from '../components/common/TimeChip.jsx';
import BackButton from '../components/common/BackButton.jsx';
import { pontuacaoTimeNoEsporte } from '../services/scoring.js';

export default function EsporteDetalhe() {
  const { esporteId } = useParams();
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
    <div className="animate-fade-in space-y-4">
      <BackButton label="Esportes" />

      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 via-surface to-surface border border-white/10 p-5">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight mb-1">{esporte.nome}</h1>
          <p className="text-sm text-slate-400">
            {esporte.tipo === '1v1' ? '1 vs 1' : 'Coletivo'}
            {esporte.formato &&
              ' • ' + (esporte.formato === 'mata-mata' ? 'Mata-mata' : 'Grupos + Mata-mata')}
          </p>
        </div>
      </header>

      {classificacao.length > 0 && (
        <section className="bg-surface/50 border border-white/10 rounded-xl p-3 mb-4">
          <h2 className="font-semibold mb-2 text-sm text-slate-300">Classificação parcial</h2>
          <ul>
            {classificacao.map((c, i) => (
              <li
                key={c.time.id}
                className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0"
              >
                <span className="w-6 text-slate-400 text-sm">{i + 1}º</span>
                <TimeChip time={c.time} size="sm" />
                <span
                  className={`ml-auto font-semibold tabular-nums text-sm ${
                    c.pontos < 0 ? 'text-red-400' : 'text-text'
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
          <p className="text-sm text-slate-400">
            Nenhum jogo gerado. Vá em Configuração &gt; Jogos.
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
                    className="block bg-surface/50 border border-white/10 rounded-xl p-3 hover:border-accent/40 hover:bg-surface/70 transition"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs text-slate-400">
                        Jogo {j.ordem}
                        {j.fase === 'grupos' && j.grupoId && ` • Grupo ${j.grupoId.replace('G', '')}`}
                        {j.fase === 'mata-mata' && ' • Mata-mata'}
                        {j.fase?.startsWith('rodada-') && ` • Rodada ${j.fase.split('-')[1]}`}
                      </span>
                      <Badge status={j.status} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <TimeChip time={timeA} size="sm" placeholder="A definir" />
                      <span className="font-bold text-text tabular-nums">
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
