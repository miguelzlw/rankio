import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pause, Play, Trash2, Flag, RotateCcw } from 'lucide-react';
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
  const empate = jogo.pontosTimeA === jogo.pontosTimeB;
  const podeFinalizar = !(ehMataMata && empate);

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

  async function handleFinalizar() {
    setConfirmarFim(false);
    cronometro.pausar();
    const resultado = await finalizarJogo(jogo, esporte, jogos);
    if (!resultado.ok) {
      setErro('Não é possível finalizar com placar empatado em jogo de mata-mata. Lance mais eventos para desempatar.');
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
        <div className="bg-slate-900 text-white rounded-xl p-4 mb-4 flex items-center justify-between">
          <div className="text-4xl font-bold tabular-nums font-mono">
            {formatarTempo(cronometro.tempoMs)}
          </div>
          <div className="flex gap-2">
            {cronometro.estado === 'rodando' ? (
              <button onClick={cronometro.pausar} className="bg-white/10 hover:bg-white/20 rounded-lg p-2">
                <Pause size={20} />
              </button>
            ) : (
              <button onClick={cronometro.estado === 'parado' ? cronometro.start : cronometro.retomar} className="bg-white/10 hover:bg-white/20 rounded-lg p-2">
                <Play size={20} />
              </button>
            )}
            <button onClick={cronometro.reset} className="bg-white/10 hover:bg-white/20 rounded-lg p-2">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Placar */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <PlacarTime
          time={timeA}
          pontos={jogo.pontosTimeA ?? 0}
          flash={flashA}
          fallback="Time A"
        />
        <PlacarTime
          time={timeB}
          pontos={jogo.pontosTimeB ?? 0}
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
          <section className="grid grid-cols-2 gap-2 mb-4">
            <div>
              <p className="text-xs text-slate-400 mb-1 font-medium truncate">
                {timeA?.nome ?? 'Time A'}
              </p>
              <div className="space-y-1">
                {esporte.regras.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleEvento(r, 'A')}
                    className="w-full text-left bg-surface/60 hover:bg-surface border border-white/10 hover:border-accent/40 text-text rounded-lg px-3 py-2 text-sm transition active:scale-95"
                  >
                    <span className="font-medium">{r.nome}</span>
                    <span className="text-xs text-slate-400 ml-2">
                      ({r.pontosACausa > 0 ? '+' : ''}{r.pontosACausa})
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1 font-medium truncate">
                {timeB?.nome ?? 'Time B'}
              </p>
              <div className="space-y-1">
                {esporte.regras.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleEvento(r, 'B')}
                    className="w-full text-left bg-surface/60 hover:bg-surface border border-white/10 hover:border-accent/40 text-text rounded-lg px-3 py-2 text-sm transition active:scale-95"
                  >
                    <span className="font-medium">{r.nome}</span>
                    <span className="text-xs text-slate-400 ml-2">
                      ({r.pontosACausa > 0 ? '+' : ''}{r.pontosACausa})
                    </span>
                  </button>
                ))}
              </div>
            </div>
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
                        className="text-slate-400 hover:text-red-600 p-1"
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
            <p className="text-xs text-amber-700 mt-2 text-center">
              Empate em mata-mata: lance um evento desempatador antes de finalizar.
            </p>
          )}
        </>
      )}

      {jogo.status === 'finalizado' && (
        <>
          <section className="bg-surface/50 border border-white/10 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Resultado</h3>
            <p className="text-text">
              {jogo.vencedor === jogo.timeAId
                ? `Vencedor: ${timeA?.nome}`
                : jogo.vencedor === jogo.timeBId
                  ? `Vencedor: ${timeB?.nome}`
                  : 'Empate'}
            </p>
            {jogo.bye && (
              <p className="text-xs text-slate-400 mt-1">Avanço por bye (W.O.).</p>
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
      )}

      <ConfirmDialog
        open={confirmarFim}
        onClose={() => setConfirmarFim(false)}
        onConfirm={handleFinalizar}
        title="Finalizar partida?"
        message="Após finalizar, o jogo fica imutável e a pontuação é aplicada ao ranking."
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

      <Modal open={!!erro} onClose={() => setErro(null)} title="Atenção">
        <p>{erro}</p>
      </Modal>
    </div>
  );
}

function PlacarTime({ time, pontos, flash, fallback }) {
  const cor = time?.cor || '#94a3b8';
  return (
    <div
      className="rounded-xl p-4 text-white shadow-sm"
      style={{ backgroundColor: cor }}
    >
      <p className="text-xs font-medium opacity-90 truncate">{time?.nome ?? fallback}</p>
      <p className={`text-5xl font-bold tabular-nums mt-1 ${flash ? 'animate-flash' : ''}`}>
        {pontos}
      </p>
    </div>
  );
}
