import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import Button from '../common/Button.jsx';
import Modal from '../common/Modal.jsx';
import { criarEsporte, atualizarEsporte } from '../../services/firestore.js';

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

const REGRAS_PADRAO_1V1 = [
  { id: genId('r'), nome: 'Gol', pontosACausa: 2, pontosBSofre: -1 },
  { id: genId('r'), nome: 'Vitória', pontosACausa: 5, pontosBSofre: 0 },
];
const REGRAS_PADRAO_COLETIVO = [
  { id: genId('r'), nome: 'Vitória', pontosACausa: 3, pontosBSofre: -1 },
];

export default function EsporteWizard({ open, onClose, esporteEdicao, times }) {
  const editando = !!esporteEdicao;
  const [passo, setPasso] = useState(editando ? 2 : 1);
  const [tipo, setTipo] = useState(esporteEdicao?.tipo ?? '1v1');
  const [nome, setNome] = useState(esporteEdicao?.nome ?? '');
  const [formato, setFormato] = useState(esporteEdicao?.formato ?? 'mata-mata');
  const [numGrupos, setNumGrupos] = useState(esporteEdicao?.config?.numGrupos ?? 2);
  const [timesQueAvancam, setTimesQueAvancam] = useState(
    esporteEdicao?.config?.timesQueAvancam ?? 2
  );
  const [numRodadas, setNumRodadas] = useState(esporteEdicao?.config?.numRodadas ?? 3);
  const [regras, setRegras] = useState(
    esporteEdicao?.regras?.length
      ? esporteEdicao.regras
      : tipo === '1v1'
        ? REGRAS_PADRAO_1V1
        : REGRAS_PADRAO_COLETIVO
  );
  const [participantes, setParticipantes] = useState(
    esporteEdicao?.timesParticipantes ?? times.map((t) => t.id)
  );

  function trocarTipo(novoTipo) {
    setTipo(novoTipo);
    setRegras(novoTipo === '1v1' ? [...REGRAS_PADRAO_1V1] : [...REGRAS_PADRAO_COLETIVO]);
  }

  async function salvar() {
    try {
      const config = tipo === '1v1' && formato === 'grupos-mata-mata'
        ? { numGrupos: Number(numGrupos), timesQueAvancam: Number(timesQueAvancam) }
        : tipo === 'coletivo'
          ? { numRodadas: Number(numRodadas) }
          : {};

      const dados = {
        nome,
        tipo,
        formato: tipo === '1v1' ? formato : null,
        config,
        regras,
        timesParticipantes: participantes,
      };

      if (editando) {
        atualizarEsporte(esporteEdicao.id, dados).catch(e => console.error(e));
      } else {
        criarEsporte(dados).catch(e => console.error(e));
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar esporte:', error);
      alert('Erro ao salvar. Verifique sua conexão ou dados e tente novamente.');
    }
  }

  function fechar() {
    setPasso(editando ? 2 : 1);
    onClose();
  }

  const podeAvancarP1 = !!nome.trim();
  const podeAvancarP2 =
    tipo === '1v1'
      ? formato === 'mata-mata' || (numGrupos > 0 && timesQueAvancam > 0)
      : numRodadas > 0;
  const podeAvancarP3 = regras.length > 0 && regras.every((r) => r.nome.trim());
  const podeSalvar = participantes.length >= 2;

  return (
    <Modal
      open={open}
      onClose={fechar}
      title={editando ? `Editar ${esporteEdicao.nome}` : 'Novo esporte'}
      footer={
        <>
          {passo > 1 && !editando && (
            <Button variant="ghost" onClick={() => setPasso(passo - 1)}>
              Voltar
            </Button>
          )}
          {passo < 4 ? (
            <Button
              onClick={() => setPasso(passo + 1)}
              disabled={
                (passo === 1 && !podeAvancarP1) ||
                (passo === 2 && !podeAvancarP2) ||
                (passo === 3 && !podeAvancarP3)
              }
            >
              Próximo
            </Button>
          ) : (
            <Button onClick={salvar} disabled={!podeSalvar}>
              {editando ? 'Salvar' : 'Criar'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-xs text-slate-500">Passo {passo} de 4</div>

        {passo === 1 && (
          <>
            <div>
              <label className="text-sm font-medium block mb-1 text-slate-300">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Futsal masculino"
                className="w-full border border-white/20 bg-black/20 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder-white/30"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                <TipoBtn ativo={tipo === '1v1'} onClick={() => trocarTipo('1v1')}>
                  <strong>1v1</strong>
                  <p className="text-xs text-slate-500 mt-1">Placar detalhado (futsal etc.)</p>
                </TipoBtn>
                <TipoBtn ativo={tipo === 'coletivo'} onClick={() => trocarTipo('coletivo')}>
                  <strong>Coletivo</strong>
                  <p className="text-xs text-slate-500 mt-1">Só ganhador (torta na cara etc.)</p>
                </TipoBtn>
              </div>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            {editando && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs">
                Alterar regras NÃO recalcula jogos já finalizados.
              </div>
            )}
            {tipo === '1v1' ? (
              <>
                <div>
                  <label className="text-sm font-medium block mb-2">Formato</label>
                  <div className="space-y-2">
                    <FormatoBtn
                      ativo={formato === 'mata-mata'}
                      onClick={() => setFormato('mata-mata')}
                      label="Mata-mata direto"
                      desc="Eliminatório clássico, com byes se necessário"
                    />
                    <FormatoBtn
                      ativo={formato === 'grupos-mata-mata'}
                      onClick={() => setFormato('grupos-mata-mata')}
                      label="Fase de grupos + mata-mata"
                      desc="Round-robin nos grupos, depois eliminatórias"
                    />
                  </div>
                </div>
                {formato === 'grupos-mata-mata' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium block mb-1 text-slate-300">Quantos grupos</label>
                      <input
                        type="number"
                        min="1"
                        value={numGrupos}
                        onChange={(e) => setNumGrupos(e.target.value)}
                        className="w-full border border-white/20 bg-black/20 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1 text-slate-300">Avançam por grupo</label>
                      <input
                        type="number"
                        min="1"
                        value={timesQueAvancam}
                        onChange={(e) => setTimesQueAvancam(e.target.value)}
                        className="w-full border border-white/20 bg-black/20 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <label className="text-sm font-medium block mb-1 text-slate-300">Quantas rodadas</label>
                <input
                  type="number"
                  min="1"
                  value={numRodadas}
                  onChange={(e) => setNumRodadas(e.target.value)}
                  className="w-full border border-white/20 bg-black/20 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            )}
          </>
        )}

        {passo === 3 && (
          <>
            <p className="text-sm text-slate-600">
              Defina os eventos pontuáveis. <strong>Causa</strong> é o que o time que fez ganha;{' '}
              <strong>Sofre</strong> é o que o adversário sofre.
            </p>
            <ul className="space-y-2">
              {regras.map((r, i) => (
                <li key={r.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={r.nome}
                    onChange={(e) => {
                      const novas = [...regras];
                      novas[i] = { ...r, nome: e.target.value };
                      setRegras(novas);
                    }}
                    placeholder="Nome"
                    className="flex-1 min-w-0 border border-white/20 bg-black/20 text-white rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder-white/30"
                  />
                  <input
                    type="number"
                    value={r.pontosACausa}
                    onChange={(e) => {
                      const novas = [...regras];
                      novas[i] = { ...r, pontosACausa: Number(e.target.value) };
                      setRegras(novas);
                    }}
                    title="Pontos pra quem causa"
                    className="w-16 border border-white/20 bg-black/20 text-white rounded-lg px-2 py-1 text-sm tabular-nums focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <input
                    type="number"
                    value={r.pontosBSofre}
                    onChange={(e) => {
                      const novas = [...regras];
                      novas[i] = { ...r, pontosBSofre: Number(e.target.value) };
                      setRegras(novas);
                    }}
                    title="Pontos pra quem sofre"
                    className="w-16 border border-white/20 bg-black/20 text-white rounded-lg px-2 py-1 text-sm tabular-nums focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <button
                    onClick={() => setRegras(regras.filter((x) => x.id !== r.id))}
                    className="text-slate-400 hover:text-red-600 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setRegras([
                  ...regras,
                  { id: genId('r'), nome: '', pontosACausa: 1, pontosBSofre: 0 },
                ])
              }
            >
              <Plus size={14} /> Adicionar regra
            </Button>
          </>
        )}

        {passo === 4 && (
          <>
            <p className="text-sm text-slate-600">Selecione quem participa:</p>
            <ul className="space-y-1 max-h-72 overflow-auto">
              {times.map((t) => {
                const ativo = participantes.includes(t.id);
                return (
                  <li key={t.id}>
                    <label className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-lg p-2 cursor-pointer hover:bg-white/5 transition">
                      <input
                        type="checkbox"
                        checked={ativo}
                        onChange={() => {
                          setParticipantes(
                            ativo
                              ? participantes.filter((id) => id !== t.id)
                              : [...participantes, t.id]
                          );
                        }}
                        className="w-4 h-4 accent-accent"
                      />
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: t.cor }}
                      />
                      <span className="flex-1 text-slate-200">{t.nome}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-slate-500">
              {participantes.length} de {times.length} times selecionados
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}

function TipoBtn({ ativo, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-3 rounded-lg border-2 transition ${
        ativo ? 'border-accent bg-accent/20 text-accent' : 'border-white/10 bg-black/20 text-slate-300 hover:border-white/30'
      }`}
    >
      {children}
    </button>
  );
}

function FormatoBtn({ ativo, onClick, label, desc }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border-2 transition ${
        ativo ? 'border-accent bg-accent/20 text-accent' : 'border-white/10 bg-black/20 text-slate-300 hover:border-white/30'
      }`}
    >
      <div className="font-medium">{label}</div>
      <div className={`text-xs mt-0.5 ${ativo ? 'text-accent/80' : 'text-slate-500'}`}>{desc}</div>
    </button>
  );
}
