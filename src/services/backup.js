// Export/import JSON e reset total.
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase.js';

const COLECOES = ['times', 'esportes', 'jogos'];
const VERSAO_BACKUP = 1;

export async function exportarJSON() {
  const dados = {};
  for (const c of COLECOES) {
    const snap = await getDocs(collection(db, c));
    dados[c] = snap.docs.map((d) => d.data());
  }
  const payload = {
    versao: VERSAO_BACKUP,
    exportadoEm: new Date().toISOString(),
    ...dados,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rankio-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return payload;
}

export function validarBackup(payload) {
  if (!payload || typeof payload !== 'object') return 'JSON invalido';
  if (payload.versao !== VERSAO_BACKUP) return `Versao incompativel (${payload.versao})`;
  if (!Array.isArray(payload.times)) return 'Campo "times" ausente';
  if (!Array.isArray(payload.esportes)) return 'Campo "esportes" ausente';
  if (!Array.isArray(payload.jogos)) return 'Campo "jogos" ausente';
  return null;
}

async function deletarTudo() {
  for (const c of COLECOES) {
    let snap = await getDocs(collection(db, c));
    while (!snap.empty) {
      const docs = snap.docs.slice(0, 450);
      const batch = writeBatch(db);
      docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      if (docs.length < 450) break;
      snap = await getDocs(collection(db, c));
    }
  }
}

export async function importarJSON(payload) {
  const erro = validarBackup(payload);
  if (erro) throw new Error(erro);
  await deletarTudo();
  for (const c of COLECOES) {
    const docs = payload[c] || [];
    let i = 0;
    while (i < docs.length) {
      const slice = docs.slice(i, i + 450);
      const batch = writeBatch(db);
      for (const item of slice) {
        if (!item.id) continue;
        const dataSemTimestamps = { ...item };
        // serverTimestamp em criadoEm/finalizadoEm pode quebrar; preserva os timestamps existentes
        batch.set(doc(db, c, item.id), dataSemTimestamps);
      }
      await batch.commit();
      i += 450;
    }
  }
}

export async function resetTotal() {
  await deletarTudo();
}

export { serverTimestamp };
