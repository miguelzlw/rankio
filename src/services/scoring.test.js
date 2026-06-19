import { describe, it, expect } from 'vitest';
import {
  calcularPlacarJogo,
  determinarVencedor,
  aplicarPontosFinais,
  classificarGrupo,
  calcularRanking,
  bonusCampeonato,
  calcularSets,
} from './scoring.js';

const REGRA_GOL = { id: 'g', nome: 'Gol', placarACausa: 1, placarBSofre: 0, pontosACausa: 0, pontosBSofre: 0 };

describe('calcularPlacarJogo', () => {
  it('soma o placar a partir dos eventos', () => {
    const eventos = [
      { regraId: 'g', timeAfetado: 'A' },
      { regraId: 'g', timeAfetado: 'A' },
      { regraId: 'g', timeAfetado: 'B' },
    ];
    const r = calcularPlacarJogo(eventos, [REGRA_GOL]);
    expect(r.placarTimeA).toBe(2);
    expect(r.placarTimeB).toBe(1);
  });

  it('ignora eventos de regra inexistente', () => {
    const r = calcularPlacarJogo([{ regraId: 'x', timeAfetado: 'A' }], [REGRA_GOL]);
    expect(r.placarTimeA).toBe(0);
  });
});

describe('determinarVencedor / aplicarPontosFinais', () => {
  it('vencedor pelo placar', () => {
    expect(determinarVencedor({ timeAId: 'a', timeBId: 'b', placarTimeA: 3, placarTimeB: 1 })).toBe('a');
    expect(determinarVencedor({ timeAId: 'a', timeBId: 'b', placarTimeA: 1, placarTimeB: 1 })).toBe(null);
  });

  it('aplica pontos de vencedor/perdedor', () => {
    const jogo = { timeAId: 'a', timeBId: 'b', placarTimeA: 2, placarTimeB: 1, pontosTimeA: 0, pontosTimeB: 0 };
    const esp = { pontosVencedor: 5, pontosPerdedor: 0, pontosEmpate: 1 };
    const r = aplicarPontosFinais(jogo, esp);
    expect(r.vencedor).toBe('a');
    expect(r.pontosTimeA).toBe(5);
    expect(r.pontosTimeB).toBe(0);
  });

  it('empate aplica pontos de empate aos dois', () => {
    const jogo = { timeAId: 'a', timeBId: 'b', placarTimeA: 1, placarTimeB: 1, pontosTimeA: 0, pontosTimeB: 0 };
    const r = aplicarPontosFinais(jogo, { pontosVencedor: 5, pontosPerdedor: 0, pontosEmpate: 1 });
    expect(r.vencedor).toBe(null);
    expect(r.pontosTimeA).toBe(1);
    expect(r.pontosTimeB).toBe(1);
  });

  it('vencedorOverride tem prioridade (penaltis em empate)', () => {
    const jogo = { timeAId: 'a', timeBId: 'b', placarTimeA: 3, placarTimeB: 3, pontosTimeA: 0, pontosTimeB: 0, vencedorOverride: 'b' };
    const r = aplicarPontosFinais(jogo, { pontosVencedor: 5, pontosPerdedor: 0, pontosEmpate: 1 });
    expect(r.vencedor).toBe('b');
    expect(r.pontosTimeB).toBe(5);
  });
});

describe('calcularSets (volei)', () => {
  const pts = (lado, n) => Array.from({ length: n }, () => ({ lado }));
  const cfg = { melhorDe: 3, pontosPorSet: 12, vantagem2: false };

  it('fecha o set ao atingir os pontos', () => {
    // A=11, B=9, e entao A faz o 12o ponto -> fecha 12x9
    const r = calcularSets([...pts('A', 11), ...pts('B', 9), ...pts('A', 1)], cfg);
    expect(r.sets).toEqual([{ a: 12, b: 9 }]);
    expect(r.setsA).toBe(1);
    expect(r.decidido).toBe(false);
  });

  it('decide a partida na maioria dos sets', () => {
    const r = calcularSets([...pts('A', 12), ...pts('B', 12), ...pts('A', 12)], cfg);
    expect(r.setsA).toBe(2);
    expect(r.setsB).toBe(1);
    expect(r.decidido).toBe(true);
    expect(r.vencedor).toBe('A');
  });

  it('set unico (melhor de 1) decide na hora', () => {
    const r = calcularSets([...pts('A', 12)], { melhorDe: 1, pontosPorSet: 12, vantagem2: false });
    expect(r.decidido).toBe(true);
    expect(r.vencedor).toBe('A');
  });

  it('vantagem de 2: 12x11 nao fecha', () => {
    const r = calcularSets([...pts('A', 11), ...pts('B', 11), ...pts('A', 1)], { melhorDe: 3, pontosPorSet: 12, vantagem2: true });
    expect(r.sets).toEqual([]);
    expect(r.atualA).toBe(12);
    expect(r.atualB).toBe(11);
  });
});

