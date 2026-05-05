import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useEsportes, useTimes } from '../../hooks/useDados.js';
import Button from '../common/Button.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import EsporteWizard from './EsporteWizard.jsx';
import { removerEsporte } from '../../services/firestore.js';

export default function EsportesManager() {
  const { data: esportes } = useEsportes();
  const { data: times } = useTimes();
  const [wizardAberto, setWizardAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [removendo, setRemovendo] = useState(null);

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
        <p className="text-sm text-slate-500">Nenhum esporte cadastrado.</p>
      ) : (
        <ul className="space-y-2">
          {esportes.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm"
            >
              <div className="flex-1">
                <p className="font-medium">{e.nome}</p>
                <p className="text-xs text-slate-500">
                  {e.tipo === '1v1' ? '1v1' : 'Coletivo'}
                  {e.formato && ' • ' + (e.formato === 'mata-mata' ? 'Mata-mata' : 'Grupos+MM')}
                  {' • '}
                  {e.timesParticipantes?.length ?? 0} times
                </p>
              </div>
              <button onClick={() => abrirEdicao(e)} className="text-slate-500 hover:text-slate-900 p-1">
                <Pencil size={16} />
              </button>
              <button onClick={() => setRemovendo(e)} className="text-slate-500 hover:text-red-600 p-1">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
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
        title="Remover esporte?"
        message="Todos os jogos associados a este esporte também serão removidos."
        confirmLabel="Remover"
        destrutivo
      />
    </section>
  );
}
