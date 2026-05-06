import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEsportes, useJogos, useTimes } from '../hooks/useDados.js';
import { ChevronDown, Wand2, Radio, Calendar, CheckCircle2 } from 'lucide-react';
import Badge from '../components/common/Badge.jsx';
import TimeChip from '../components/common/TimeChip.jsx';
import BackButton from '../components/common/BackButton.jsx';
import { useToast } from '../components/common/ToastProvider.jsx';
import { pontuacaoTimeNoEsporte } from '../services/scoring.js';
import { gerarMataMataAposGrupos, podeGerarMataMata } from '../services/firestore.js';

export default function EsporteDetalhe() {
  const { esporteId } = useParams();
  const { data: esportes } = useEsportes();
  const { data: jogos } = useJogos();
  const { data: times } = useTimes();
  const [finalizadosAbertos, setFinalizadosAbertos] = useState(false);
  const [gerandoMM, setGerandoMM] = useState(false);
  const toast = useToast();

  const esporte = esportes.find((e) => e.id === esporteId);
  if (!esporte) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  const jogosDoEsporte = jogos
    .filter((j) => j.esporteId === esporteId)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  const timesPorId = new Map(times.map((t) => [t.id, t]));
  const participantes = times.filter((t) => esporte.timesParticipantes?.includes(t.id));

  const classificacao = participantes
    .map((t) => ({
      time: t,
      pontos: pontuacaoTimeNoEsporte(t.id, esporteId, jogos),
    }))
    .sort((a, b) => b.pontos - a.pontos);

  const aoVivo = jogosDoEsporte.filter((j) => j.status === 'ao_vivo');
  const agendados = jogosDoEsporte.filter((j) => j.status === 'agendado');
  const finalizados = jogosDoEsporte.filter((j) => j.status === 'finalizado');

  const podeMM = podeGerarMataMata(esporte, jogosDoEsporte);

  async function handleGerarMM() {
    setGerandoMM(true);
    try {
      const r = await gerarMataMataAposGrupos(esporte, jogos, times);
      if (r.ok) {
        toast.success(`Mata-mata gerado com ${r.criados} jogo(s)!`);
      } else {
        toast.error('Não foi possível gerar o mata-mata.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar mata-mata.');
    } finally {
      setGerandoMM(false);
    }
  }

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

      {/* Botão para gerar mata-mata pos grupos */}
      {podeMM && (
        <div className="bg-gradient-to-br from-accent/15 to-primary/15 border border-accent/40 rounded-2xl p-4 animate-pulse-glow">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center flex-shrink-0">
              <Wand2 size={18} className="text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text mb-0.5">Fase de grupos finalizada!</h3>
              <p className="text-xs text-slate-400 mb-3">
                Pronto pra gerar o chaveamento do mata-mata com os classificados.
              </p>
              <button
                onClick={handleGerarMM}
                disabled={gerandoMM}
                className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-60 text-background font-bold px-4 py-2 rounded-lg shadow-lg shadow-accent/20 transition active:scale-95 text-sm"
              >
                <Wand2 size={16} />
                {gerandoMM ? 'Gerando...' : 'Gerar mata-mata'}
              </button>
            </div>
          </div>
        </div>
      )}

      {classificacao.length > 0 && classificacao.some((c) => c.pontos !== 0) && (
        <section className="bg-surface/50 border border-white/10 rounded-2xl p-3">
          <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 px-1">
            Classificação parcial
          </h2>
          <ul>
            {classificacao.map((c, i) => (
              <li
                key={c.time.id}
                className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0"
              >
                <span className="w-6 text-slate-400 text-sm font-semibold">{i + 1}º</span>
                <TimeChip time={c.time} size="sm" />
                <span
                  className={`ml-auto font-semibold tabular-nums text-sm ${
                    c.pontos < 0 ? 'text-red-400' : c.pontos > 0 ? 'text-accent' : 'text-slate-500'
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

      {jogosDoEsporte.length === 0 && (
        <div className="bg-surface/50 rounded-2xl p-6 border border-white/10 text-center">
          <p className="text-sm text-slate-400">
            Nenhum jogo gerado. Vá em Configuração &gt; Jogos.
          </p>
        </div>
      )}

      {aoVivo.length > 0 && (
        <SecaoJogos
          titulo="Ao vivo"
          icone={<Radio size={14} className="text-red-400" />}
          jogos={aoVivo}
          esporteId={esporteId}
          timesPorId={timesPorId}
          destaque
        />
      )}

      {agendados.length > 0 && (
        <SecaoJogos
          titulo="Próximos"
          icone={<Calendar size={14} className="text-slate-400" />}
          jogos={agendados}
          esporteId={esporteId}
          timesPorId={timesPorId}
        />
      )}

      {finalizados.length > 0 && (
        <section>
          <button
            onClick={() => setFinalizadosAbertos(!finalizadosAbertos)}
            className="w-full flex items-center justify-between mb-2 px-1 py-1 text-xs uppercase tracking-wider text-slate-500 font-semibold hover:text-slate-300 transition"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              Finalizados ({finalizados.length})
            </span>
            <ChevronDown
              size={16}
              className={`transition-transform ${finalizadosAbertos ? 'rotate-180' : ''}`}
            />
          </button>
          {finalizadosAbertos && (
            <ul className="space-y-2 animate-expand">
              {finalizados.map((j) => (
                <CardJogo
                  key={j.id}
                  jogo={j}
                  esporteId={esporteId}
                  timesPorId={timesPorId}
                  apagado
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function SecaoJogos({ titulo, icone, jogos, esporteId, timesPorId, destaque }) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 px-1 flex items-center gap-1.5">
        {icone}
        {titulo} ({jogos.length})
      </h2>
      <ul className="space-y-2">
        {jogos.map((j) => (
          <CardJogo
            key={j.id}
            jogo={j}
            esporteId={esporteId}
            timesPorId={timesPorId}
            destaque={destaque}
          />
        ))}
      </ul>
    </section>
  );
}

function CardJogo({ jogo, esporteId, timesPorId, destaque, apagado }) {
  const timeA = timesPorId.get(jogo.timeAId);
  const timeB = timesPorId.get(jogo.timeBId);
  const placarA = jogo.placarTimeA ?? 0;
  const placarB = jogo.placarTimeB ?? 0;

  return (
    <li>
      <Link
        to={`/esportes/${esporteId}/jogos/${jogo.id}`}
        className={`block rounded-xl p-3 transition border ${
          destaque
            ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/60'
            : apagado
              ? 'bg-surface/30 border-white/5 hover:border-white/15 opacity-75 hover:opacity-100'
              : 'bg-surface/50 border-white/10 hover:border-accent/40 hover:bg-surface/70'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs text-slate-400">
            Jogo {jogo.ordem}
            {jogo.fase === 'grupos' && jogo.grupoId && ` • Grupo ${jogo.grupoId.replace('G', '')}`}
            {jogo.fase === 'mata-mata' && ' • Mata-mata'}
            {jogo.fase?.startsWith('rodada-') && ` • Rodada ${jogo.fase.split('-')[1]}`}
          </span>
          <Badge status={jogo.status} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <TimeChip time={timeA} size="sm" placeholder="A definir" />
          <span className="font-bold text-text tabular-nums text-base">
            {placarA} <span className="text-slate-500 mx-0.5">×</span> {placarB}
          </span>
          <TimeChip time={timeB} size="sm" placeholder="A definir" />
        </div>
      </Link>
    </li>
  );
}
