import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pause, Play, Trash2, Flag, RotateCcw, Trophy, Handshake, Unlock } from 'lucide-react';
import { useEsportes, useJogos, useTimes } from '../hooks/useDados.js';
import useCronometro, { formatarTempo } from '../hooks/useCronometro.js';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import Modal from '../components/common/Modal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import BackButton from '../components/common/BackButton.jsx';
import { useToast } from '../components/common/ToastProvider.jsx';
import {
  iniciarJogo,
  lancarEvento,
  removerEvento,
  finalizarJogo,
  definirVencedorManual,
  reabrirJogo,
} from '../services/firestore.js';

function genEventoId() {
  return `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function JogoDetalhe() {
  const { esporteId, jogoId } = useParams();
  const navigate = useNavigate();
  const { data: esportes } = useEsportes();
  const { data: jogos } = useJogos();
  const { data: times } = useTimes();
  const cronometro = useCronometro();
  const [confirmarFim, setConfirmarFim] = useState(false);
  const [eventoARemover, setEventoARemover] = useState(null);
  const [confirmarReabertura, setConfirmarReabertura] = useState(false);
  const [flashA, setFlashA] = useState(false);
  const [flashB, setFlashB] = useState(false);
  const [vencedorManualAberto, setVencedorManualAberto] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [autorPendente, setAutorPendente] = useState(null); // { regra, timeAfetado } enquanto pergunta o autor
  const toast = useToast();

  const esporte = esportes.find((e) => e.id === esporteId);
  const jogo = jogos.find((j) => j.id === jogoId);
  const timesPorId = new Map(times.map((t) => [t.id, t]));

  useEffect(() => {
    if (!jogo || !esporte) return;
    if (jogo.status === 'ao_vivo' && cronometro.estado === 'parado' && esporte.tipo === '1v1') {
      cronometro.start();
    }
  }, [jogo, esporte, cronometro]);

  if (!esporte || !jogo) return <p className="text-slate-500">Carregando...</p>;

  const timeA = timesPorId.get(jogo.timeAId);
  const timeB = timesPorId.get(jogo.timeBId);
  const ehMataMata = jogo.fase === 'mata-mata';
  const placarA = jogo.placarTimeA ?? 0;
  const placarB = jogo.placarTimeB ?? 0;
  const empate = placarA === placarB;
  // Em mata-mata pode finalizar com empate se ha vencedorOverride (penaltis)
  const podeFinalizar = !(ehMataMata && empate) || !!jogo.vencedorOverride;
  const semRegras = (esporte.regras || []).length === 0;

  async function handleIniciar() {
    await iniciarJogo(jogo.id);
  }

  async function handleEvento(regra, timeAfetado) {
    // Se esporte pede autor: abre modal antes de lancar.
    if (esporte.registrarAutor) {
      setAutorPendente({ regra, timeAfetado });
      return;
    }
    await registrarEvento(regra, timeAfetado, null);
  }

  async function registrarEvento(regra, timeAfetado, autor) {
    const evento = {
      id: genEventoId(),
      regraId: regra.id,
      regraNome: regra.nome,
      timeAfetado,
      timestampCronometro: cronometro.tempoMs,
      timestamp: Date.now(),
    };
    if (autor) evento.autor = autor;
    await lancarEvento(jogo, esporte.regras, evento);
    if (timeAfetado === 'A') {
      setFlashA(true);
      setTimeout(() => setFlashA(false), 350);
    } else {
      setFlashB(true);
      setTimeout(() => setFlashB(false), 350);
    }
  }

  async function handleEscolherAutor(autor) {
    if (!autorPendente) return;
    const { regra, timeAfetado } = autorPendente;
    setAutorPendente(null);
    await registrarEvento(regra, timeAfetado, autor);
  }

  async function handleRemoverEvento() {
    if (!eventoARemover) return;
    await removerEvento(jogo, esporte.regras, eventoARemover.id);
    setEventoARemover(null);
  }

  async function handleVencedorRapido(timeId) {
    // definirVencedorManual decide entre placar simbolico (0x0) ou
    // vencedorOverride (mantem placar). Depois finaliza aplicando pontos.
    if (processando) return;
    setProcessando(true);
    try {
      cronometro.pausar();
      await definirVencedorManual(jogo, timeId);
      // Reflete o que `definirVencedorManual` faria, em memoria, pra
      // finalizar imediatamente (sem esperar snapshot)
      const placarZerado = placarA === 0 && placarB === 0;
      const jogoAtualizado = { ...jogo };
      if (placarZerado) {
        jogoAtualizado.placarTimeA = timeId === jogo.timeAId ? 1 : timeId === jogo.timeBId ? 0 : 1;
        jogoAtualizado.placarTimeB = timeId === jogo.timeBId ? 1 : timeId === jogo.timeAId ? 0 : 1;
        jogoAtualizado.vencedorOverride = null;
        jogoAtualizado.vencedorPorDesempate = false;
      } else {
        jogoAtualizado.vencedorOverride = timeId ?? null;
        jogoAtualizado.vencedorPorDesempate = empate && !!timeId;
      }
      const resultado = await finalizarJogo(jogoAtualizado, esporte);
      if (resultado.ok) {
        toast.success(
          jogoAtualizado.vencedorPorDesempate
            ? 'Jogo finalizado por desempate!'
            : 'Jogo finalizado!'
        );
        navigate(`/esportes/${esporteId}`);
      } else {
        toast.error('Erro ao finalizar o jogo.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao finalizar o jogo.');
    } finally {
      setProcessando(false);
      setVencedorManualAberto(false);
    }
  }

  async function handleFinalizar() {
    setConfirmarFim(false);
    cronometro.pausar();
    try {
      const resultado = await finalizarJogo(jogo, esporte);
      if (!resultado.ok) {
        toast.warning('Empate em mata-mata. Lance mais eventos para desempatar.');
      } else {
        toast.success('Jogo finalizado!');
        navigate(`/esportes/${esporteId}`);
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao finalizar.');
    }
  }

  async function handleReabrir() {
    setConfirmarReabertura(false);
    try {
      const resultado = await reabrirJogo(jogo, esporte, jogos);
      if (resultado.ok) {
        toast.success('Jogo reaberto. Você pode editar o placar agora.');
      } else if (resultado.motivo === 'proximo_em_andamento') {
        toast.warning('Não dá pra reabrir: o próximo jogo do bracket já começou ou foi finalizado.');
      } else {
        toast.error('Erro ao reabrir o jogo.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao reabrir o jogo.');
    }
  }

  return (
    <div className="animate-fade-in">
      <BackButton label="Voltar" className="mb-3" />

      <div className="flex items-center justify-between mb-3 gap-2">
        <h1 className="text-xl font-bold truncate">{esporte.nome} — Jogo {jogo.ordem}</h1>
        <Badge status={jogo.status} />
      </div>

      {/* Cronometro: so pra 1v1 e quando ao vivo */}
      {esporte.tipo === '1v1' && jogo.status === 'ao_vivo' && (
        <div className="bg-black/30 border border-white/10 text-white rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div className="text-4xl font-bold tabular-nums font-mono text-accent">
            {formatarTempo(cronometro.tempoMs)}
          </div>
          <div className="flex gap-2">
            {cronometro.estado === 'rodando' ? (
              <button onClick={cronometro.pausar} className="bg-white/10 hover:bg-white/20 rounded-lg p-2">
                <Pause size={20} />
              </button>
            ) : (
              <button
                onClick={cronometro.estado === 'parado' ? cronometro.start : cronometro.retomar}
                className="bg-white/10 hover:bg-white/20 rounded-lg p-2"
              >
                <Play size={20} />
              </button>
            )}
            <button onClick={cronometro.reset} className="bg-white/10 hover:bg-white/20 rounded-lg p-2">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Placar (gols / placar da partida) */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <PlacarTime
          time={timeA}
          placar={placarA}
          pontosTorneio={jogo.pontosTimeA ?? 0}
          mostrarPontosTorneio={(jogo.pontosTimeA ?? 0) !== 0}
          flash={flashA}
          fallback="Time A"
        />
        <PlacarTime
          time={timeB}
          placar={placarB}
          pontosTorneio={jogo.pontosTimeB ?? 0}
          mostrarPontosTorneio={(jogo.pontosTimeB ?? 0) !== 0}
          flash={flashB}
          fallback="Time B"
        />
      </div>

      {/* Acoes por estado */}
      {jogo.status === 'agendado' && (
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleIniciar}
          disabled={!timeA || !timeB}
        >
          {!timeA || !timeB ? 'Aguardando classificação' : 'Iniciar partida'}
        </Button>
      )}

      {jogo.status === 'ao_vivo' && (
        <>
          {/* Modo "vencedor direto" pra esportes sem regras (coletivos sem placar) */}
          {semRegras ? (
            <section className="space-y-2 mb-4">
              <p className="text-xs text-slate-400 text-center mb-2">
                Selecione o vencedor da partida:
              </p>
              <button
                onClick={() => handleVencedorRapido(jogo.timeAId)}
                disabled={!timeA}
                className="w-full p-4 rounded-2xl border-2 border-white/10 hover:border-emerald-400/60 bg-surface/60 hover:bg-emerald-500/10 transition active:scale-[0.99] disabled:opacity-40"
                style={timeA ? { borderColor: timeA.cor + '55' } : {}}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 rounded-xl"
                    style={{ backgroundColor: timeA?.cor || '#94a3b8' }}
                  />
                  <div className="flex-1 text-left">
                    <p className="text-xs text-emerald-400 font-semibold">VENCEDOR</p>
                    <p className="font-bold text-text">{timeA?.nome ?? 'Time A'}</p>
                  </div>
                  <Trophy size={22} className="text-accent" />
                </div>
              </button>
              <button
                onClick={() => handleVencedorRapido(jogo.timeBId)}
                disabled={!timeB}
                className="w-full p-4 rounded-2xl border-2 border-white/10 hover:border-emerald-400/60 bg-surface/60 hover:bg-emerald-500/10 transition active:scale-[0.99] disabled:opacity-40"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 rounded-xl"
                    style={{ backgroundColor: timeB?.cor || '#94a3b8' }}
                  />
                  <div className="flex-1 text-left">
                    <p className="text-xs text-emerald-400 font-semibold">VENCEDOR</p>
                    <p className="font-bold text-text">{timeB?.nome ?? 'Time B'}</p>
                  </div>
                  <Trophy size={22} className="text-accent" />
                </div>
              </button>
              {!ehMataMata && (esporte.pontosEmpate ?? 0) !== 0 && (
                <button
                  onClick={() => handleVencedorRapido(null)}
                  className="w-full p-3 rounded-2xl border-2 border-white/10 hover:border-slate-400/60 bg-surface/60 transition active:scale-[0.99]"
                >
                  <div className="flex items-center justify-center gap-2 text-slate-300">
                    <Handshake size={18} />
                    <span className="font-medium">Empate</span>
                  </div>
                </button>
              )}
            </section>
          ) : (
            <>
              <section className="grid grid-cols-2 gap-2 mb-4">
                <ColunaEventos
                  time={timeA}
                  esporte={esporte}
                  ladoEvento="A"
                  onEvento={handleEvento}
                  fallback="Time A"
                />
                <ColunaEventos
                  time={timeB}
                  esporte={esporte}
                  ladoEvento="B"
                  onEvento={handleEvento}
                  fallback="Time B"
                />
              </section>

              {/* Timeline */}
              {jogo.eventos?.length > 0 && (
                <section className="mb-4">
                  <h3 className="text-sm font-semibold mb-2">Eventos</h3>
                  <ul className="space-y-1 max-h-60 overflow-auto">
                    {[...jogo.eventos].reverse().map((ev) => {
                      const time = ev.timeAfetado === 'A' ? timeA : timeB;
                      return (
                        <li
                          key={ev.id}
                          className="flex items-center gap-2 bg-surface/50 border border-white/10 text-text rounded-lg px-3 py-2 text-sm"
                        >
                          <span className="text-xs text-slate-400 tabular-nums w-12">
                            {formatarTempo(ev.timestampCronometro || 0)}
                          </span>
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: time?.cor || '#94a3b8' }}
                          />
                          <span className="flex-1 truncate">
                            <span className="font-medium">{ev.regraNome}</span>
                            <span className="text-slate-400"> — {time?.nome ?? '?'}</span>
                            {ev.autor && (
                              <span className="text-accent"> · {ev.autor}</span>
                            )}
                          </span>
                          <button
                            onClick={() => setEventoARemover(ev)}
                            className="text-slate-400 hover:text-red-400 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <Button
                variant="success"
                size="lg"
                className="w-full"
                disabled={!podeFinalizar}
                onClick={() => setConfirmarFim(true)}
              >
                <Flag size={18} />
                Finalizar partida
              </Button>
              {!podeFinalizar && (
                <p className="text-xs text-amber-400 mt-2 text-center">
                  Empate em mata-mata: lance um evento desempatador <strong>ou</strong> defina o vencedor por pênaltis abaixo.
                </p>
              )}

              {/* Atalho: definir vencedor manualmente. Em empate, mantem o placar. */}
              <button
                onClick={() => setVencedorManualAberto(true)}
                className={`w-full mt-3 flex items-center justify-center gap-2 text-xs border rounded-lg py-2.5 transition ${
                  ehMataMata && empate
                    ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15'
                    : 'text-slate-400 hover:text-accent border-white/10 hover:border-accent/40 bg-surface/40'
                }`}
              >
                {ehMataMata && empate ? (
                  <>
                    <Handshake size={14} />
                    Decidir nos pênaltis (manter empate)
                  </>
                ) : (
                  <>
                    <Trophy size={14} />
                    Definir vencedor manualmente
                  </>
                )}
              </button>
            </>
          )}
        </>
      )}

      {jogo.status === 'finalizado' && (
        <>
          <ResumoFinalizado jogo={jogo} timeA={timeA} timeB={timeB} esporte={esporte} />
          <button
            onClick={() => setConfirmarReabertura(true)}
            className="w-full mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-amber-400 border border-dashed border-white/10 hover:border-amber-500/40 bg-surface/30 rounded-lg py-2.5 transition"
          >
            <Unlock size={14} />
            Reabrir jogo (corrigir placar)
          </button>
        </>
      )}

      <ConfirmDialog
        open={confirmarFim}
        onClose={() => setConfirmarFim(false)}
        onConfirm={handleFinalizar}
        title="Finalizar partida?"
        message={textoConfirmacaoFinal(jogo, esporte, timeA, timeB)}
        confirmLabel="Finalizar"
      />

      <ConfirmDialog
        open={!!eventoARemover}
        onClose={() => setEventoARemover(null)}
        onConfirm={handleRemoverEvento}
        title="Remover evento?"
        message={
          eventoARemover &&
          `Remover "${eventoARemover.regraNome}" de ${
            eventoARemover.timeAfetado === 'A' ? timeA?.nome : timeB?.nome
          }? O placar será recalculado.`
        }
        confirmLabel="Remover"
        destrutivo
      />

      <ConfirmDialog
        open={confirmarReabertura}
        onClose={() => setConfirmarReabertura(false)}
        onConfirm={handleReabrir}
        title="Reabrir jogo?"
        message="O jogo volta para 'ao vivo'. Os pontos do ranking ganhos por este jogo serão revertidos até você finalizar de novo. Em mata-mata, o time que avançou para o próximo jogo será removido."
        confirmLabel="Reabrir"
      />

      <Modal
        open={vencedorManualAberto}
        onClose={() => !processando && setVencedorManualAberto(false)}
        title={
          empate && (placarA > 0 || placarB > 0)
            ? 'Decisão por desempate'
            : 'Definir vencedor manualmente'
        }
      >
        <AvisoVencedorManual
          placarA={placarA}
          placarB={placarB}
          empate={empate}
          numEventos={jogo.eventos?.length ?? 0}
          ehMataMata={ehMataMata}
        />
        <p className="text-sm text-slate-300 font-medium mt-3 mb-2">
          {empate && (placarA > 0 || placarB > 0) ? 'Quem venceu o desempate?' : 'Quem venceu?'}
        </p>
        <div className="space-y-2">
          <BotaoVencedor
            time={timeA}
            fallback="Time A"
            onClick={() => handleVencedorRapido(jogo.timeAId)}
            disabled={!timeA || processando}
          />
          <BotaoVencedor
            time={timeB}
            fallback="Time B"
            onClick={() => handleVencedorRapido(jogo.timeBId)}
            disabled={!timeB || processando}
          />
          {!ehMataMata && (esporte.pontosEmpate ?? 0) !== 0 && (
            <button
              onClick={() => handleVencedorRapido(null)}
              disabled={processando}
              className="w-full p-3 rounded-xl border-2 border-white/10 hover:border-slate-400/60 bg-surface/60 transition active:scale-[0.99] disabled:opacity-40"
            >
              <div className="flex items-center justify-center gap-2 text-slate-300">
                <Handshake size={18} />
                <span className="font-medium">Empate</span>
              </div>
            </button>
          )}
        </div>
        {processando && (
          <p className="text-xs text-slate-500 text-center mt-2">Processando...</p>
        )}
      </Modal>

      {/* Modal de selecao de autor (artilharia) */}
      <ModalAutor
        autorPendente={autorPendente}
        timeA={timeA}
        timeB={timeB}
        onEscolher={handleEscolherAutor}
        onCancelar={() => setAutorPendente(null)}
      />
    </div>
  );
}

function ModalAutor({ autorPendente, timeA, timeB, onEscolher, onCancelar }) {
  if (!autorPendente) return null;
  const time = autorPendente.timeAfetado === 'A' ? timeA : timeB;
  const cor = time?.cor || '#94a3b8';
  const jogadores = time?.jogadores ?? [];

  return (
    <Modal
      open={!!autorPendente}
      onClose={onCancelar}
      title={`Quem fez "${autorPendente.regra.nome}"?`}
    >
      <div className="space-y-2">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg border-l-4"
          style={{ borderColor: cor, backgroundColor: cor + '15' }}
        >
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cor }} />
          <span className="text-sm font-semibold text-text">{time?.nome ?? '—'}</span>
        </div>

        {jogadores.length === 0 ? (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs rounded-lg p-3">
            Nenhum jogador cadastrado neste time. Vá em <strong>Configuração → Times</strong> e
            adicione jogadores, ou registre sem autor abaixo.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {jogadores.map((jogador) => (
              <button
                key={jogador}
                onClick={() => onEscolher(jogador)}
                className="text-left border border-white/10 hover:border-white/30 text-text rounded-lg px-3 py-3 text-sm font-medium transition active:scale-95 truncate"
                style={{ backgroundColor: cor + '15' }}
              >
                {jogador}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => onEscolher(null)}
          className="w-full mt-2 text-xs text-slate-400 hover:text-text border border-dashed border-white/15 hover:border-white/30 rounded-lg py-2.5 transition"
        >
          Registrar sem autor
        </button>
      </div>
    </Modal>
  );
}

// Aviso adaptativo no modal de vencedor manual conforme o placar atual.
// Tres cenarios:
// 1) Placar 0x0: vai por placar simbolico 1x0
// 2) Placar empatado com gols (ex: 3x3): mantem o empate, vencedor por desempate
// 3) Placar nao-empate (ex: 3x2): mantem placar mas usuario pode contradizer
function AvisoVencedorManual({ placarA, placarB, empate, numEventos, ehMataMata }) {
  const placarZerado = placarA === 0 && placarB === 0;

  if (placarZerado) {
    return (
      <div className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-3 text-xs text-sky-200 space-y-1">
        <p className="font-semibold">Sem placar registrado</p>
        <p className="text-sky-200/90">
          O placar simbólico ficará <strong>1 × 0</strong> (ou 1 × 1 em empate). O jogo será finalizado e os pontos do esporte serão aplicados ao ranking.
        </p>
      </div>
    );
  }

  if (empate) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-200 space-y-1">
        <p className="font-semibold flex items-center gap-1.5">
          <Handshake size={14} /> Decisão por desempate
        </p>
        <p className="text-emerald-200/90">
          O placar permanece <strong className="tabular-nums">{placarA} × {placarB}</strong>. Você marca quem venceu no desempate (pênaltis, sorteio, etc.) sem alterar o placar do jogo.
        </p>
        {ehMataMata && (
          <p className="text-emerald-200/70 text-[11px] mt-1">
            O time escolhido avança no chaveamento.
          </p>
        )}
      </div>
    );
  }

  // Placar decisivo (3x2 etc.)
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200 space-y-1">
      <p className="font-semibold">Atenção</p>
      <p className="text-amber-200/90">
        Placar atual: <strong className="tabular-nums">{placarA} × {placarB}</strong>. Se você escolher um vencedor diferente do que o placar mostra, o jogo será finalizado com sua escolha (placar mantido).
      </p>
      {numEventos > 0 && (
        <p className="text-amber-200/70 text-[11px]">
          Os {numEventos} evento(s) lançados ficam preservados na timeline.
        </p>
      )}
    </div>
  );
}

function BotaoVencedor({ time, fallback, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full p-3 rounded-xl border-2 border-white/10 hover:border-emerald-400/60 bg-surface/60 hover:bg-emerald-500/10 transition active:scale-[0.99] disabled:opacity-40 disabled:active:scale-100"
    >
      <div className="flex items-center gap-3">
        <span
          className="w-8 h-8 rounded-lg flex-shrink-0"
          style={{ backgroundColor: time?.cor || '#94a3b8' }}
        />
        <div className="flex-1 text-left">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Vencedor</p>
          <p className="font-semibold text-text">{time?.nome ?? fallback}</p>
        </div>
        <Trophy size={20} className="text-accent flex-shrink-0" />
      </div>
    </button>
  );
}

function textoConfirmacaoFinal(jogo, esporte, timeA, timeB) {
  const placarA = jogo.placarTimeA ?? 0;
  const placarB = jogo.placarTimeB ?? 0;
  let resultado;
  // Override (penaltis) tem prioridade
  if (jogo.vencedorOverride) {
    const nomeVencedor =
      jogo.vencedorOverride === jogo.timeAId
        ? timeA?.nome ?? 'Time A'
        : jogo.vencedorOverride === jogo.timeBId
          ? timeB?.nome ?? 'Time B'
          : '—';
    resultado = `Vencedor: ${nomeVencedor} (por desempate)`;
  } else if (placarA > placarB) {
    resultado = `Vencedor: ${timeA?.nome ?? 'Time A'}`;
  } else if (placarB > placarA) {
    resultado = `Vencedor: ${timeB?.nome ?? 'Time B'}`;
  } else {
    resultado = 'Empate';
  }
  return `Placar ${placarA} × ${placarB}. ${resultado}. Após finalizar, o jogo fica imutável e os pontos vão para o ranking.`;
}

// Coluna de eventos otimizada pra uso a duas maos no celular: botoes grandes
// (h-14), borda colorida do time, ativo com cor do time pra diferenciar bem.
function ColunaEventos({ time, esporte, ladoEvento, onEvento, fallback }) {
  const cor = time?.cor || '#94a3b8';
  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-t-lg border-b-2 mb-2"
        style={{ borderColor: cor + 'cc', backgroundColor: cor + '20' }}
      >
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cor }} />
        <p className="text-xs font-bold text-text truncate">
          {time?.nome ?? fallback}
        </p>
      </div>
      <div className="space-y-1.5">
        {(esporte.regras || []).map((r) => {
          const placarMostrar = r.placarACausa ?? r.pontosACausa ?? 0;
          return (
            <button
              key={r.id}
              onClick={() => onEvento(r, ladoEvento)}
              className="w-full text-left border border-white/10 hover:border-white/30 text-text rounded-lg px-3 py-3 text-sm transition active:scale-95 group"
              style={{
                backgroundColor: cor + '15',
              }}
            >
              <span className="font-semibold leading-tight block">{r.nome}</span>
              {placarMostrar !== 0 && (
                <span
                  className="text-[11px] font-bold tabular-nums opacity-80"
                  style={{ color: cor }}
                >
                  {placarMostrar > 0 ? '+' : ''}{placarMostrar}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResumoFinalizado({ jogo, timeA, timeB, esporte }) {
  const placarA = jogo.placarTimeA ?? 0;
  const placarB = jogo.placarTimeB ?? 0;
  return (
    <>
      <section className="bg-surface/50 border border-white/10 rounded-2xl p-4">
        <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
          Resultado
        </h3>
        <div className="text-center mb-3">
          <p className="text-text text-base font-medium">
            {jogo.vencedor === jogo.timeAId
              ? `Vitória de ${timeA?.nome ?? 'Time A'}`
              : jogo.vencedor === jogo.timeBId
                ? `Vitória de ${timeB?.nome ?? 'Time B'}`
                : 'Empate'}
          </p>
          {jogo.vencedorPorDesempate && (
            <p className="inline-flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5 mt-2 font-semibold">
              <Handshake size={11} />
              Decidido por desempate (placar manteve)
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <ResumoTime time={timeA} placar={placarA} pontos={jogo.pontosTimeA ?? 0} />
          <ResumoTime time={timeB} placar={placarB} pontos={jogo.pontosTimeB ?? 0} />
        </div>
        {jogo.bye && (
          <p className="text-xs text-slate-400 mt-3 text-center">Avanço por bye (W.O.).</p>
        )}
      </section>

      {jogo.eventos?.length > 0 && (
        <section className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Eventos</h3>
          <ul className="space-y-1">
            {jogo.eventos.map((ev) => {
              const time = ev.timeAfetado === 'A' ? timeA : timeB;
              return (
                <li
                  key={ev.id}
                  className="flex items-center gap-2 bg-surface/50 border border-white/10 text-text rounded-lg px-3 py-2 text-sm"
                >
                  <span className="text-xs text-slate-400 tabular-nums w-12">
                    {formatarTempo(ev.timestampCronometro || 0)}
                  </span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: time?.cor || '#94a3b8' }}
                  />
                  <span className="flex-1 truncate">
                    <span className="font-medium">{ev.regraNome}</span>
                    <span className="text-slate-400"> — {time?.nome ?? '?'}</span>
                    {ev.autor && (
                      <span className="text-accent"> · {ev.autor}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

function ResumoTime({ time, placar, pontos }) {
  const cor = time?.cor || '#94a3b8';
  return (
    <div className="bg-surface/60 border border-white/10 rounded-xl p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cor }} />
        <span className="font-medium text-text truncate">{time?.nome ?? '—'}</span>
      </div>
      <p className="text-3xl font-bold tabular-nums">{placar}</p>
      <p
        className={`text-xs tabular-nums mt-0.5 ${
          pontos < 0 ? 'text-red-400' : pontos > 0 ? 'text-accent' : 'text-slate-500'
        }`}
      >
        {pontos > 0 ? '+' : ''}{pontos} no ranking
      </p>
    </div>
  );
}

function PlacarTime({ time, placar, pontosTorneio, mostrarPontosTorneio, flash, fallback }) {
  const cor = time?.cor || '#94a3b8';
  return (
    <div
      className="rounded-2xl p-4 text-white shadow-lg relative overflow-hidden"
      style={{
        backgroundColor: cor,
        boxShadow: `0 6px 20px -8px ${cor}aa`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      <div className="relative">
        <p className="text-xs font-medium opacity-90 truncate">{time?.nome ?? fallback}</p>
        <p className={`text-6xl font-bold tabular-nums mt-1 leading-none ${flash ? 'animate-flash' : ''}`}>
          {placar}
        </p>
        {mostrarPontosTorneio && (
          <p className="text-[11px] opacity-80 mt-1 tabular-nums">
            {pontosTorneio > 0 ? '+' : ''}{pontosTorneio} no ranking
          </p>
        )}
      </div>
    </div>
  );
}
