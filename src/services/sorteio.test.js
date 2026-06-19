import { describe, it, expect } from 'vitest';
import { normalizar, sortearTimes } from './sorteio.js';

describe('normalizar', () => {
  it('minuscula, sem acento, espacos colapsados', () => {
    expect(normalizar('  Luís   Miguel ')).toBe('luis miguel');
    expect(normalizar('POLÔNIA')).toBe('polonia');
    expect(normalizar(null)).toBe('');
  });
});

describe('sortearTimes', () => {
  const times = [
    { id: 'it', nome: 'Itália' },
    { id: 'po', nome: 'Polônia - São João Paulo II' },
    { id: 'es', nome: 'Espanha' },
    { id: 'ar', nome: 'Argentina' },
  ];

  it('distribui todos os nomes e mantem times equilibrados (+-1)', () => {
    const nomes = Array.from({ length: 12 }, (_, i) => 'Pessoa ' + (i + 1));
    const r = sortearTimes({ nomes, times });
    const total = Object.values(r.atribuicoes).reduce((acc, l) => acc + l.length, 0);
    expect(total).toBe(12);
    const tamanhos = times.map((t) => r.atribuicoes[t.id].length);
    expect(Math.max(...tamanhos) - Math.min(...tamanhos)).toBeLessThanOrEqual(1);
  });

  it('nome fixo cai sempre no time pre-definido (case/acento-insensitive)', () => {
    // 'neguin' esta configurado em NOMES_FIXOS -> Polônia - São João Paulo II
    const r = sortearTimes({ nomes: ['NEGUIN', 'Outro 1', 'Outro 2', 'Outro 3'], times });
    expect(r.atribuicoes['po']).toContain('NEGUIN');
  });

  it('ignora nomes duplicados (com aviso)', () => {
    const r = sortearTimes({ nomes: ['Joao', 'joão', 'JOAO', 'Maria'], times });
    const total = Object.values(r.atribuicoes).reduce((acc, l) => acc + l.length, 0);
    expect(total).toBe(2); // Joao (1x) + Maria
    expect(r.avisos.length).toBeGreaterThan(0);
  });

  it('descarta linhas vazias', () => {
    const r = sortearTimes({ nomes: ['', '  ', 'Ana'], times });
    const total = Object.values(r.atribuicoes).reduce((acc, l) => acc + l.length, 0);
    expect(total).toBe(1);
  });

  it('ordemRevelacao tem todos os nomes', () => {
    const nomes = ['A', 'B', 'C', 'D', 'E'];
    const r = sortearTimes({ nomes, times });
    expect(r.ordemRevelacao).toHaveLength(5);
    // cada item aponta pra um time valido
    expect(r.ordemRevelacao.every((x) => times.some((t) => t.id === x.timeId))).toBe(true);
  });
});
