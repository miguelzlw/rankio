import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRanking } from '../hooks/useDados.js';
import { Trophy, Settings, ArrowRight, Crown, Medal, Award, Swords, X } from 'lucide-react';
import Modal from '../components/common/Modal.jsx';

export default function Ranking() {
  const { ranking, esportes, jogos, times, loading, error } = useRanking();
  const [selecionado, setSelecionado] = useState(null);
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
  const podio = ranking.slice(0, 3);
  const restante = ranking.slice(3);
  // Pra o podio nao ficar feio com poucos times
  const mostrarPodio = !semPontos && ranking.length >= 1 && ranking[0].total > 0;

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

      {/* Podio Olimpico (top 3) */}
      {mostrarPodio && (
        <Podio podio={podio} jogos={jogos} onSelect={setSelecionado} />
      )}

      {/* Lista normal: 4o em diante (se tiver podio) ou todos (sem podio) */}
      {(restante.length > 0 || !mostrarPodio) && (
        <ul className="space-y-2">
          {(mostrarPodio ? restante : ranking).map((item, i) => {
            const idx = mostrarPodio ? i + 3 : i;
            return (
              <li key={item.time.id}>
                <CardRankingNormal
                  item={item}
                  idx={idx}
                  jogos={jogos}
                  onSelect={() => setSelecionado(item)}
                />
              </li>
            );
          })}
        </ul>
      )}

      <ModalDetalhes
        item={selecionado}
        onClose={() => setSelecionado(null)}
        esportes={esportes}
        jogos={jogos}
      />
    </div>
  );
}

// =============== PODIO ===============

function Podio({ podio, jogos, onSelect }) {
  // Reordena pra exibir 2-1-3 visualmente (pódio Olímpico clássico)
  const segundo = podio[1];
  const primeiro = podio[0];
  const terceiro = podio[2];

  return (
    <section
      className="relative rounded-2xl border border-white/10 p-4 mb-4 overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at top, rgba(234,179,8,0.15) 0%, transparent 70%), linear-gradient(180deg, hsl(350 40% 18%) 0%, hsl(350 40% 14%) 100%)',
      }}
    >
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative flex items-end justify-center gap-2 pt-2">
        {segundo ? (
          <DegrauPodio item={segundo} pos={2} jogos={jogos} onClick={() => onSelect(segundo)} />
        ) : (
          <div className="flex-1 max-w-[28%]" />
        )}
        {primeiro && (
          <DegrauPodio item={primeiro} pos={1} jogos={jogos} onClick={() => onSelect(primeiro)} />
        )}
        {terceiro ? (
          <DegrauPodio item={terceiro} pos={3} jogos={jogos} onClick={() => onSelect(terceiro)} />
        ) : (
          <div className="flex-1 max-w-[28%]" />
        )}
      </div>
    </section>
  );
}

const POS_CONFIG = {
  1: {
    Icon: Crown,
    iconSize: 22,
    avatarSize: 'w-20 h-20',
    base: 'h-32',
    cores: 'from-accent/40 to-yellow-600/30 border-accent/60',
    label: 'text-accent',
    glow: 'shadow-[0_0_24px_rgba(234,179,8,0.35)]',
  },
  2: {
    Icon: Medal,
    iconSize: 18,
    avatarSize: 'w-16 h-16',
    base: 'h-24',
    cores: 'from-slate-400/30 to-slate-600/20 border-slate-300/40',
    label: 'text-slate-200',
    glow: 'shadow-[0_0_18px_rgba(203,213,225,0.2)]',
  },
  3: {
    Icon: Award,
    iconSize: 16,
    avatarSize: 'w-14 h-14',
    base: 'h-20',
    cores: 'from-amber-700/30 to-amber-900/20 border-amber-600/40',
    label: 'text-amber-400',
    glow: 'shadow-[0_0_14px_rgba(180,83,9,0.25)]',
  },
};

