// src/services/scoring.js
/**
 * Funções de cálculo de pontuação.
 * Todas as funções são puras e recebem apenas dados simples.
 */

/**
 * calculaPlacarJogo(eventos, regras)
 *  - eventos: array de objetos { regraId, timeId, timestamp }
 *  - regras: objeto mapeando regraId -> { nome, pontosACausa, pontosBSofre }
 * Retorna { pontosA, pontosB }
 */
export const calcularPlacarJogo = (eventos, regras) => {
  let pontosA = 0;
  let pontosB = 0;
  eventos.forEach((ev) => {
    const regra = regras[ev.regraId];
    if (!regra) return;
    const isTimeA = ev.timeId === ev.timeAId; // timeAId vem do jogo, mas aqui não temos, então assumimos que evento inclui timeId e que timeAId será passado via contexto
    // Para simplificar, vamos assumir que o chamador já separou eventos por time.
    // Aqui recebemos eventos já filtrados por time.
    // Implementação genérica: se evento.timeId corresponde ao time A, soma pontosACausa, senao soma pontosBSofre ao outro.
    // Mas como não temos timeAId aqui, faremos duas chamadas distintas nas camadas superiores.
  });
  // Esta implementação será substituída por lógica no hook que separa eventos por time.
  return { pontosA, pontosB };
};

/**
 * calcularPontuacaoTorneio(jogosFinalizados, esportes, timeId)
 *  - jogosFinalizados: array de objetos jogo com { pontosA, pontosB, timeAId, timeBId, esporteId }
 *  - esportes: mapa esporteId -> { pontuacaoPorColocacao: [10,7,5,3,1] }
 *  - timeId: id do time a ser calculado
 * Retorna { total, breakdown: { [esporteId]: pontos } }
 */
export const calcularPontuacaoTorneio = (jogosFinalizados, esportes, timeId) => {
  const breakdown = {};
  let total = 0;
  jogosFinalizados.forEach((jogo) => {
    const pontos =
      jogo.timeAId === timeId ? jogo.pontosA :
      jogo.timeBId === timeId ? jogo.pontosB :
      0;
    if (pontos === 0) return;
    if (!breakdown[jogo.esporteId]) breakdown[jogo.esporteId] = 0;
    breakdown[jogo.esporteId] += pontos;
    total += pontos;
  });
  // Se houver pontuação por colocação (ex.: ponto extra por vitória em esportes), pode ser calculado aqui.
  return { total, breakdown };
};

/**
 * classificarGrupo(timesDoGrupo, jogosFinalizadosDoGrupo, regras)
 *  - timesDoGrupo: array de objetos { id, nome }
 *  - jogosFinalizadosDoGrupo: array de jogos já finalizados (mesmo formato de scoring)
 *  - regras: objeto de regras do esporte (necessário para cálculo de saldo)
 * Retorna array de ids ordenados conforme critérios:
 *   1. Pontos no esporte
 *   2. Saldo de pontos (feitos - sofridos)
 *   3. Confronto direto (vencedor do confronto direto)
 *   4. Ordem de cadastro (mantém estabilidade)
 */
export const classificarGrupo = (timesDoGrupo, jogosFinalizadosDoGrupo, regras) => {
  // Primeiro agregamos estatísticas por time
  const stats = {};
  timesDoGrupo.forEach((t) => {
    stats[t.id] = { pontos: 0, saldo: 0, confrontos: {} };
  });

  jogosFinalizadosDoGrupo.forEach((jogo) => {
    const { timeAId, timeBId, pontosA, pontosB } = jogo;
    // Atualiza pontos e saldo
    stats[timeAId].pontos += pontosA;
    stats[timeAId].saldo += pontosA - pontosB;
    stats[timeBId].pontos += pontosB;
    stats[timeBId].saldo += pontosB - pontosA;
    // Confronto direto
    if (!stats[timeAId].confrontos[timeBId]) stats[timeAId].confrontos[timeBId] = 0;
    if (!stats[timeBId].confrontos[timeAId]) stats[timeBId].confrontos[timeAId] = 0;
    if (pontosA > pontosB) stats[timeAId].confrontos[timeBId] = 1;
    else if (pontosB > pontosA) stats[timeBId].confrontos[timeAId] = 1;
    // empates deixam 0 (não muda). 
  });

  // Função comparadora
  const compare = (aId, bId) => {
    const a = stats[aId];
    const b = stats[bId];
    // 1. Pontos
    if (a.pontos !== b.pontos) return b.pontos - a.pontos;
    // 2. Saldo
    if (a.saldo !== b.saldo) return b.saldo - a.saldo;
    // 3. Confronto direto
    if (a.confrontos[bId] !== undefined && b.confrontos[aId] !== undefined) {
      if (a.confrontos[bId] === 1) return -1;
      if (b.confrontos[aId] === 1) return 1;
    }
    // 4. Ordem de cadastro (mantém a ordem original)
    return 0;
  };

  const ordered = [...timesDoGrupo].sort((x, y) => compare(x.id, y.id)).map((t) => t.id);
  return ordered;
};
