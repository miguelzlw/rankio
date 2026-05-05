// src/services/scoring.js
/**
 * Funções de cálculo de pontuação.
 * Todas as funções são puras e recebem apenas dados simples.
 */

/**
 * calcularPlacarJogo(eventos, regras, timeAId, timeBId)
 *  - eventos: array de objetos { regraId, timeId, timestamp }
 *  - regras: array de objetos { id, nome, pontosACausa, pontosBSofre }
 *  - timeAId, timeBId: ids dos times participantes do jogo
 * Retorna { pontosA, pontosB }
 */
export const calcularPlacarJogo = (eventos, regras, timeAId, timeBId) => {
  let pontosA = 0;
  let pontosB = 0;

  // Converte regras em mapa para lookup rápido
  const regrasMap = {};
  if (Array.isArray(regras)) {
    regras.forEach((r) => { regrasMap[r.id] = r; });
  } else if (regras && typeof regras === 'object') {
    Object.assign(regrasMap, regras);
  }

  (eventos || []).forEach((ev) => {
    const regra = regrasMap[ev.regraId];
    if (!regra) return;

    if (ev.timeId === timeAId) {
      pontosA += regra.pontosACausa || 0;
      pontosB += regra.pontosBSofre || 0;
    } else if (ev.timeId === timeBId) {
      pontosB += regra.pontosACausa || 0;
      pontosA += regra.pontosBSofre || 0;
    }
  });

  return { pontosA, pontosB };
};

/**
 * pontuacaoTimeNoEsporte(jogosDoEsporte, timeId)
 *  - jogosDoEsporte: array de jogos finalizados de um esporte
 *  - timeId: id do time
 * Retorna número (soma de pontos que o time fez neste esporte).
 */
export const pontuacaoTimeNoEsporte = (jogosDoEsporte, timeId) => {
  let total = 0;
  (jogosDoEsporte || []).forEach((jogo) => {
    if (jogo.status !== 'finalizado') return;
    if (jogo.timeAId === timeId) total += jogo.pontosA || 0;
    else if (jogo.timeBId === timeId) total += jogo.pontosB || 0;
  });
  return total;
};

/**
 * calcularPontuacaoTorneio(jogosFinalizados, esportes, timeId)
 *  - jogosFinalizados: array de jogos finalizados
 *  - esportes: array de objetos esporte
 *  - timeId: id do time
 * Retorna { total, breakdown: { [esporteId]: pontos } }
 */
export const calcularPontuacaoTorneio = (jogosFinalizados, esportes, timeId) => {
  const breakdown = {};
  let total = 0;
  (jogosFinalizados || []).forEach((jogo) => {
    const pontos =
      jogo.timeAId === timeId ? (jogo.pontosA || 0) :
      jogo.timeBId === timeId ? (jogo.pontosB || 0) :
      0;
    if (!breakdown[jogo.esporteId]) breakdown[jogo.esporteId] = 0;
    breakdown[jogo.esporteId] += pontos;
    total += pontos;
  });
  return { total, breakdown };
};

/**
 * calcularRanking(times, esportes, jogos)
 *  - times: array de objetos time
 *  - esportes: array de objetos esporte
 *  - jogos: array de todos os jogos
 * Retorna array [{ time, total, breakdown }] ordenado decrescente.
 */
export const calcularRanking = (times, esportes, jogos) => {
  const finalizados = (jogos || []).filter((j) => j.status === 'finalizado');
  const ranking = (times || []).map((time) => {
    const { total, breakdown } = calcularPontuacaoTorneio(finalizados, esportes, time.id);
    return { time, total, breakdown };
  });
  ranking.sort((a, b) => b.total - a.total);
  return ranking;
};

/**
 * classificarGrupo(timesDoGrupo, jogosFinalizadosDoGrupo, regras)
 *  - timesDoGrupo: array de objetos { id, nome }
 *  - jogosFinalizadosDoGrupo: array de jogos finalizados do grupo
 *  - regras: regras do esporte (não usadas diretamente aqui)
 * Retorna array de ids ordenados: pontos desc → saldo desc → confronto direto → cadastro.
 */
export const classificarGrupo = (timesDoGrupo, jogosFinalizadosDoGrupo, regras) => {
  const stats = {};
  (timesDoGrupo || []).forEach((t) => {
    stats[t.id] = { pontos: 0, saldo: 0, confrontos: {} };
  });

  (jogosFinalizadosDoGrupo || []).forEach((jogo) => {
    const { timeAId, timeBId, pontosA, pontosB } = jogo;
    if (!stats[timeAId] || !stats[timeBId]) return;
    stats[timeAId].pontos += pontosA || 0;
    stats[timeAId].saldo += (pontosA || 0) - (pontosB || 0);
    stats[timeBId].pontos += pontosB || 0;
    stats[timeBId].saldo += (pontosB || 0) - (pontosA || 0);
    // Confronto direto
    if (!stats[timeAId].confrontos[timeBId]) stats[timeAId].confrontos[timeBId] = 0;
    if (!stats[timeBId].confrontos[timeAId]) stats[timeBId].confrontos[timeAId] = 0;
    if ((pontosA || 0) > (pontosB || 0)) stats[timeAId].confrontos[timeBId] = 1;
    else if ((pontosB || 0) > (pontosA || 0)) stats[timeBId].confrontos[timeAId] = 1;
  });

  const compare = (aId, bId) => {
    const a = stats[aId];
    const b = stats[bId];
    if (a.pontos !== b.pontos) return b.pontos - a.pontos;
    if (a.saldo !== b.saldo) return b.saldo - a.saldo;
    if (a.confrontos[bId] === 1) return -1;
    if (b.confrontos[aId] === 1) return 1;
    return 0;
  };

  return [...timesDoGrupo].sort((x, y) => compare(x.id, y.id)).map((t) => t.id);
};
