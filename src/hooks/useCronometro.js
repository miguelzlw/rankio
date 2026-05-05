import { useEffect, useRef, useState, useCallback } from 'react';

// Cronometro progressivo em memoria. Persistencia por jogo eh local apenas
// (nao vai pro Firestore). Recarregar a pagina zera, conforme spec.
export default function useCronometro() {
  const [tempoMs, setTempoMs] = useState(0);
  const [estado, setEstado] = useState('parado'); // 'parado' | 'rodando' | 'pausado'
  const intervalRef = useRef(null);
  const inicioRef = useRef(null);
  const acumuladoRef = useRef(0);

  const tick = useCallback(() => {
    setTempoMs(acumuladoRef.current + (Date.now() - inicioRef.current));
  }, []);

  const start = useCallback(() => {
    if (estado === 'rodando') return;
    inicioRef.current = Date.now();
    intervalRef.current = setInterval(tick, 100);
    setEstado('rodando');
  }, [estado, tick]);

  const pausar = useCallback(() => {
    if (estado !== 'rodando') return;
    clearInterval(intervalRef.current);
    acumuladoRef.current += Date.now() - inicioRef.current;
    setEstado('pausado');
  }, [estado]);

  const retomar = useCallback(() => {
    if (estado !== 'pausado') return;
    inicioRef.current = Date.now();
    intervalRef.current = setInterval(tick, 100);
    setEstado('rodando');
  }, [estado, tick]);

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    inicioRef.current = null;
    acumuladoRef.current = 0;
    setTempoMs(0);
    setEstado('parado');
  }, []);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return { tempoMs, estado, start, pausar, retomar, reset };
}

export function formatarTempo(ms) {
  const totalSeg = Math.floor(ms / 1000);
  const m = Math.floor(totalSeg / 60);
  const s = totalSeg % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
