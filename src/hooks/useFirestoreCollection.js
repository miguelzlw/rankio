import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase.js';

// Cache global modulo-scoped: ao remontar componentes (navegar entre telas)
// nao precisamos zerar o estado e mostrar loading enquanto o snapshot chega.
const cache = {};

// Hook generico que escuta uma colecao do Firestore.
// `orderByField` e string (ou undefined). Eh extraido como argumento direto
// pra evitar instabilidade de objeto literal nas dependencias.
export default function useFirestoreCollection(nome, orderByField) {
  const [data, setData] = useState(cache[nome] || []);
  const [loading, setLoading] = useState(!cache[nome]);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    const ref = orderByField
      ? query(collection(db, nome), orderBy(orderByField))
      : collection(db, nome);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const docs = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
        cache[nome] = docs;
        setData(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore error em', nome, err);
        setError(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [nome, orderByField]);

  return { data, loading, error };
}
