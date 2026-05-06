import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEsportes, useJogos, useTimes } from '../hooks/useDados.js';
import { GitBranch, Settings, ArrowRight, Trophy, Users, ChevronRight, Wand2 } from 'lucide-react';
import BracketMataMata from '../components/chaveamento/BracketMataMata.jsx';
import GrupoTable from '../components/chaveamento/GrupoTable.jsx';
import RodadasColetivo from '../components/chaveamento/RodadasColetivo.jsx';
import BackButton from '../components/common/BackButton.jsx';
import { gerarMataMataAposGrupos, podeGerarMataMata } from '../services/firestore.js';

export default function Chaveamento() {
  const { esporteId } = useParams();
  const navigate = useNavigate();
  const { data: esportes } = useEsportes();
  const { data: jogos } = useJogos();
  const { data: times } = useTimes();

  if (esportes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/30 to-accent/20 border border-accent/30 flex items-center justify-center mb-6">
          <GitBranch size={44} className="text-accent" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Sem chaveamentos</h1>
        <p className="text-slate-400 text-sm mb-8 max-w-xs">
          Crie <strong>times</strong> e <strong>esportes</strong> primeiro, depois gere os jogos na aba Configuração.
        </p>
        <button
          onClick={() => navigate('/configuracao')}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-primary/30 transition active:scale-95"
        >
          <Settings size={20} />
          Ir para Configuração
          <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  // Sem esporte selecionado: lista de cards
  if (!esporteId) {
    return <ListaEsportes esportes={esportes} jogos={jogos} />;
  }

  // Esporte selecionado: visualizar chaveamento
  const esporte = esportes.find((e) => e.id === esporteId);
  if (!esporte) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <p className="text-slate-400 mb-4">Esporte não encontrado.</p>
        <BackButton to="/chaveamento" label="Voltar aos esportes" />
      </div>
    );
  }

  const timesPorId = new Map(times.map((t) => [t.id, t]));
  return (
    <div className="animate-fade-in space-y-4">
      <BackButton to="/chaveamento" label="Esportes" />

      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 via-surface to-surface border border-white/10 p-5">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
            <GitBranch size={22} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">{esporte.nome}</h1>
            <p className="text-xs text-slate-400">
              {esporte.tipo === '1v1' ? '1 vs 1' : 'Coletivo'}
              {esporte.formato &&
                ' • ' + (esporte.formato === 'mata-mata' ? 'Mata-mata' : 'Grupos + Mata-mata')}
            </p>
          </div>
        </div>
      </header>

      <RenderEsporte esporte={esporte} jogos={jogos} times={times} timesPorId={timesPorId} />
    </div>
  );
}

function ListaEsportes({ esportes, jogos }) {
  return (
    <div className="animate-fade-in">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 via-surface to-surface border border-white/10 p-5 mb-5">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
            <GitBranch size={24} className="text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Chaveamento</h1>
            <p className="text-sm text-slate-400">Selecione um esporte para ver seu chaveamento.</p>
          </div>
        </div>
      </header>

      <ul className="space-y-3">
        {esportes.map((esp) => {
          const jogosEsp = jogos.filter((j) => j.esporteId === esp.id);
          const total = jogosEsp.length;
          const finalizados = jogosEsp.filter((j) => j.status === 'finalizado').length;
          const aoVivo = jogosEsp.some((j) => j.status === 'ao_vivo');
          const pct = total > 0 ? Math.round((finalizados / total) * 100) : 0;

          return (
            <li key={esp.id}>
              <Link
                to={`/chaveamento/${esp.id}`}
                className="group block relative overflow-hidden rounded-2xl bg-surface/60 border border-white/10 hover:border-accent/40 transition active:scale-[0.99]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-accent/0 group-hover:from-primary/10 group-hover:to-accent/10 transition" />

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
                      {esp.tipo === '1v1' ? '1v1' : 'Coletivo'}
                      {esp.formato && ' • ' + (esp.formato === 'mata-mata' ? 'Mata-mata' : 'Grupos+MM')}
                      {' • '}
                      {esp.timesParticipantes?.length ?? 0} times
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
                        Chaveamento ainda não gerado
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

function RenderEsporte({ esporte, jogos, times, timesPorId }) {
  const jogosDoEsporte = jogos.filter((j) => j.esporteId === esporte.id);

  if (jogosDoEsporte.length === 0) {
    return (
      <div className="bg-surface/50 rounded-2xl p-6 border border-white/10 text-center">
        <GitBranch size={32} className="text-slate-500 mx-auto mb-3" />
        <p className="text-slate-300 text-sm font-medium mb-1">
          Nenhum jogo gerado ainda
        </p>
        <p className="text-slate-500 text-xs">
          Vá em Configuração → Jogos e gere o chaveamento.
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
        <section>
          <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 px-1">
            Fase de grupos
          </h3>
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
        </section>

        <section>
          <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 px-1">
            Mata-mata
          </h3>
          {mm.length > 0 ? (
            <BracketMataMata jogos={mm} timesPorId={timesPorId} />
          ) : (
            <BotaoGerarMM esporte={esporte} todosJogos={jogosDoEsporte} times={times} />
          )}
        </section>
      </div>
    );
  }

  return null;
}

function BotaoGerarMM({ esporte, todosJogos, times }) {
  const [gerando, setGerando] = useState(false);
  const podeGerar = podeGerarMataMata(esporte, todosJogos);

  async function handleGerar() {
    setGerando(true);
    try {
      const r = await gerarMataMataAposGrupos(esporte, todosJogos, times);
      if (!r.ok) alert('Não foi possível gerar o mata-mata.');
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar mata-mata.');
    } finally {
      setGerando(false);
    }
  }

  if (!podeGerar) {
    return (
      <div className="bg-surface/50 rounded-xl p-4 border border-white/10 text-center">
        <p className="text-sm text-slate-400">
          O mata-mata será habilitado após o fim de todos os jogos da fase de grupos.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-accent/15 to-primary/15 border border-accent/40 rounded-2xl p-4 animate-pulse-glow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center flex-shrink-0">
          <Wand2 size={18} className="text-accent" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-text mb-0.5">Pronto pra gerar!</h4>
          <p className="text-xs text-slate-400 mb-3">
            Todos os jogos da fase de grupos terminaram. Gere o chaveamento com os classificados.
          </p>
          <button
            onClick={handleGerar}
            disabled={gerando}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-60 text-background font-bold px-4 py-2 rounded-lg shadow-lg shadow-accent/20 transition active:scale-95 text-sm"
          >
            <Wand2 size={16} />
            {gerando ? 'Gerando...' : 'Gerar mata-mata'}
          </button>
        </div>
      </div>
    </div>
  );
}