describe('classificarGrupo', () => {
  it('ordena por pontos do esporte', () => {
    const times = [{ id: 'a' }, { id: 'b' }];
    // a venceu b 1x0 (a ganha pontos via aplicarPontosFinais ja persistidos no jogo)
    const jogos = [
      { esporteId: 'e', status: 'finalizado', timeAId: 'a', timeBId: 'b', placarTimeA: 1, placarTimeB: 0, pontosTimeA: 5, pontosTimeB: 0, vencedor: 'a' },
    ];
    const r = classificarGrupo(times, jogos, 'e');
    expect(r[0].time.id).toBe('a');
    expect(r[1].time.id).toBe('b');
  });
});

describe('bonusCampeonato', () => {
  const esp = { id: 'e', tipo: '1v1', pontosCampeao: 10, pontosVice: 5, pontosTerceiro: 2 };

  it('com disputa de 3o lugar: bonus vai pro vencedor da disputa', () => {
    const jogos = [
      { id: 'g1', esporteId: 'e', fase: 'mata-mata', status: 'finalizado', timeAId: 't1', timeBId: 't4', vencedor: 't1', proximoJogoId: 'f', jogoPerdedorId: 'tt' },
      { id: 'g2', esporteId: 'e', fase: 'mata-mata', status: 'finalizado', timeAId: 't2', timeBId: 't3', vencedor: 't2', proximoJogoId: 'f', jogoPerdedorId: 'tt' },
      { id: 'f', esporteId: 'e', fase: 'mata-mata', status: 'finalizado', timeAId: 't1', timeBId: 't2', vencedor: 't1' },
      { id: 'tt', esporteId: 'e', fase: 'mata-mata', status: 'finalizado', timeAId: 't4', timeBId: 't3', vencedor: 't3', terceiroLugar: true },
    ];
    expect(bonusCampeonato('t1', esp, jogos)).toBe(10);
    expect(bonusCampeonato('t2', esp, jogos)).toBe(5);
    expect(bonusCampeonato('t3', esp, jogos)).toBe(2);
    expect(bonusCampeonato('t4', esp, jogos)).toBe(0);
  });

  it('sem disputa de 3o lugar: fallback da bonus aos dois perdedores de semi', () => {
    const jogos = [
      { id: 'g1', esporteId: 'e', fase: 'mata-mata', status: 'finalizado', timeAId: 't1', timeBId: 't4', vencedor: 't1', proximoJogoId: 'f' },
      { id: 'g2', esporteId: 'e', fase: 'mata-mata', status: 'finalizado', timeAId: 't2', timeBId: 't3', vencedor: 't2', proximoJogoId: 'f' },
      { id: 'f', esporteId: 'e', fase: 'mata-mata', status: 'finalizado', timeAId: 't1', timeBId: 't2', vencedor: 't1' },
    ];
    expect(bonusCampeonato('t3', esp, jogos)).toBe(2);
    expect(bonusCampeonato('t4', esp, jogos)).toBe(2);
  });

  it('coletivo nao tem bonus de campeonato', () => {
    expect(bonusCampeonato('t1', { id: 'e', tipo: 'coletivo' }, [])).toBe(0);
  });
});

describe('calcularRanking', () => {
  it('soma pontos por time e ordena', () => {
    const times = [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }];
    const esportes = [{ id: 'e', tipo: '1v1', pontosCampeao: 0, pontosVice: 0, pontosTerceiro: 0 }];
    const jogos = [
      { esporteId: 'e', status: 'finalizado', timeAId: 'a', timeBId: 'b', pontosTimeA: 5, pontosTimeB: 0 },
    ];
    const r = calcularRanking(times, esportes, jogos);
    expect(r[0].time.id).toBe('a');
    expect(r[0].total).toBe(5);
    expect(r[1].total).toBe(0);
  });
});
