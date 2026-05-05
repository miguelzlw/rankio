// src/services/firestore.js
import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Collections references
 */
export const timesCol = collection(db, "times");
export const esportesCol = collection(db, "esportes");
export const jogosCol = collection(db, "jogos");

/**
 * CRUD wrappers for Times
 */
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

/**
 * CRUD wrappers for Esportes
 */
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

/**
 * CRUD wrappers for Jogos
 */
export const criarJogo = async (jogo) => {
  const docRef = await addDoc(jogosCol, {
    ...jogo,
    eventos: [],
    criadoEm: serverTimestamp(),
    status: "pendente", // pendente | em_andamento | finalizado
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

/**
 * Finaliza um jogo de forma atômica.
 * Calcula placar, define vencedor e avança bracket se necessário.
 */
export const finalizarJogo = async (jogoId, calcularPlacar, avancarBracket) => {
  const batch = writeBatch(db);
  const jogoRef = doc(jogosCol, jogoId);
  const jogoSnap = await getDoc(jogoRef);
  if (!jogoSnap.exists()) throw new Error("Jogo não encontrado");
  const jogo = jogoSnap.data();
  const placar = calcularPlacar(jogo.eventos, jogo.regras);
  const vencedorId = placar.pontosA > placar.pontosB ? jogo.timeAId : placar.pontosA < placar.pontosB ? jogo.timeBId : null; // empate pode ficar null

  batch.update(jogoRef, {
    pontosA: placar.pontosA,
    pontosB: placar.pontosB,
    vencedorId,
    status: "finalizado",
    finalizadoEm: serverTimestamp(),
  });

  // Avança bracket se houver próximoJogoId e for mata‑mata
  if (jogo.proximoJogoId && vencedorId) {
    const proximoRef = doc(jogosCol, jogo.proximoJogoId);
    const campoSlot = jogo.slot === "A" ? "timeAId" : "timeBId";
    batch.update(proximoRef, { [campoSlot]: vencedorId });
  }

  await batch.commit();
};

/**
 * Exporta toda a base de dados como JSON (usado por backup.js)
 */
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

/**
 * Reset total – deleta tudo em batches de 500 (máximo do writeBatch)
 */
export const resetTotal = async () => {
  const batchSize = 500;
  const collections = [timesCol, esportesCol, jogosCol];
  for (const col of collections) {
    let snapshot = await getDocs(col);
    while (!snapshot.empty) {
      const batch = writeBatch(db);
      snapshot.docs.slice(0, batchSize).forEach((docSnap) => {
        batch.delete(doc(db, col.path, docSnap.id));
      });
      await batch.commit();
      snapshot = await getDocs(col);
    }
  }
};

// ── Aliases usados pelos componentes ──
export const removerTime = deletarTime;
export const removerEsporte = deletarEsporte;
export const removerJogo = deletarJogo;

/**
 * Gera chaveamento de um esporte e persiste todos os jogos em batch.
 * @param {string} esporteId
 * @param {Array} jogosGerados — array de objetos jogo vindos de brackets.js
 */
export const gerarChaveamento = async (esporteId, jogosGerados) => {
  const batchSize = 500;
  for (let i = 0; i < jogosGerados.length; i += batchSize) {
    const batch = writeBatch(db);
    const slice = jogosGerados.slice(i, i + batchSize);
    slice.forEach((jogo) => {
      const ref = doc(jogosCol);
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
};

