import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pause, Play, Trash2, Flag, RotateCcw, Trophy, Handshake } from 'lucide-react';
import { useEsportes, useJogos, useTimes } from '../hooks/useDados.js';
import useCronometro, { formatarTempo } from '../hooks/useCronometro.js';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import Modal from '../components/common/Modal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import BackButton from '../components/common/BackButton.jsx';
import {
  iniciarJogo,
  lancarEvento,
  removerEvento,
  finalizarJogo,
  definirVencedorManual,
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
  const [erro, setErro] = useState(null);
  const [flashA, setFlashA] = useState(false);
  const [flashB, setFlashB] = useState(false);
  const [vencedorManualAberto, setVencedorManualAberto] = useState(false);
  const [processando, setProcessando] = useState(false);

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
  const podeFinalizar = !(ehMataMata && empate);
  const semRegras = (esporte.regras || []).length === 0;

  async function handleIniciar() {
    await iniciarJogo(jogo.id);
  }

  async function handleEvento(regra, timeAfetado) {
    const evento = {
      id: genEventoId(),
      regraId: regra.id,
      regraNome: regra.nome,
      timeAfetado,
      timestampCronometro: cronometro.tempoMs,
      timestamp: Date.now(),
    };
    await lancarEvento(jogo, esporte.regras, evento);
    if (timeAfetado === 'A') {
      setFlashA(true);
      setTimeout(() => setFlashA(false), 350);
    } else {
      setFlashB(true);
      setTimeout(() => setFlashB(false), 350);
    }
  }

  async function handleRemoverEvento() {
    if (!eventoARemover) return;
    await removerEvento(jogo, esporte.regras, eventoARemover.id);
    setEventoARemover(null);
  }

  async function handleVencedorRapido(timeId) {
    // Define o placar simbolicamente (1×0 ou 0×1, ou 1×1 em empate) e finaliza
    // o jogo aplicando pontosVencedor/Perdedor/Empate. Substitui o placar atual.
    if (processando) return;
    setProcessando(true);
    try {
      cronometro.pausar();
      await definirVencedorManual(jogo, timeId);
      const jogoAtualizado = {
        ...jogo,
        placarTimeA:
          timeId === jogo.timeAId ? 1 : timeId === jogo.timeBId ? 0 : 1,
        placarTimeB:
          timeId === jogo.timeBId ? 1 : timeId === jogo.timeAId ? 0 : 1,
      };
      const resultado = await finalizarJogo(jogoAtualizado, esporte);
      if (resultado.ok) {
        navigate(`/esportes/${esporteId}`);
      } else {
        setErro('Erro ao finalizar o jogo.');
      }
    } finally {
      setProcessando(false);
      setVencedorManualAberto(false);
    }
  }

  async function handleFinalizar() {
    setConfirmarFim(false);
    cronometro.pausar();
    const resultado = await finalizarJogo(jogo, esporte);
    if (!resultado.ok) {
      setErro('Não é possível finalizar com placar empatado em mata-mata. Lance mais eventos para desempatar.');
    } else {
      navigate(`/esportes/${esporteId}`);
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
                <ColunaEventos time={timeA} esporte={esporte} ladoEvento="A" onEvento={handleEvento} />
                <ColunaEventos time={timeB} esporte={esporte} ladoEvento="B" onEvento={handleEvento} />
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
                            {ev.regraNome} — {time?.nome ?? '?'}
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
                  Empate em mata-mata: marque um evento desempatador antes de finalizar.
                </p>
              )}

              {/* Atalho: definir vencedor manualmente sem precisar mexer no placar */}
              <button
                onClick={() => setVencedorManualAberto(true)}
                className="w-full mt-3 flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-accent border border-white/10 hover:border-accent/40 bg-surface/40 rounded-lg py-2.5 transition"
              >
                <Trophy size={14} />
                Definir vencedor manualmente
              </button>
            </>
          )}
        </>
      )}

      {jogo.status === 'finalizado' && (
        <ResumoFinalizado jogo={jogo} timeA={timeA} timeB={timeB} esporte={esporte} />
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

      <Modal
        open={vencedorManualAberto}
        onClose={() => !processando && setVencedorManualAberto(false)}
        title="Definir vencedor manualmente"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Isso vai <strong className="text-amber-400">substituir o placar</strong> e finalizar
            o jogo. Útil quando você quer encerrar direto sem mexer em eventos.
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
            <p className="text-xs text-slate-500 text-center">Processando...</p>
          )}
        </div>
      </Modal>

      <Modal open={!!erro} onClose={() => setErro(null)} title="Atenção">
        <p>{erro}</p>
      </Modal>
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
  if (placarA > placarB) resultado = `Vencedor: ${timeA?.nome ?? 'Time A'}`;
  else if (placarB > placarA) resultado = `Vencedor: ${timeB?.nome ?? 'Time B'}`;
  else resultado = 'Empate';
  return `Placar ${placarA} × ${placarB}. ${resultado}. Após finalizar, o jogo fica imutável e os pontos vão para o ranking.`;
}

function ColunaEventos({ time, esporte, ladoEvento, onEvento }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1 font-medium truncate">
        {time?.nome ?? `Time ${ladoEvento}`}
      </p>
      <div className="space-y-1">
        {(esporte.regras || []).map((r) => {
          const placarMostrar = r.placarACausa ?? r.pontosACausa ?? 0;
          return (
            <button
              key={r.id}
              onClick={() => onEvento(r, ladoEvento)}
              className="w-full text-left bg-surface/60 hover:bg-surface border border-white/10 hover:border-accent/40 text-text rounded-lg px-3 py-2 text-sm transition active:scale-95"
            >
              <span className="font-medium">{r.nome}</span>
              {placarMostrar !== 0 && (
                <span className="text-xs text-slate-400 ml-2">
                  ({placarMostrar > 0 ? '+' : ''}{placarMostrar})
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
                    {ev.regraNome} — {time?.nome ?? '?'}
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
