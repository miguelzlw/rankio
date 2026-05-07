// Wrappers CRUD em cima do Firestore. Centraliza serverTimestamp e operacoes
// em batch que precisam ser atomicas (finalizar jogo + avancar bracket).

import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  getDocs,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { calcularPlacarJogo, aplicarPontosFinais, determinarVencedor } from './scoring.js';
import {
  gerarBracketMataMata,
  gerarFaseGrupos,
  gerarRodadasColetivo,
  gerarMataMataPosGrupos,
} from './brackets.js';

export const timesCol = () => collection(db, 'times');
export const esportesCol = () => collection(db, 'esportes');
export const jogosCol = () => collection(db, 'jogos');

// ========== TIMES ==========
export async function criarTime({ nome, cor, jogadores }) {
  const ref = doc(timesCol());
  await setDoc(ref, {
    id: ref.id,
    nome,
    cor,
    jogadores: jogadores ?? [],
    criadoEm: serverTimestamp(),
  });
  return ref.id;
}

export async function atualizarTime(id, dados) {
  await updateDoc(doc(db, 'times', id), { ...dados, atualizadoEm: serverTimestamp() });
}

export async function removerTime(id) {
  await deleteDoc(doc(db, 'times', id));
}

// ========== ESPORTES ==========
export async function criarEsporte({
  nome,
  tipo,
  formato,
  config,
  regras,
  timesParticipantes,
  pontosVencedor,
  pontosPerdedor,
  pontosEmpate,
  pontosCampeao,
  pontosVice,
  pontosTerceiro,
  registrarAutor,
}) {
  const ref = doc(esportesCol());
  await setDoc(ref, {
    id: ref.id,
    nome,
    tipo,
    formato: formato ?? null,
    config: config ?? {},
    regras: regras ?? [],
    timesParticipantes: timesParticipantes ?? [],
    pontosVencedor: pontosVencedor ?? 0,
    pontosPerdedor: pontosPerdedor ?? 0,
    pontosEmpate: pontosEmpate ?? 0,
    pontosCampeao: pontosCampeao ?? 0,
    pontosVice: pontosVice ?? 0,
    pontosTerceiro: pontosTerceiro ?? 0,
    registrarAutor: !!registrarAutor,
    criadoEm: serverTimestamp(),
  });
  return ref.id;
}

export async function atualizarEsporte(id, dados) {
  await updateDoc(doc(db, 'esportes', id), { ...dados, atualizadoEm: serverTimestamp() });
}

// Remove esporte e cascateia todos os jogos associados.
export async function removerEsporte(id) {
  const jogosSnap = await getDocs(query(jogosCol(), where('esporteId', '==', id)));
  const batch = writeBatch(db);
  jogosSnap.forEach((s) => batch.delete(s.ref));
  batch.delete(doc(db, 'esportes', id));
  await batch.commit();
}

// ========== JOGOS ==========
export async function atualizarJogo(id, dados) {
  await updateDoc(doc(db, 'jogos', id), dados);
}

export async function removerJogo(id) {
  await deleteDoc(doc(db, 'jogos', id));
}

export async function iniciarJogo(id) {
  await updateDoc(doc(db, 'jogos', id), {
    status: 'ao_vivo',
    iniciadoEm: serverTimestamp(),
  });
}

// Adiciona evento ao jogo e recalcula placar + pontos parciais.
// Usa transaction para evitar race condition: se o usuario clica eventos
// rapidamente, sem transaction o `jogo` em memoria pode estar desatualizado
// e um update sobrescreve o anterior. Transaction le o estado mais recente
// e escreve atomicamente — Firestore re-executa se houver conflito.
// Limpa vencedorOverride se o placar nao esta mais empatado (override eh
// pra desempate manual; se o placar resolveu naturalmente, override nao
// faz mais sentido).
export async function lancarEvento(jogo, regras, novoEvento) {
  const ref = doc(db, 'jogos', jogo.id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Jogo nao encontrado');
    const atual = snap.data();
    const eventos = [...(atual.eventos || []), novoEvento];
    const calc = calcularPlacarJogo(eventos, regras);
    const update = {
      eventos,
      placarTimeA: calc.placarTimeA,
      placarTimeB: calc.placarTimeB,
      pontosTimeA: calc.pontosTimeA,
      pontosTimeB: calc.pontosTimeB,
    };
    if (calc.placarTimeA !== calc.placarTimeB && atual.vencedorOverride) {
      update.vencedorOverride = null;
      update.vencedorPorDesempate = false;
    }
    tx.update(ref, update);
  });
}

