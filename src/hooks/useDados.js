// Hooks especificos pra cada colecao + ranking derivado.
import { useMemo } from 'react';
import useFirestoreCollection from './useFirestoreCollection.js';
import { calcularRanking } from '../services/scoring.js';

export function useTimes() {
  return useFirestoreCollection('times');
}

export function useEsportes() {
  return useFirestoreCollection('esportes');
}

export function useJogos() {
  return useFirestoreCollection('jogos');
}

export function useRanking() {
  const { data: times, loading: lt } = useTimes();
  const { data: esportes, loading: le } = useEsportes();
  const { data: jogos, loading: lj } = useJogos();

  const ranking = useMemo(() => {
    if (lt || le || lj) return [];
    return calcularRanking(times, esportes, jogos);
  }, [times, esportes, jogos, lt, le, lj]);

  return { ranking, times, esportes, jogos, loading: lt || le || lj };
}
