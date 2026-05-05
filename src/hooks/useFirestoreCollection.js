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
    setError(null);

    // Timeout de fallback caso o Firebase não consiga conectar
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError(new Error('Tempo limite de conexão excedido. Verifique sua internet ou a configuração do Firebase.'));
    }, 5000);

    const ref = opcoes.orderBy
      ? query(collection(db, nome), orderBy(opcoes.orderBy))
      : collection(db, nome);
      
    const unsub = onSnapshot(
      ref,
      (snap) => {
        clearTimeout(timeoutId);
        setData(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
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
