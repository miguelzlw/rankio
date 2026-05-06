import { useState } from 'react';
import { Trash2, Plus, Trophy, X, Minus } from 'lucide-react';
import Button from '../common/Button.jsx';
import Modal from '../common/Modal.jsx';
import { criarEsporte, atualizarEsporte } from '../../services/firestore.js';

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// Regras padrao do modelo NOVO: separam placar (gols) dos pontos do torneio.
// "Vitoria" virou um campo do esporte (pontosVencedor), nao mais regra.
const REGRAS_PADRAO_1V1 = [
  { id: genId('r'), nome: 'Gol', placarACausa: 1, placarBSofre: 0, pontosACausa: 0, pontosBSofre: 0 },
];
const REGRAS_PADRAO_COLETIVO = [];

const PASSO_NOMES = ['Tipo', 'Formato', 'Pontuação', 'Participantes'];

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
  const [pontosVencedor, setPontosVencedor] = useState(esporteEdicao?.pontosVencedor ?? 5);
  const [pontosPerdedor, setPontosPerdedor] = useState(esporteEdicao?.pontosPerdedor ?? 0);
  const [pontosEmpate, setPontosEmpate] = useState(esporteEdicao?.pontosEmpate ?? 1);
  const [regras, setRegras] = useState(
    esporteEdicao?.regras?.length
      ? migrarRegrasAntigas(esporteEdicao.regras)
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
        pontosVencedor: Number(pontosVencedor) || 0,
        pontosPerdedor: Number(pontosPerdedor) || 0,
        pontosEmpate: Number(pontosEmpate) || 0,
      };

      if (editando) {
        await atualizarEsporte(esporteEdicao.id, dados);
      } else {
        await criarEsporte(dados);
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar esporte:', error);
      alert('Ocorreu um erro no banco de dados. Tente novamente.');
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
  const podeAvancarP3 = regras.every((r) => r.nome.trim());
  const podeSalvar = participantes.length >= 2;

  // Em mata-mata 1v1 nao se permite empate, entao escondemos o campo.
  const ehMataMataPuro = tipo === '1v1' && formato === 'mata-mata';

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
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          {PASSO_NOMES.map((n, i) => (
            <span
              key={i}
              className={`flex-1 h-1 rounded-full transition ${
                i + 1 <= passo ? 'bg-accent' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <div className="text-xs text-slate-400">
          Passo {passo} de 4 — <span className="text-slate-200">{PASSO_NOMES[passo - 1]}</span>
        </div>

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
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg p-3 text-xs">
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
          <div className="space-y-5">
            {/* Pontos por resultado */}
            <section>
              <h3 className="text-sm font-semibold text-slate-200 mb-1 flex items-center gap-2">
                <Trophy size={14} className="text-accent" />
                Pontos no torneio por resultado
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                Aplicados automaticamente ao finalizar o jogo, conforme o placar.
              </p>
              <div className={`grid gap-2 ${ehMataMataPuro ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <CampoPontos
                  label="Vencedor"
                  cor="text-emerald-400"
                  valor={pontosVencedor}
                  onChange={setPontosVencedor}
                />
                <CampoPontos
                  label="Perdedor"
                  cor="text-red-400"
                  valor={pontosPerdedor}
                  onChange={setPontosPerdedor}
                />
                {!ehMataMataPuro && (
                  <CampoPontos
                    label="Empate"
                    cor="text-slate-300"
                    valor={pontosEmpate}
                    onChange={setPontosEmpate}
                  />
                )}
              </div>
            </section>

            {/* Eventos do jogo */}
            <section>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">Eventos do jogo</h3>
              <p className="text-xs text-slate-400 mb-3">
                Eventos pontuáveis durante a partida (ex: gol, falta). Cada evento afeta o
                <strong className="text-slate-200"> placar </strong>
                (gols) e opcionalmente os
                <strong className="text-slate-200"> pontos do torneio </strong>
                (bônus extra).
              </p>

              {regras.length > 0 && (
                <div className="mb-2 grid grid-cols-[1fr_56px_56px_56px_56px_24px] gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider px-1">
                  <span>Nome</span>
                  <span className="text-center">Placar +</span>
                  <span className="text-center">Placar adv.</span>
                  <span className="text-center">Torneio +</span>
                  <span className="text-center">Torneio adv.</span>
                  <span />
                </div>
              )}

              <ul className="space-y-1.5">
                {regras.map((r, i) => (
                  <li
                    key={r.id}
                    className="grid grid-cols-[1fr_56px_56px_56px_56px_24px] gap-1.5 items-center"
                  >
                    <input
                      type="text"
                      value={r.nome}
                      onChange={(e) => atualizarRegra(regras, setRegras, i, 'nome', e.target.value)}
                      placeholder="Ex: Gol"
                      className="min-w-0 border border-white/20 bg-black/20 text-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-accent placeholder-white/30"
                    />
                    <NumInput
                      valor={r.placarACausa ?? 0}
                      onChange={(v) => atualizarRegra(regras, setRegras, i, 'placarACausa', v)}
                    />
                    <NumInput
                      valor={r.placarBSofre ?? 0}
                      onChange={(v) => atualizarRegra(regras, setRegras, i, 'placarBSofre', v)}
                    />
                    <NumInput
                      valor={r.pontosACausa ?? 0}
                      onChange={(v) => atualizarRegra(regras, setRegras, i, 'pontosACausa', v)}
                    />
                    <NumInput
                      valor={r.pontosBSofre ?? 0}
                      onChange={(v) => atualizarRegra(regras, setRegras, i, 'pontosBSofre', v)}
                    />
                    <button
                      onClick={() => setRegras(regras.filter((x) => x.id !== r.id))}
                      className="text-slate-500 hover:text-red-400 p-1 transition"
                      aria-label="Remover regra"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>

              {regras.length === 0 && (
                <div className="bg-black/20 border border-dashed border-white/15 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400 mb-1">Sem eventos definidos</p>
                  <p className="text-[11px] text-slate-500">
                    {tipo === 'coletivo'
                      ? 'OK para esportes sem placar (torta na cara etc.) — você só escolhe o vencedor.'
                      : 'Adicione pelo menos um evento (ex: Gol).'}
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() =>
                  setRegras([
                    ...regras,
                    {
                      id: genId('r'),
                      nome: '',
                      placarACausa: 1,
                      placarBSofre: 0,
                      pontosACausa: 0,
                      pontosBSofre: 0,
                    },
                  ])
                }
              >
                <Plus size={14} /> Adicionar evento
              </Button>
            </section>
          </div>
        )}

        {passo === 4 && (
          <>
            <p className="text-sm text-slate-300">Selecione quem participa:</p>
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

function atualizarRegra(regras, setRegras, idx, campo, valor) {
  const novas = [...regras];
  novas[idx] = {
    ...novas[idx],
    [campo]: campo === 'nome' ? valor : Number(valor) || 0,
  };
  setRegras(novas);
}

// Migra regras do modelo antigo (so pontosACausa/pontosBSofre) para o modelo novo:
// trata os pontos antigos como placar (afinal antes era a unica medida).
function migrarRegrasAntigas(regras) {
  return regras.map((r) => {
    if (r.placarACausa !== undefined) return r; // ja eh do modelo novo
    return {
      ...r,
      placarACausa: r.pontosACausa ?? 0,
      placarBSofre: r.pontosBSofre ?? 0,
      pontosACausa: 0,
      pontosBSofre: 0,
    };
  });
}

function NumInput({ valor, onChange }) {
  return (
    <input
      type="number"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-white/15 bg-black/20 text-white rounded-lg px-1 py-1.5 text-sm tabular-nums text-center focus:outline-none focus:border-accent"
    />
  );
}

function CampoPontos({ label, cor, valor, onChange }) {
  return (
    <label className="block">
      <span className={`block text-xs font-semibold mb-1 ${cor}`}>{label}</span>
      <input
        type="number"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-white/20 bg-black/20 text-white rounded-lg px-2 py-2 text-sm tabular-nums text-center font-bold focus:outline-none focus:border-accent"
      />
    </label>
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
