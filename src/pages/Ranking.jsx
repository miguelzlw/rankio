import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRanking } from '../hooks/useDados.js';
import { Trophy, Settings, ArrowRight, Crown, Medal, Award, ChevronDown, Swords, X } from 'lucide-react';

export default function Ranking() {
  const { ranking, esportes, jogos, times, loading, error } = useRanking();
  const [expandido, setExpandido] = useState(null);
  const navigate = useNavigate();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
          <X size={32} className="text-red-400" />
        </div>
        <h1 className="text-xl font-bold mb-2">Erro de conexão</h1>
        <p className="text-slate-400 text-sm">
          Não foi possível conectar ao banco de dados.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!times || times.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30 flex items-center justify-center mb-6 animate-pulse-glow">
          <Trophy size={44} className="text-accent" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Bem-vindo ao Rankio!</h1>
        <p className="text-slate-400 mb-1">Seu torneio ainda está vazio.</p>
        <p className="text-slate-500 text-sm mb-8 max-w-xs">
          Comece criando os <strong>times</strong> e <strong>esportes</strong>.
        </p>
        <button
          onClick={() => navigate('/configuracao')}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-primary/30 transition active:scale-95"
        >
          <Settings size={20} />
          Configurar
          <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  const semPontos = ranking.length > 0 && ranking.every((r) => r.total === 0);

  return (
    <div className="animate-fade-in">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/40 via-primary/10 to-surface border border-white/10 p-5 mb-5">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center shadow-lg shadow-accent/10">
              <Trophy size={24} className="text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Ranking</h1>
              <p className="text-sm text-slate-400">
                {semPontos ? 'Aguardando primeiros jogos' : 'Classificação geral do torneio'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {semPontos && (
        <div className="bg-surface/50 rounded-xl p-4 mb-4 border border-white/10 text-center">
          <p className="text-sm text-slate-400">
            Nenhum jogo finalizado ainda. O ranking se atualiza em tempo real.
          </p>
        </div>
      )}

      <ul className="space-y-2.5">
        {ranking.map((item, idx) => {
          const aberto = expandido === item.time.id;
          return (
            <li key={item.time.id}>
              <TimeRankCard
                item={item}
                idx={idx}
                aberto={aberto}
                onToggle={() => setExpandido(aberto ? null : item.time.id)}
                esportes={esportes}
                jogos={jogos}
                semPontos={semPontos}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TimeRankCard({ item, idx, aberto, onToggle, esportes, jogos, semPontos }) {
  const stats = useMemo(() => calcularStats(item.time.id, jogos), [item.time.id, jogos]);
  const eDestaque = idx < 3 && !semPontos && item.total > 0;
  const corTime = item.time.cor || '#94a3b8';

  return (
    <div
      className={`relative rounded-2xl border transition-all overflow-hidden ${
        aberto
          ? 'border-accent/50 bg-surface shadow-lg shadow-accent/10'
          : 'border-white/10 bg-surface/50 hover:border-white/25'
      }`}
    >
      {eDestaque && idx === 0 && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent" />
      )}

      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3.5 text-left active:scale-[0.99] transition"
      >
        <PosicaoBadge idx={idx} destaque={eDestaque} />

        <div
          className="w-10 h-10 rounded-xl flex-shrink-0 shadow-md ring-2 ring-white/10"
          style={{
            backgroundColor: corTime,
            boxShadow: `0 4px 12px -2px ${corTime}55`,
          }}
        />

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text truncate">{item.time.nome}</p>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span className="inline-flex items-center gap-1">
              <Trophy size={11} className="text-emerald-400" />
              {stats.vitorias}V
            </span>
            <span className="inline-flex items-center gap-1">
              <Swords size={11} className="text-slate-500" />
              {stats.jogosDisputados} jogos
            </span>
          </div>
        </div>

        <div className="text-right flex items-center gap-2">
          <div>
            <div
              className={`font-bold text-xl tabular-nums leading-none ${
                item.total < 0 ? 'text-red-400' : item.total === 0 ? 'text-slate-500' : 'text-accent'
              }`}
            >
              {item.total > 0 ? '+' : ''}
              {item.total}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">pontos</div>
          </div>
          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform ${aberto ? 'rotate-180 text-accent' : ''}`}
          />
        </div>
      </button>

      {aberto && (
        <div className="border-t border-white/10 p-4 bg-background/30 animate-expand">
          <DetalheTime time={item.time} stats={stats} esportes={esportes} jogos={jogos} />
        </div>
      )}
    </div>
  );
}

function PosicaoBadge({ idx, destaque }) {
  if (destaque) {
    const Icon = idx === 0 ? Crown : idx === 1 ? Medal : Award;
    const cores = idx === 0
      ? 'from-accent to-yellow-600 text-background shadow-accent/40'
      : idx === 1
      ? 'from-slate-300 to-slate-500 text-background shadow-slate-400/30'
      : 'from-amber-700 to-amber-900 text-white shadow-amber-700/30';
    return (
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cores} flex items-center justify-center font-bold text-sm shadow-lg flex-shrink-0`}>
        <Icon size={16} strokeWidth={2.5} />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center font-bold text-sm flex-shrink-0 tabular-nums">
      {idx + 1}
    </div>
  );
}

function DetalheTime({ time, stats, esportes, jogos }) {
  const aproveitamento = stats.jogosDisputados > 0
    ? Math.round((stats.vitorias / stats.jogosDisputados) * 100)
    : 0;

  const vitoriasPorEsporte = useMemo(() => {
    const mapa = new Map();
    for (const e of esportes) mapa.set(e.id, { esporte: e, vitorias: 0, jogos: 0 });
    for (const j of jogos) {
      if (j.status !== 'finalizado') continue;
      if (j.timeAId !== time.id && j.timeBId !== time.id) continue;
      const slot = mapa.get(j.esporteId);
      if (!slot) continue;
      slot.jogos += 1;
      if (j.vencedor === time.id) slot.vitorias += 1;
    }
    return Array.from(mapa.values()).filter((s) => s.jogos > 0);
  }, [time.id, esportes, jogos]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Vitórias" valor={stats.vitorias} cor="text-emerald-400" />
        <StatCard label="Derrotas" valor={stats.derrotas} cor="text-red-400" />
        <StatCard label="Aproveitamento" valor={`${aproveitamento}%`} cor="text-accent" />
      </div>

      {vitoriasPorEsporte.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 px-1">
            Por esporte
          </p>
          <ul className="space-y-1.5">
            {vitoriasPorEsporte.map((s) => (
              <li
                key={s.esporte.id}
                className="flex items-center gap-3 bg-surface/60 border border-white/5 rounded-lg px-3 py-2"
              >
                <span className="flex-1 text-sm truncate">{s.esporte.nome}</span>
                <span className="text-xs text-slate-400 tabular-nums">
                  {s.vitorias}V / {s.jogos}J
                </span>
                <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-accent transition-all"
                    style={{ width: `${(s.vitorias / s.jogos) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {vitoriasPorEsporte.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-2">
          Nenhum jogo finalizado ainda.
        </p>
      )}
    </div>
  );
}

function StatCard({ label, valor, cor }) {
  return (
    <div className="bg-surface/60 border border-white/10 rounded-xl px-3 py-2.5 text-center">
      <div className={`text-xl font-bold tabular-nums leading-none ${cor}`}>{valor}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function calcularStats(timeId, jogos) {
  let vitorias = 0;
  let derrotas = 0;
  let empates = 0;
  let jogosDisputados = 0;
  for (const j of jogos || []) {
    if (j.status !== 'finalizado') continue;
    if (j.timeAId !== timeId && j.timeBId !== timeId) continue;
    jogosDisputados += 1;
    if (!j.vencedor) empates += 1;
    else if (j.vencedor === timeId) vitorias += 1;
    else derrotas += 1;
  }
  return { vitorias, derrotas, empates, jogosDisputados };
}
