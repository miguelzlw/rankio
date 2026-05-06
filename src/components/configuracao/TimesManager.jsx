import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useTimes, useJogos } from '../../hooks/useDados.js';
import Button from '../common/Button.jsx';
import Modal from '../common/Modal.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import ColorPicker from '../common/ColorPicker.jsx';
import { useToast } from '../common/ToastProvider.jsx';
import { criarTime, atualizarTime, removerTime } from '../../services/firestore.js';

const PALETA_DEFAULT = '#3b82f6';

export default function TimesManager() {
  const { data: times } = useTimes();
  const { data: jogos } = useJogos();
  const [editando, setEditando] = useState(null);
  const [removendo, setRemovendo] = useState(null);
  const toast = useToast();

  function abrirNovo() {
    setEditando({ id: null, nome: '', cor: PALETA_DEFAULT });
  }

  async function salvar() {
    if (!editando.nome.trim()) return;
    try {
      if (editando.id) {
        await atualizarTime(editando.id, { nome: editando.nome, cor: editando.cor });
        toast.success(`Time "${editando.nome}" atualizado.`);
      } else {
        await criarTime({ nome: editando.nome, cor: editando.cor });
        toast.success(`Time "${editando.nome}" criado.`);
      }
      setEditando(null);
    } catch (error) {
      console.error('Erro ao salvar time:', error);
      toast.error('Erro ao salvar. Verifique a conexão com o Firestore.');
    }
  }

  async function confirmarRemocao() {
    try {
      const nome = removendo.nome;
      await removerTime(removendo.id);
      setRemovendo(null);
      toast.success(`Time "${nome}" removido.`);
    } catch (error) {
      console.error('Erro ao remover time:', error);
      toast.error('Erro ao remover. Tente novamente.');
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
        <p className="text-sm text-slate-400 bg-surface/30 border border-dashed border-white/10 rounded-xl p-4 text-center">
          Nenhum time cadastrado. Clique em <strong className="text-text">Novo</strong> para começar.
        </p>
      ) : (
        <ul className="space-y-2">
          {times.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 bg-surface/50 border border-white/10 rounded-xl p-3 transition hover:bg-surface/70 hover:border-white/20"
            >
              <span
                className="w-6 h-6 rounded-lg flex-shrink-0 ring-2 ring-white/10"
                style={{
                  backgroundColor: t.cor,
                  boxShadow: `0 2px 8px -2px ${t.cor}80`,
                }}
              />
              <span className="flex-1 font-medium text-text truncate">{t.nome}</span>
              <button
                onClick={() => setEditando({ ...t })}
                className="text-slate-400 hover:text-accent p-1 transition"
                aria-label="Editar"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => setRemovendo(t)}
                className="text-slate-400 hover:text-red-400 p-1 transition"
                aria-label="Remover"
              >
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
                className="w-full border border-white/20 bg-black/20 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder-white/30"
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
