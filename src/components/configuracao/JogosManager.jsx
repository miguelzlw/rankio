import { useState } from 'react';
import { Trash2, Wand2 } from 'lucide-react';
import { useEsportes, useJogos, useTimes } from '../../hooks/useDados.js';
import Button from '../common/Button.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import Badge from '../common/Badge.jsx';
import TimeChip from '../common/TimeChip.jsx';
import { gerarChaveamento, removerJogo } from '../../services/firestore.js';

export default function JogosManager() {
  const { data: esportes } = useEsportes();
  const { data: jogos } = useJogos();
  const { data: times } = useTimes();
  const [esporteSelecionado, setEsporteSelecionado] = useState('');
  const [confirmarGerar, setConfirmarGerar] = useState(false);
  const [removendo, setRemovendo] = useState(null);
  const [gerando, setGerando] = useState(false);

  const timesPorId = new Map(times.map((t) => [t.id, t]));
  const jogosFiltrados = esporteSelecionado
    ? jogos.filter((j) => j.esporteId === esporteSelecionado).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    : [];
  const esporte = esportes.find((e) => e.id === esporteSelecionado);

  async function handleGerar() {
    if (!esporte) return;
    setGerando(true);
    try {
      await gerarChaveamento(esporte, times);
    } finally {
      setGerando(false);
      setConfirmarGerar(false);
    }
  }

  async function confirmarRemocao() {
    await removerJogo(removendo.id);
    setRemovendo(null);
  }

  const temJogos = jogosFiltrados.length > 0;
  const participantesCount = esporte?.timesParticipantes?.length ?? 0;

  return (
    <section>
      <h2 className="font-semibold mb-3">Jogos</h2>

      <select
        value={esporteSelecionado}
        onChange={(e) => setEsporteSelecionado(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-3 bg-white"
      >
        <option value="">Selecione um esporte</option>
        {esportes.map((e) => (
          <option key={e.id} value={e.id}>{e.nome}</option>
        ))}
      </select>

      {esporte && (
        <>
          <Button
            variant={temJogos ? 'outline' : 'primary'}
            className="w-full mb-3"
            onClick={() => setConfirmarGerar(true)}
            disabled={participantesCount < 2 || gerando}
          >
            <Wand2 size={16} />
            {temJogos ? 'Regerar chaveamento' : 'Gerar chaveamento automático'}
          </Button>
          {participantesCount < 2 && (
            <p className="text-xs text-amber-700 mb-2">
              Esporte tem menos de 2 participantes. Edite-o primeiro.
            </p>
          )}

          {temJogos && (
            <ul className="space-y-2">
              {jogosFiltrados.map((j) => (
                <li
                  key={j.id}
                  className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <span>Jogo {j.ordem}</span>
                      <Badge status={j.status} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <TimeChip
                        time={timesPorId.get(j.timeAId)}
                        size="sm"
                        placeholder="A definir"
                      />
                      <span className="text-slate-400 text-xs">vs</span>
                      <TimeChip
                        time={timesPorId.get(j.timeBId)}
                        size="sm"
                        placeholder="A definir"
                      />
                    </div>
                  </div>
                  {j.status === 'agendado' ? (
                    <button
                      onClick={() => setRemovendo(j)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">imutável</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmarGerar}
        onClose={() => setConfirmarGerar(false)}
        onConfirm={handleGerar}
        title="Gerar chaveamento?"
        message={
          temJogos
            ? `Isso APAGA todos os ${jogosFiltrados.length} jogos atuais deste esporte e gera um novo chaveamento. Tem certeza?`
            : 'Isso vai gerar todos os jogos automaticamente. Você pode ajustar depois (apenas jogos agendados).'
        }
        confirmLabel={temJogos ? 'Apagar e regerar' : 'Gerar'}
        destrutivo={temJogos}
      />

      <ConfirmDialog
        open={!!removendo}
        onClose={() => setRemovendo(null)}
        onConfirm={confirmarRemocao}
        title="Remover jogo?"
        message="Apenas jogos agendados podem ser removidos. Esta ação é permanente."
        confirmLabel="Remover"
        destrutivo
      />
    </section>
  );
}
