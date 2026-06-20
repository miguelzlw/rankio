import { useMemo, useState } from 'react';
import { Shuffle, Users, ChevronRight, RotateCcw, Save, Check } from 'lucide-react';
import { useTimes } from '../hooks/useDados.js';
import Button from '../components/common/Button.jsx';
import { useToast } from '../components/common/ToastProvider.jsx';
import { sortearTimes } from '../services/sorteio.js';
import { salvarSorteio } from '../services/firestore.js';
import LoginGate from '../components/common/LoginGate.jsx';

// Sorteio eh acao de operador: exige login (e a escrita no Firestore tambem).
export default function Sorteio() {
  return (
    <LoginGate titulo="Sorteio (operador)">
      <SorteioInner />
    </LoginGate>
  );
}

// Tela de sorteio ao vivo. Fase "setup": escolhe times + cola nomes.
// Fase "revelacao": revela um nome por clique (round-robin entre times).
function SorteioInner() {
  const { data: times, loading } = useTimes();
  const toast = useToast();

  const [selecionados, setSelecionados] = useState(null); // Set de timeIds; null = ainda nao tocou (default todos)
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState(null); // { atribuicoes, ordemRevelacao, avisos }
  const [reveladosCount, setReveladosCount] = useState(0);
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Default: todos os times marcados.
  const idsSelecionados = useMemo(() => {
    if (selecionados) return selecionados;
    return new Set(times.map((t) => t.id));
  }, [selecionados, times]);

  const timesParticipantes = useMemo(
    () => times.filter((t) => idsSelecionados.has(t.id)),
    [times, idsSelecionados]
  );

  const timeById = useMemo(() => {
    const m = new Map();
    for (const t of times) m.set(t.id, t);
    return m;
  }, [times]);

  function toggleTime(id) {
    const base = new Set(idsSelecionados);
    if (base.has(id)) base.delete(id);
    else base.add(id);
    setSelecionados(base);
  }

  const nomesLista = useMemo(
    () => texto.split('\n').map((l) => l.trim()).filter(Boolean),
    [texto]
  );

  function iniciarSorteio() {
    if (timesParticipantes.length < 2) {
      toast.warning('Selecione pelo menos 2 times.');
      return;
    }
    if (nomesLista.length === 0) {
      toast.warning('Digite ao menos um nome.');
      return;
    }
    const res = sortearTimes({ nomes: nomesLista, times: timesParticipantes });
    res.avisos.forEach((a) => toast.info(a));
    setResultado(res);
    setReveladosCount(0);
    setSalvo(false);
  }

  function proximo() {
    setReveladosCount((c) => Math.min(c + 1, resultado.ordemRevelacao.length));
  }

  function refazer() {
    setResultado(null);
    setReveladosCount(0);
    setSalvo(false);
  }

  async function salvar() {
    setSalvando(true);
    try {
      await salvarSorteio(resultado.atribuicoes, timesParticipantes);
      setSalvo(true);
      toast.success('Sorteio salvo. Times atualizados.');
    } catch (error) {
      console.error('Erro ao salvar sorteio:', error);
      toast.error('Erro ao salvar. Verifique a conexão com o Firestore.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ===== FASE REVELACAO =====
  if (resultado) {
    const { ordemRevelacao } = resultado;
    const atual = reveladosCount > 0 ? ordemRevelacao[reveladosCount - 1] : null;
    const timeAtual = atual ? timeById.get(atual.timeId) : null;
    const acabou = reveladosCount >= ordemRevelacao.length;

    // Quem ja foi revelado, por time (pra montar os paineis).
    const reveladosPorTime = {};
    for (const t of timesParticipantes) reveladosPorTime[t.id] = [];
    for (let i = 0; i < reveladosCount; i++) {
      const item = ordemRevelacao[i];
      reveladosPorTime[item.timeId].push(item.nome);
    }

    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Shuffle size={22} className="text-accent" /> Sorteio
        </h1>
        <p className="text-sm text-slate-400 mb-4">
          {acabou
            ? 'Sorteio concluído!'
            : `${reveladosCount} de ${ordemRevelacao.length} sorteados`}
        </p>

        {/* Card grande do nome atual */}
        <div className="min-h-[140px] flex items-center justify-center mb-5">
          {atual ? (
            <div
              key={reveladosCount}
              className="animate-slide-up text-center rounded-2xl border px-6 py-6 w-full"
              style={{
                borderColor: `${timeAtual?.cor}66`,
                backgroundColor: `${timeAtual?.cor}1a`,
              }}
            >
              <p className="text-3xl font-extrabold text-text">{atual.nome}</p>
              <p className="mt-2 text-sm text-slate-300">vai para</p>
              <p
                className="mt-1 text-xl font-bold flex items-center justify-center gap-2"
                style={{ color: timeAtual?.cor }}
              >
                <span
                  className="w-4 h-4 rounded-md inline-block ring-2 ring-white/10"
                  style={{ backgroundColor: timeAtual?.cor }}
                />
                {timeAtual?.nome}
              </p>
            </div>
          ) : (
            <div className="text-center text-slate-400 rounded-2xl border border-dashed border-white/10 px-6 py-8 w-full">
              Clique em <strong className="text-text">Sortear próximo</strong> para começar.
            </div>
          )}
        </div>

        {/* Acoes */}
        <div className="flex gap-2 mb-6">
          {!acabou ? (
            <Button size="lg" className="flex-1" onClick={proximo}>
              Sortear próximo <ChevronRight size={18} />
            </Button>
          ) : (
            <Button
              size="lg"
              variant={salvo ? 'success' : 'accent'}
              className="flex-1"
              onClick={salvar}
              disabled={salvando || salvo}
            >
              {salvo ? (
                <><Check size={18} /> Salvo</>
              ) : (
                <><Save size={18} /> {salvando ? 'Salvando…' : 'Salvar resultado'}</>
              )}
            </Button>
          )}
          <Button size="lg" variant="outline" onClick={refazer}>
            <RotateCcw size={18} /> Refazer
          </Button>
        </div>

        {/* Paineis dos times preenchendo */}
        <div className="grid grid-cols-2 gap-3">
          {timesParticipantes.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-white/10 bg-surface/50 p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-4 h-4 rounded-md ring-2 ring-white/10"
                  style={{ backgroundColor: t.cor }}
                />
                <span className="font-semibold text-text truncate">{t.nome}</span>
                <span className="ml-auto text-xs text-slate-400">
                  {reveladosPorTime[t.id].length}
                </span>
              </div>
              <ul className="space-y-1">
                {reveladosPorTime[t.id].map((nome, i) => (
                  <li
                    key={`${nome}-${i}`}
                    className="text-sm text-slate-200 animate-fade-in truncate"
                  >
                    {nome}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ===== FASE SETUP =====
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
        <Shuffle size={22} className="text-accent" /> Sorteio
      </h1>
      <p className="text-sm text-slate-400 mb-5">
        Selecione os times, cole os nomes e sorteie ao vivo.
      </p>

      {times.length < 2 ? (
        <p className="text-sm text-slate-400 bg-surface/30 border border-dashed border-white/10 rounded-xl p-4 text-center">
          Cadastre pelo menos 2 times em <strong className="text-text">Configuração</strong> antes
          de sortear.
        </p>
      ) : (
        <>
          {/* Selecao de times */}
          <div className="mb-5">
            <h2 className="font-semibold mb-2">Times</h2>
            <div className="flex flex-wrap gap-2">
              {times.map((t) => {
                const on = idsSelecionados.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTime(t.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                      on
                        ? 'border-white/25 bg-white/10 text-text'
                        : 'border-white/10 bg-transparent text-slate-500'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-md ring-2 ring-white/10"
                      style={{ backgroundColor: t.cor, opacity: on ? 1 : 0.4 }}
                    />
                    {t.nome}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nomes */}
          <div className="mb-5">
            <label className="font-semibold flex items-center gap-1.5 mb-2">
              <Users size={16} className="text-accent" /> Nomes
              <span className="text-xs text-slate-500 font-normal">(um por linha)</span>
            </label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={10}
              className="w-full border border-white/20 bg-black/20 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder-white/30 resize-y scrollbar-thin"
              placeholder={'Fulano\nCiclano\nBeltrano'}
            />
            <p className="text-xs text-slate-500 mt-1">
              {nomesLista.length} nome(s) · {timesParticipantes.length} time(s)
            </p>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={iniciarSorteio}
            disabled={nomesLista.length === 0 || timesParticipantes.length < 2}
          >
            <Shuffle size={18} /> Sortear
          </Button>
        </>
      )}
    </div>
  );
}
