import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useTimes, useJogos } from '../../hooks/useDados.js';
import Button from '../common/Button.jsx';
import Modal from '../common/Modal.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import ColorPicker from '../common/ColorPicker.jsx';
import { criarTime, atualizarTime, removerTime } from '../../services/firestore.js';

const PALETA_DEFAULT = '#3b82f6';

export default function TimesManager() {
  const { data: times } = useTimes();
  const { data: jogos } = useJogos();
  const [editando, setEditando] = useState(null);
  const [removendo, setRemovendo] = useState(null);

  function abrirNovo() {
    setEditando({ id: null, nome: '', cor: PALETA_DEFAULT });
  }

  async function salvar() {
    if (!editando.nome.trim()) return;
    if (editando.id) {
      await atualizarTime(editando.id, { nome: editando.nome, cor: editando.cor });
    } else {
      await criarTime({ nome: editando.nome, cor: editando.cor });
    }
    setEditando(null);
  }

  async function confirmarRemocao() {
    await removerTime(removendo.id);
    setRemovendo(null);
  }

  const jogosVinculados = removendo
    ? jogos.filter((j) => j.timeAId === removendo.id || j.timeBId === removendo.id).length
    : 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Times</h2>
        <Button size="sm" onClick={abrirNovo}>
          <Plus size={16} /> Novo
        </Button>
      </div>

      {times.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum time cadastrado.</p>
      ) : (
        <ul className="space-y-2">
          {times.map((t) => (
            <li key={t.id} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
              <span
                className="w-5 h-5 rounded-full flex-shrink-0"
                style={{ backgroundColor: t.cor }}
              />
              <span className="flex-1 font-medium">{t.nome}</span>
              <button onClick={() => setEditando({ ...t })} className="text-slate-500 hover:text-slate-900 p-1">
                <Pencil size={16} />
              </button>
              <button onClick={() => setRemovendo(t)} className="text-slate-500 hover:text-red-600 p-1">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!editando}
        onClose={() => setEditando(null)}
        title={editando?.id ? 'Editar time' : 'Novo time'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!editando?.nome?.trim()}>Salvar</Button>
          </>
        }
      >
        {editando && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Nome</label>
              <input
                type="text"
                value={editando.nome}
                onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                className="w-full border border-slate-600 bg-slate-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Cor</label>
              <ColorPicker
                value={editando.cor}
                onChange={(cor) => setEditando({ ...editando, cor })}
              />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!removendo}
        onClose={() => setRemovendo(null)}
        onConfirm={confirmarRemocao}
        title="Remover time?"
        message={
          jogosVinculados > 0
            ? `Atenção: este time tem ${jogosVinculados} jogo(s) vinculado(s). Remover o time deixará referências quebradas. Tem certeza?`
            : 'Esta ação é permanente.'
        }
        confirmLabel="Remover"
        destrutivo
      />
    </section>
  );
}
