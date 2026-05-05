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
    try {
      // Salva de forma "otimista" no Firebase, sem esperar (await) para fechar a tela.
      // O SDK do Firebase atualizará a UI imediatamente usando cache local.
      if (editando.id) {
        atualizarTime(editando.id, { nome: editando.nome, cor: editando.cor }).catch(e => console.error(e));
      } else {
        criarTime({ nome: editando.nome, cor: editando.cor }).catch(e => console.error(e));
      }
      setEditando(null);
    } catch (error) {
      console.error('Erro ao salvar time:', error);
      alert('Não foi possível salvar o time. Verifique sua conexão e tente novamente.');
    }
  }

  async function confirmarRemocao() {
    try {
      await removerTime(removendo.id);
      setRemovendo(null);
    } catch (error) {
      console.error('Erro ao remover time:', error);
      alert('Erro ao remover. Tente novamente.');
    }
  }

  const jogosVinculados = removendo
    ? jogos.filter((j) => j.timeAId === removendo.id || j.timeBId === removendo.id).length
    : 0;

  const coresUsadas = times.map((t) => t.cor).filter((c) => c !== editando?.cor);

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
            <li key={t.id} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/30 rounded-xl p-3 transition hover:bg-slate-800/70">
              <span
                className="w-5 h-5 rounded-full flex-shrink-0"
                style={{ backgroundColor: t.cor }}
              />
              <span className="flex-1 font-medium text-slate-200">{t.nome}</span>
              <button onClick={() => setEditando({ ...t })} className="text-slate-400 hover:text-blue-400 p-1 transition">
                <Pencil size={16} />
              </button>
              <button onClick={() => setRemovendo(t)} className="text-slate-400 hover:text-red-400 p-1 transition">
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
              <label className="text-sm font-medium block mb-1 text-slate-300">Nome</label>
              <input
                type="text"
                value={editando.nome}
                onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                className="w-full border border-slate-600 bg-slate-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                placeholder="Ex: Time Brasil"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2 text-slate-300">Cor</label>
              <ColorPicker
                value={editando.cor}
                onChange={(cor) => setEditando({ ...editando, cor })}
                usedColors={coresUsadas}
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
