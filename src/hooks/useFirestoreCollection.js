import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase.js';

// Hook generico que escuta uma colecao e retorna { data, loading, error }.
export default function useFirestoreCollection(nome, opcoes = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const ref = opcoes.orderBy
      ? query(collection(db, nome), orderBy(opcoes.orderBy))
      : collection(db, nome);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setData(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [nome, opcoes.orderBy]);

  return { data, loading, error };
}