// Remove evento e recalcula placar + pontos parciais (tambem com transaction).
export async function removerEvento(jogo, regras, eventoId) {
  const ref = doc(db, 'jogos', jogo.id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Jogo nao encontrado');
    const atual = snap.data();
    const eventos = (atual.eventos || []).filter((e) => e.id !== eventoId);
    const calc = calcularPlacarJogo(eventos, regras);
    const update = {
      eventos,
      placarTimeA: calc.placarTimeA,
      placarTimeB: calc.placarTimeB,
      pontosTimeA: calc.pontosTimeA,
      pontosTimeB: calc.pontosTimeB,
    };
    if (calc.placarTimeA !== calc.placarTimeB && atual.vencedorOverride) {
      update.vencedorOverride = null;
      update.vencedorPorDesempate = false;
    }
    tx.update(ref, update);
  });
}

// Define vencedor manualmente. Comportamento depende do placar atual:
//
// 1) Placar 0x0 (esporte coletivo sem regras, tipo torta na cara):
//    Coloca placar simbolico (1x0, 0x1 ou 1x1 em empate) pra refletir o resultado.
//
// 2) Placar nao-empate (ex: 3x2): MANTEM o placar atual e usa vencedorOverride
//    pra forcar o vencedor escolhido (caso o usuario queira contradizer o placar
//    — raro, mas possivel).
//
// 3) Placar empatado com gols (ex: 3x3) — caso de penaltis em mata-mata:
//    MANTEM o empate e usa vencedorOverride pra registrar quem ganhou no desempate.
//
// vencedorOverride eh lido por aplicarPontosFinais e finalizarJogo: se setado,
// vence ele em vez do calculo pelo placar.
export async function definirVencedorManual(jogo, vencedorTimeId) {
  const placarA = jogo.placarTimeA ?? 0;
  const placarB = jogo.placarTimeB ?? 0;
  const placarZerado = placarA === 0 && placarB === 0;

  const update = {};

  if (placarZerado) {
    // Placar simbolico
    if (vencedorTimeId === jogo.timeAId) {
      update.placarTimeA = 1;
      update.placarTimeB = 0;
    } else if (vencedorTimeId === jogo.timeBId) {
      update.placarTimeA = 0;
      update.placarTimeB = 1;
    } else {
      update.placarTimeA = 1;
      update.placarTimeB = 1;
    }
    // Sem override - placar simbolico ja decide o vencedor
    update.vencedorOverride = null;
    update.vencedorPorDesempate = false;
  } else {
    // Mantem placar. Usa override se contradiz o placar (ou eh empate).
    update.vencedorOverride = vencedorTimeId ?? null;
    update.vencedorPorDesempate = placarA === placarB && !!vencedorTimeId;
  }

  await updateDoc(doc(db, 'jogos', jogo.id), update);
}

// Finaliza jogo: aplica pontosVencedor/Perdedor/Empate, define vencedor pelo placar
// (ou pelo vencedorOverride se setado, ex: penaltis), e propaga o vencedor pro
// proximo jogo do bracket (se houver).
// Retorna { ok: true } ou { ok: false, motivo }.
export async function finalizarJogo(jogo, esporte) {
  const ehMataMata = jogo.fase === 'mata-mata';
  const placarA = jogo.placarTimeA ?? 0;
  const placarB = jogo.placarTimeB ?? 0;
  const empate = placarA === placarB;

  // Em mata-mata empate so eh permitido se ha um vencedorOverride (penaltis/desempate manual)
  if (ehMataMata && empate && !jogo.vencedorOverride) {
    return { ok: false, motivo: 'empate' };
  }

  const { pontosTimeA, pontosTimeB, vencedor } = aplicarPontosFinais(jogo, esporte);

  const batch = writeBatch(db);
  batch.update(doc(db, 'jogos', jogo.id), {
    status: 'finalizado',
    vencedor,
    pontosTimeA,
    pontosTimeB,
    finalizadoEm: serverTimestamp(),
  });

  // Avanco automatico do mata-mata
  if (ehMataMata && jogo.proximoJogoId && vencedor) {
    const campo = jogo.slot === 'A' ? 'timeAId' : 'timeBId';
    batch.update(doc(db, 'jogos', jogo.proximoJogoId), { [campo]: vencedor });
  }

  await batch.commit();
  return { ok: true };
}

