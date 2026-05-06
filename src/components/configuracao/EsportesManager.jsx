import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useEsportes, useTimes, useJogos } from '../../hooks/useDados.js';
import Button from '../common/Button.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import EsporteWizard from './EsporteWizard.jsx';
import { removerEsporte } from '../../services/firestore.js';

export default function EsportesManager() {
  const { data: esportes } = useEsportes();
  const { data: times } = useTimes();
  const { data: jogos } = useJogos();
  const [wizardAberto, setWizardAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [removendo, setRemovendo] = useState(null);

  const jogosVinculados = removendo
    ? jogos.filter((j) => j.esporteId === removendo.id).length
    : 0;

  function abrirNovo() {
    setEditando(null);
    setWizardAberto(true);
  }

  function abrirEdicao(esporte) {
    setEditando(esporte);
    setWizardAberto(true);
  }

  async function confirmarRemocao() {
    await removerEsporte(removendo.id);
    setRemovendo(null);
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Esportes</h2>
        <Button size="sm" onClick={abrirNovo} disabled={times.length < 2}>
          <Plus size={16} /> Novo
        </Button>
      </div>
      {times.length < 2 && (
        <p className="text-xs text-slate-500 mb-2">
          Cadastre ao menos 2 times antes de criar esportes.
        </p>
      )}
      {esportes.length === 0 ? (
        <p className="text-sm text-slate-400 bg-surface/30 border border-dashed border-white/10 rounded-xl p-4 text-center">
          Nenhum esporte cadastrado.
        </p>
      ) : (
        <ul className="space-y-2">
          {esportes.map((e) => {
            const pVenc = e.pontosVencedor ?? 0;
            const pPerd = e.pontosPerdedor ?? 0;
            const pEmp = e.pontosEmpate ?? 0;
            const ehMataMataPuro = e.tipo === '1v1' && e.formato === 'mata-mata';
            return (
              <li
                key={e.id}
                className="flex items-center gap-3 bg-surface/50 border border-white/10 rounded-xl p-3 transition hover:bg-surface/70 hover:border-white/20"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text truncate">{e.nome}</p>
                  <p className="text-xs text-slate-400 mb-1.5">
                    {e.tipo === '1v1' ? '1v1' : 'Coletivo'}
                    {e.formato && ' • ' + (e.formato === 'mata-mata' ? 'Mata-mata' : 'Grupos+MM')}
                    {' • '}
                    {e.timesParticipantes?.length ?? 0} times
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-bold tabular-nums">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                      V {pVenc > 0 ? '+' : ''}{pVenc}
                    </span>
                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded">
                      D {pPerd > 0 ? '+' : ''}{pPerd}
                    </span>
                    {!ehMataMataPuro && (
                      <span className="bg-slate-500/10 text-slate-300 border border-slate-500/20 px-1.5 py-0.5 rounded">
                        E {pEmp > 0 ? '+' : ''}{pEmp}
                      </span>
                    )}
                    <span className="bg-white/5 text-slate-400 border border-white/10 px-1.5 py-0.5 rounded">
                      {(e.regras || []).length} eventos
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => abrirEdicao(e)}
                  className="text-slate-400 hover:text-accent p-1 transition"
                  aria-label="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setRemovendo(e)}
                  className="text-slate-400 hover:text-red-400 p-1 transition"
                  aria-label="Remover"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {wizardAberto && (
        <EsporteWizard
          open={wizardAberto}
          onClose={() => setWizardAberto(false)}
          esporteEdicao={editando}
          times={times}
        />
      )}

      <ConfirmDialog
        open={!!removendo}
        onClose={() => setRemovendo(null)}
        onConfirm={confirmarRemocao}
        title={`Remover ${removendo?.nome ?? ''}?`}
        message={
          jogosVinculados > 0
            ? `Isso vai apagar também os ${jogosVinculados} jogo(s) deste esporte (incluindo finalizados — que somem do ranking). Tem certeza?`
            : 'Esta ação é permanente.'
        }
        confirmLabel="Remover"
        destrutivo
      />
    </section>
  );
}