function DegrauPodio({ item, pos, jogos, onClick }) {
  const cfg = POS_CONFIG[pos];
  const cor = item.time.cor || '#94a3b8';
  const stats = useMemo(() => calcularStats(item.time.id, jogos), [item.time.id, jogos]);

  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1.5 group min-w-0 max-w-[33%]"
    >
      {/* Avatar com coroa por cima */}
      <div className="relative">
        <div
          className={`${cfg.avatarSize} rounded-2xl ring-4 ring-white/10 ${cfg.glow} group-active:scale-95 transition`}
          style={{ backgroundColor: cor }}
        />
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${cfg.label}`}>
          <cfg.Icon size={cfg.iconSize} strokeWidth={2.5} />
        </div>
      </div>

      {/* Nome + pontos */}
      <p className={`text-xs font-bold ${cfg.label} mt-1 text-center w-full truncate px-1`}>
        {item.time.nome}
      </p>
      <p className="text-[10px] text-slate-500 truncate w-full px-1">
        {stats.vitorias}V · {stats.jogosDisputados}J
      </p>

      {/* Degrau do podio */}
      <div
        className={`w-full ${cfg.base} rounded-t-xl bg-gradient-to-b ${cfg.cores} border-x border-t flex flex-col items-center justify-center mt-1`}
      >
        <span className={`text-3xl font-black tabular-nums ${cfg.label} leading-none`}>
          {pos}º
        </span>
        <span className={`text-base font-bold tabular-nums ${item.total < 0 ? 'text-red-400' : cfg.label} mt-1`}>
          {item.total > 0 ? '+' : ''}
          {item.total}
        </span>
        <span className="text-[9px] uppercase tracking-wider text-slate-500 mt-0.5">pts</span>
      </div>
    </button>
  );
}

// =============== LISTA NORMAL ===============

function CardRankingNormal({ item, idx, jogos, onSelect }) {
  const stats = useMemo(() => calcularStats(item.time.id, jogos), [item.time.id, jogos]);
  const corTime = item.time.cor || '#94a3b8';

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-3 bg-surface/50 border border-white/10 hover:border-white/25 rounded-xl text-left active:scale-[0.99] transition"
    >
      <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center font-bold text-sm flex-shrink-0 tabular-nums">
        {idx + 1}
      </span>
      <span
        className="w-9 h-9 rounded-lg flex-shrink-0 ring-2 ring-white/10"
        style={{
          backgroundColor: corTime,
          boxShadow: `0 4px 10px -2px ${corTime}55`,
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
      <div className="text-right">
        <div
          className={`font-bold text-lg tabular-nums leading-none ${
            item.total < 0 ? 'text-red-400' : item.total === 0 ? 'text-slate-500' : 'text-accent'
          }`}
        >
          {item.total > 0 ? '+' : ''}
          {item.total}
        </div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">pts</div>
      </div>
    </button>
  );
}

// =============== MODAL DE DETALHES ===============

function ModalDetalhes({ item, onClose, esportes, jogos }) {
  if (!item) return null;
  const stats = calcularStats(item.time.id, jogos);
  const aproveitamento = stats.jogosDisputados > 0
    ? Math.round((stats.vitorias / stats.jogosDisputados) * 100)
    : 0;
  const cor = item.time.cor || '#94a3b8';

  const vitoriasPorEsporte = esportes
    .map((e) => {
      let vitorias = 0;
      let totalJogos = 0;
      for (const j of jogos) {
        if (j.esporteId !== e.id || j.status !== 'finalizado') continue;
        if (j.timeAId !== item.time.id && j.timeBId !== item.time.id) continue;
        totalJogos += 1;
        if (j.vencedor === item.time.id) vitorias += 1;
      }
      return { esporte: e, vitorias, jogos: totalJogos };
    })
    .filter((s) => s.jogos > 0);

  return (
    <Modal open={!!item} onClose={onClose} title={item.time.nome}>
      <div className="space-y-4">
        {/* Header com cor + total */}
        <div
          className="rounded-xl p-4 text-white relative overflow-hidden"
          style={{
            backgroundColor: cor,
            boxShadow: `0 6px 20px -8px ${cor}aa`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <p className="text-xs opacity-80 font-medium relative">Total no torneio</p>
          <p className="text-4xl font-black tabular-nums leading-none mt-1 relative">
            {item.total > 0 ? '+' : ''}
            {item.total}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Vitórias" valor={stats.vitorias} cor="text-emerald-400" />
          <StatCard label="Derrotas" valor={stats.derrotas} cor="text-red-400" />
          <StatCard
            label="Aproveitamento"
            valor={`${aproveitamento}%`}
            cor="text-accent"
          />
        </div>

        {/* Por esporte */}
        {vitoriasPorEsporte.length > 0 ? (
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
        ) : (
          <p className="text-xs text-slate-500 text-center py-2">
            Nenhum jogo finalizado ainda.
          </p>
        )}
      </div>
    </Modal>
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