// Reabre um jogo finalizado, voltando seu status pra 'ao_vivo' e recalculando
// os pontos parciais a partir dos eventos (sem o bonus de vencedor/perdedor).
// Bloqueia se for mata-mata e o proximo jogo do bracket ja foi iniciado, pois
// senao o estado fica inconsistente. Limpa o time alimentado no proximo jogo.
export async function reabrirJogo(jogo, esporte, todosJogos = []) {
  // Mata-mata: nao deixa reabrir se proximo jogo ja saiu de 'agendado'
  if (jogo.fase === 'mata-mata' && jogo.proximoJogoId) {
    const prox = todosJogos.find((j) => j.id === jogo.proximoJogoId);
    if (prox && prox.status !== 'agendado') {
      return { ok: false, motivo: 'proximo_em_andamento' };
    }
  }

  const batch = writeBatch(db);

  // Recalcula pontos parciais a partir dos eventos atuais (sem bonus de vencedor)
  const calc = calcularPlacarJogo(jogo.eventos || [], esporte?.regras || []);

  batch.update(doc(db, 'jogos', jogo.id), {
    status: 'ao_vivo',
    vencedor: null,
    vencedorOverride: null,
    vencedorPorDesempate: false,
    finalizadoEm: null,
    placarTimeA: calc.placarTimeA,
    placarTimeB: calc.placarTimeB,
    pontosTimeA: calc.pontosTimeA,
    pontosTimeB: calc.pontosTimeB,
  });

  // Se foi mata-mata, limpa o slot que esse jogo alimentou no proximo jogo
  if (jogo.fase === 'mata-mata' && jogo.proximoJogoId && jogo.vencedor) {
    const campo = jogo.slot === 'A' ? 'timeAId' : 'timeBId';
    batch.update(doc(db, 'jogos', jogo.proximoJogoId), { [campo]: null });
  }

  await batch.commit();
  return { ok: true };
}

// Verifica se eh possivel gerar mata-mata pos-grupos para um esporte.
// Retorna true se: formato eh grupos-mata-mata, todos os jogos de grupos finalizaram,
// e ainda nao existem jogos de mata-mata.
export function podeGerarMataMata(esporte, jogosDoEsporte) {
  if (esporte?.formato !== 'grupos-mata-mata') return false;
  const grupos = jogosDoEsporte.filter((j) => j.fase === 'grupos');
  if (grupos.length === 0) return false;
  const todosFinalizados = grupos.every((j) => j.status === 'finalizado');
  if (!todosFinalizados) return false;
  const jaTemMataMata = jogosDoEsporte.some((j) => j.fase === 'mata-mata');
  return !jaTemMataMata;
}

// Gera o mata-mata pos-grupos manualmente (chamado pelo botao na UI).
export async function gerarMataMataAposGrupos(esporte, todosJogos, times) {
  if (!podeGerarMataMata(esporte, todosJogos.filter((j) => j.esporteId === esporte.id))) {
    return { ok: false, motivo: 'condicoes_nao_atendidas' };
  }
  const jogosDoEsporte = todosJogos.filter((j) => j.esporteId === esporte.id);
  const novosJogos = gerarMataMataPosGrupos({
    esporteId: esporte.id,
    esporteConfig: esporte.config,
    times,
    jogos: jogosDoEsporte,
  });
  if (novosJogos.length === 0) {
    return { ok: false, motivo: 'sem_classificados' };
  }
  const batch = writeBatch(db);
  for (const novo of novosJogos) {
    batch.set(doc(db, 'jogos', novo.id), {
      ...novo,
      criadoEm: serverTimestamp(),
    });
  }
  await batch.commit();
  return { ok: true, criados: novosJogos.length };
}

// ========== GERACAO DE CHAVEAMENTO ==========
export async function gerarChaveamento(esporte, times) {
  const existentes = await getDocs(query(jogosCol(), where('esporteId', '==', esporte.id)));
  if (!existentes.empty) {
    const batchDel = writeBatch(db);
    existentes.forEach((s) => batchDel.delete(s.ref));
    await batchDel.commit();
  }

  const participantes = (times || []).filter((t) =>
    (esporte.timesParticipantes || []).includes(t.id)
  );

  let novosJogos = [];
  let composicaoGrupos = null;

  if (esporte.tipo === '1v1') {
    if (esporte.formato === 'mata-mata') {
      novosJogos = gerarBracketMataMata(esporte.id, participantes);
    } else if (esporte.formato === 'grupos-mata-mata') {
      const numGrupos = Number(esporte.config?.numGrupos) || 2;
      const { jogos, composicao } = gerarFaseGrupos(esporte.id, participantes, numGrupos);
      novosJogos = jogos;
      composicaoGrupos = composicao;
    }
  } else if (esporte.tipo === 'coletivo') {
    const numRodadas = Number(esporte.config?.numRodadas) || 1;
    novosJogos = gerarRodadasColetivo(esporte.id, participantes, numRodadas);
  }

  if (novosJogos.length === 0 && !composicaoGrupos) return;

  const batch = writeBatch(db);
  for (const j of novosJogos) {
    batch.set(doc(db, 'jogos', j.id), {
      ...j,
      criadoEm: serverTimestamp(),
    });
  }
  if (composicaoGrupos) {
    batch.update(doc(db, 'esportes', esporte.id), {
      'config.grupos': composicaoGrupos,
    });
  }
  await batch.commit();
}
