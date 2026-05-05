// src/services/firestore.js
import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { calcularPlacarJogo } from "./scoring";

/**
 * Collections references
 */
export const timesCol = collection(db, "times");
export const esportesCol = collection(db, "esportes");
export const jogosCol = collection(db, "jogos");

// ═══════════════════════════════════
//  CRUD — Times
// ═══════════════════════════════════
export const criarTime = async (time) => {
  const docRef = await addDoc(timesCol, {
    ...time,
    criadoEm: serverTimestamp(),
  });
  return docRef.id;
};

export const atualizarTime = async (id, data) => {
  const ref = doc(timesCol, id);
  await updateDoc(ref, { ...data, atualizadoEm: serverTimestamp() });
};

export const deletarTime = async (id) => {
  await deleteDoc(doc(timesCol, id));
};

// ═══════════════════════════════════
//  CRUD — Esportes
// ═══════════════════════════════════
export const criarEsporte = async (esporte) => {
  const docRef = await addDoc(esportesCol, {
    ...esporte,
    criadoEm: serverTimestamp(),
  });
  return docRef.id;
};

export const atualizarEsporte = async (id, data) => {
  const ref = doc(esportesCol, id);
  await updateDoc(ref, { ...data, atualizadoEm: serverTimestamp() });
};

export const deletarEsporte = async (id) => {
  await deleteDoc(doc(esportesCol, id));
};

// ═══════════════════════════════════
//  CRUD — Jogos
// ═══════════════════════════════════
export const criarJogo = async (jogo) => {
  const docRef = await addDoc(jogosCol, {
    ...jogo,
    eventos: [],
    criadoEm: serverTimestamp(),
    status: "pendente",
  });
  return docRef.id;
};

export const atualizarJogo = async (id, data) => {
  const ref = doc(jogosCol, id);
  await updateDoc(ref, { ...data, atualizadoEm: serverTimestamp() });
};

export const deletarJogo = async (id) => {
  await deleteDoc(doc(jogosCol, id));
};

// ═══════════════════════════════════
//  Jogo ao vivo — iniciar, lançar evento, remover evento
// ═══════════════════════════════════

/**
 * Marca jogo como ao_vivo.
 */
export const iniciarJogo = async (jogoId) => {
  const ref = doc(jogosCol, jogoId);
  await updateDoc(ref, { status: "ao_vivo", iniciadoEm: serverTimestamp() });
};

/**
 * Lança um evento e recalcula o placar no Firestore.
 * @param {Object} jogo — doc do jogo (com id, timeAId, timeBId, eventos)
 * @param {Array} regras — regras do esporte
 * @param {Object} evento — { id, regraId, regraNome, timeAfetado, timestamp, timestampCronometro }
 */
export const lancarEvento = async (jogo, regras, evento) => {
  const ref = doc(jogosCol, jogo.id);
  const novosEventos = [...(jogo.eventos || []), evento];
  const placar = calcularPlacarJogo(novosEventos, regras, jogo.timeAId, jogo.timeBId);
  await updateDoc(ref, {
    eventos: novosEventos,
    pontosTimeA: placar.pontosA,
    pontosTimeB: placar.pontosB,
  });
};

/**
 * Remove um evento pela id e recalcula o placar.
 */
export const removerEvento = async (jogo, regras, eventoId) => {
  const ref = doc(jogosCol, jogo.id);
  const novosEventos = (jogo.eventos || []).filter((e) => e.id !== eventoId);
  const placar = calcularPlacarJogo(novosEventos, regras, jogo.timeAId, jogo.timeBId);
  await updateDoc(ref, {
    eventos: novosEventos,
    pontosTimeA: placar.pontosA,
    pontosTimeB: placar.pontosB,
  });
};

// ═══════════════════════════════════
//  Finalizar jogo (batch atômico)
// ═══════════════════════════════════

/**
 * Finaliza um jogo. Chamada pelo JogoDetalhe:
 *   finalizarJogo(jogo, esporte, todosOsJogos)
 * Retorna { ok: boolean }
 */
export const finalizarJogo = async (jogo, esporte, todosOsJogos) => {
  const placar = calcularPlacarJogo(
    jogo.eventos || [],
    esporte.regras || [],
    jogo.timeAId,
    jogo.timeBId
  );

  const ehMataMata = jogo.fase === "mata-mata";
  const empate = placar.pontosA === placar.pontosB;
  if (ehMataMata && empate) {
    return { ok: false };
  }

  const vencedorId =
    placar.pontosA > placar.pontosB ? jogo.timeAId :
    placar.pontosB > placar.pontosA ? jogo.timeBId :
    null;

  const batch = writeBatch(db);
  const jogoRef = doc(jogosCol, jogo.id);

  batch.update(jogoRef, {
    pontosTimeA: placar.pontosA,
    pontosTimeB: placar.pontosB,
    vencedor: vencedorId,
    status: "finalizado",
    finalizadoEm: serverTimestamp(),
  });

  // Avança bracket se houver próximoJogoId
  if (jogo.proximoJogoId && vencedorId) {
    const proximoRef = doc(jogosCol, jogo.proximoJogoId);
    const campoSlot = jogo.slot === "A" ? "timeAId" : "timeBId";
    batch.update(proximoRef, { [campoSlot]: vencedorId });
  }

  try {
    await batch.commit();
    return { ok: true };
  } catch (error) {
    console.error("Erro ao finalizar jogo:", error);
    return { ok: false, error };
  }
};

// ═══════════════════════════════════
//  Backup helpers
// ═══════════════════════════════════

export const exportarDados = async () => {
  const [timesSnap, esportesSnap, jogosSnap] = await Promise.all([
    getDocs(timesCol),
    getDocs(esportesCol),
    getDocs(jogosCol),
  ]);
  const times = timesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const esportes = esportesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const jogos = jogosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { versao: 1, exportadoEm: new Date().toISOString(), times, esportes, jogos };
};

export const resetTotal = async () => {
  const batchSize = 500;
  const collections = [timesCol, esportesCol, jogosCol];
  for (const col of collections) {
    let snapshot = await getDocs(col);
    while (!snapshot.empty) {
      const batch = writeBatch(db);
      snapshot.docs.slice(0, batchSize).forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      snapshot = await getDocs(col);
    }
  }
};

// ═══════════════════════════════════
//  Aliases usados pelos componentes
// ═══════════════════════════════════
export const removerTime = deletarTime;
export const removerEsporte = deletarEsporte;
export const removerJogo = deletarJogo;

/**
 * Gera chaveamento de um esporte e persiste todos os jogos em batch.
 */
export const gerarChaveamento = async (esporteId, jogosGerados) => {
  const batchSize = 500;
  try {
    for (let i = 0; i < jogosGerados.length; i += batchSize) {
      const batch = writeBatch(db);
      const slice = jogosGerados.slice(i, i + batchSize);
      slice.forEach((jogo) => {
        const ref = jogo.id ? doc(jogosCol, jogo.id) : doc(jogosCol);
        batch.set(ref, {
          ...jogo,
          esporteId,
          eventos: [],
          status: jogo.status || "pendente",
          criadoEm: serverTimestamp(),
        });
      });
      await batch.commit();
    }
    return { ok: true };
  } catch (error) {
    console.error("Erro ao gerar chaveamento:", error);
    return { ok: false, error };
  }
};
