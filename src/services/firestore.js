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
} from 'firebase/firestore';
import { db } from './firebase.js';
import { calcularPlacarJogo } from './scoring.js';
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
export async function criarTime({ nome, cor }) {
  const ref = doc(timesCol());
  await setDoc(ref, {
    id: ref.id,
    nome,
    cor,
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
export async function criarEsporte({ nome, tipo, formato, config, regras, timesParticipantes }) {
  const ref = doc(esportesCol());
  await setDoc(ref, {
    id: ref.id,
    nome,
    tipo,
    formato: formato ?? null,
    config: config ?? {},
    regras: regras ?? [],
    timesParticipantes: timesParticipantes ?? [],
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

// Adiciona evento ao jogo e recalcula placar.
export async function lancarEvento(jogo, regras, novoEvento) {
  const eventos = [...(jogo.eventos || []), novoEvento];
  const { pontosTimeA, pontosTimeB } = calcularPlacarJogo(eventos, regras);
  await updateDoc(doc(db, 'jogos', jogo.id), {
    eventos,
    pontosTimeA,
    pontosTimeB,
  });
}

// Remove evento e recalcula placar.
export async function removerEvento(jogo, regras, eventoId) {
  const eventos = (jogo.eventos || []).filter((e) => e.id !== eventoId);
  const { pontosTimeA, pontosTimeB } = calcularPlacarJogo(eventos, regras);
  await updateDoc(doc(db, 'jogos', jogo.id), {
    eventos,
    pontosTimeA,
    pontosTimeB,
  });
}

// Finaliza jogo: define vencedor, atualiza status, e (se mata-mata) propaga
// vencedor pro proximo jogo. Se foi o ultimo jogo da fase de grupos, gera o mata-mata.
// Retorna { ok: true } ou { ok: false, motivo }.
export async function finalizarJogo(jogo, esporte, todosJogos = []) {
  const ehMataMata = jogo.fase === 'mata-mata';
  const empate = (jogo.pontosTimeA ?? 0) === (jogo.pontosTimeB ?? 0);

  if (ehMataMata && empate) {
    return { ok: false, motivo: 'empate' };
  }

  const vencedor =
    (jogo.pontosTimeA ?? 0) > (jogo.pontosTimeB ?? 0)
      ? jogo.timeAId
      : (jogo.pontosTimeB ?? 0) > (jogo.pontosTimeA ?? 0)
        ? jogo.timeBId
        : null;

  const batch = writeBatch(db);
  batch.update(doc(db, 'jogos', jogo.id), {
    status: 'finalizado',
    vencedor,
    finalizadoEm: serverTimestamp(),
  });

  // Avanco automatico do mata-mata
  if (ehMataMata && jogo.proximoJogoId && vencedor) {
    const campo = jogo.slot === 'A' ? 'timeAId' : 'timeBId';
    batch.update(doc(db, 'jogos', jogo.proximoJogoId), { [campo]: vencedor });
  }

  await batch.commit();

  // Geracao automatica do mata-mata pos-grupos.
  if (esporte && esporte.formato === 'grupos-mata-mata' && jogo.fase === 'grupos') {
    const jogosDoEsporte = todosJogos.filter((j) => j.esporteId === esporte.id);
    const todosGruposFinalizados = jogosDoEsporte
      .filter((j) => j.fase === 'grupos')
      .every((j) => j.id === jogo.id || j.status === 'finalizado');
    const naoTemMataMata = !jogosDoEsporte.some((j) => j.fase === 'mata-mata');

    if (todosGruposFinalizados && naoTemMataMata) {
      const timesSnap = await getDocs(timesCol());
      const times = timesSnap.docs.map((d) => d.data());
      // Reflete o estado pos-finalizacao no array em memoria
      const jogosAtualizados = jogosDoEsporte.map((j) =>
        j.id === jogo.id ? { ...j, status: 'finalizado', vencedor } : j
      );
      const novosJogos = gerarMataMataPosGrupos({
        esporteId: esporte.id,
        esporteConfig: esporte.config,
        times,
        jogos: jogosAtualizados,
      });
      if (novosJogos.length > 0) {
        const batchMM = writeBatch(db);
        for (const novo of novosJogos) {
          batchMM.set(doc(db, 'jogos', novo.id), {
            ...novo,
            criadoEm: serverTimestamp(),
          });
        }
        await batchMM.commit();
      }
    }
  }

  return { ok: true };
}

// ========== GERACAO DE CHAVEAMENTO ==========
// Apaga jogos existentes do esporte e gera todos os jogos de acordo com seu tipo/formato.
export async function gerarChaveamento(esporte, times) {
  // Apaga jogos atuais do esporte
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
