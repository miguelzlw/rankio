import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase.js';

const cache = {};

// Hook generico que escuta uma colecao e retorna { data, loading, error }.
export default function useFirestoreCollection(nome, opcoes = {}) {
  // Inicializa com o cache se existir, senao array vazio. Se tem cache, não precisa de loading inicial bloqueante.
  const [data, setData] = useState(cache[nome] || []);
  const [loading, setLoading] = useState(!cache[nome]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cache[nome]) {
      setLoading(true);
    }
    setError(null);

    // Timeout de fallback caso o Firebase não consiga conectar
    const timeoutId = setTimeout(() => {
      setLoading(false);
      if (!cache[nome]) {
        setError(new Error('Tempo limite de conexão excedido. Verifique sua internet ou a configuração do Firebase.'));
      }
    }, 5000);

    const ref = opcoes.orderBy
      ? query(collection(db, nome), orderBy(opcoes.orderBy))
      : collection(db, nome);
      
    const unsub = onSnapshot(
      ref,
      (snap) => {
        clearTimeout(timeoutId);
        const docs = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
        cache[nome] = docs; // Atualiza o cache global
        setData(docs);
        setLoading(false);
      },
      (err) => {
        clearTimeout(timeoutId);
        console.error("Firebase error na coleção", nome, err);
        setError(err);
        setLoading(false);
      }
    );
    
    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  }, [nome, opcoes.orderBy]);

  return { data, loading, error };
}
