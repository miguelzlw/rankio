import { describe, it, expect } from 'vitest';
import {
  gerarBracketMataMata,
  gerarFaseGrupos,
  gerarMataMataPosGrupos,
  gerarRodadasColetivo,
} from './brackets.js';

const T = (n) => Array.from({ length: n }, (_, i) => ({ id: 't' + (i + 1), nome: 'T' + (i + 1) }));

describe('gerarBracketMataMata', () => {
  it('2 times: so a final, sem 3o lugar', () => {
    const j = gerarBracketMataMata('e', T(2), true);
    expect(j).toHaveLength(1);
    expect(j.some((x) => x.terceiroLugar)).toBe(false);
  });

  it('4 times com 3o lugar: 2 semis + final + disputa de 3o', () => {
    const j = gerarBracketMataMata('e', T(4), true);
    expect(j).toHaveLength(4);
    const terceiro = j.filter((x) => x.terceiroLugar);
    expect(terceiro).toHaveLength(1);
    const semisComPerdedor = j.filter((x) => x.jogoPerdedorId);
    expect(semisComPerdedor).toHaveLength(2);
    // os dois semis apontam o perdedor pro jogo de 3o lugar
    expect(semisComPerdedor.every((s) => s.jogoPerdedorId === terceiro[0].id)).toBe(true);
  });

  it('4 times sem 3o lugar: 2 semis + final', () => {
    const j = gerarBracketMataMata('e', T(4), false);
    expect(j).toHaveLength(3);
    expect(j.some((x) => x.terceiroLugar)).toBe(false);
  });

  it('menos de 2 times retorna vazio', () => {
    expect(gerarBracketMataMata('e', T(1), true)).toEqual([]);
  });

  it('3 times: gera bye automatico (um jogo ja finalizado)', () => {
    const j = gerarBracketMataMata('e', T(3), false);
    expect(j.some((x) => x.bye && x.status === 'finalizado')).toBe(true);
  });
});

describe('gerarFaseGrupos', () => {
  it('2 grupos de 2: 1 jogo por grupo (round-robin)', () => {
    const { jogos, composicao } = gerarFaseGrupos('e', T(4), 2);
    expect(composicao).toHaveLength(2);
    expect(jogos).toHaveLength(2); // C(2,2)=1 por grupo
    expect(jogos.every((j) => j.fase === 'grupos')).toBe(true);
  });

  it('1 grupo de 4: round-robin de 6 jogos', () => {
    const { jogos } = gerarFaseGrupos('e', T(4), 1);
    expect(jogos).toHaveLength(6); // C(4,2)=6
  });
});

describe('gerarMataMataPosGrupos', () => {
  const finalizar = (jogos) =>
    jogos.map((j) => ({ ...j, status: 'finalizado', placarTimeA: 1, placarTimeB: 0, vencedor: j.timeAId }));

  it('1 classificado = campeao direto (1 jogo ja finalizado)', () => {
    const times = T(4);
    const { jogos, composicao } = gerarFaseGrupos('e', times, 1);
    const mm = gerarMataMataPosGrupos({
      esporteId: 'e',
      esporteConfig: { grupos: composicao, timesQueAvancam: 1 },
      times,
      jogos: finalizar(jogos),
    });
    expect(mm).toHaveLength(1);
    expect(mm[0].status).toBe('finalizado');
    expect(mm[0].vencedor).toBeTruthy();
  });

  it('2 grupos, 1 avanca = final entre os vencedores', () => {
    const times = T(4);
    const { jogos, composicao } = gerarFaseGrupos('e', times, 2);
    const mm = gerarMataMataPosGrupos({
      esporteId: 'e',
      esporteConfig: { grupos: composicao, timesQueAvancam: 1 },
      times,
      jogos: finalizar(jogos),
    });
    expect(mm).toHaveLength(1); // so a final (2 classificados)
  });
});

describe('gerarRodadasColetivo', () => {
  it('gera ceil(N/2) jogos por rodada', () => {
    const j = gerarRodadasColetivo('e', T(4), 2);
    expect(j).toHaveLength(4); // 2 jogos x 2 rodadas
    expect(j.every((x) => /^rodada-\d+$/.test(x.fase))).toBe(true);
  });
});
