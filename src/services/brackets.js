// src/services/brackets.js
/**
 * Funções puras para gerar e avançar chaveamentos.
 * Todas as funções recebem e retornam objetos simples, sem efeitos colaterais.
 */

/**
 * Embaralha um array usando Fisher‑Yates.
 */
const shuffle = (array) => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Calcula a próxima potência de 2 maior ou igual a n.
 */
const nextPowerOfTwo = (n) => {
  return 2 ** Math.ceil(Math.log2(n));
};

/**
 * gerarBracketMataMata(times)
 *   - times: array de objetos { id, nome, cor }
 *   - retorna array de jogos a serem criados (não persiste).
 * Cada jogo contém: { id: <generated>, esporteId, fase, round, timeAId, timeBId, status, proximoJogoId, slot }
 */
export const gerarBracketMataMata = (times) => {
  const shuffled = shuffle(times);
  const totalTimes = shuffled.length;
  const size = nextPowerOfTwo(totalTimes);
  const byes = size - totalTimes;
  // Preenche pores com null (byes) no fim do array
  const padded = [...shuffled, ...Array(byes).fill(null)];
  const rounds = Math.log2(size);
  const jogos = [];

  // Primeiro round (round 1)
  for (let i = 0; i < size / 2; i++) {
    const timeA = padded[i];
    const timeB = padded[size - 1 - i];
    const jogo = {
      id: `jogo_${Date.now()}_${i}`,
      fase: "mata-mata",
      round: 1,
      timeAId: timeA?.id ?? null,
      timeBId: timeB?.id ?? null,
      status: "pendente",
      proximoJogoId: null,
      slot: null,
    };
    jogos.push(jogo);
  }

  // Cria placeholders para rounds subsequentes (sem times ainda)
  for (let r = 2; r <= rounds; r++) {
    const numGames = size / (2 ** r);
    for (let i = 0; i < numGames; i++) {
      const jogo = {
        id: `jogo_${Date.now()}_${r}_${i}`,
        fase: "mata-mata",
        round: r,
        timeAId: null,
        timeBId: null,
        status: "pendente",
        proximoJogoId: null,
        slot: null,
      };
      jogos.push(jogo);
    }
  }

  // Encadeia jogos: o vencedor de cada jogo do round r vai para slot A ou B do jogo correspondente no round r+1
  const roundGames = {};
  jogos.forEach((j) => {
    roundGames[`r${j.round}`] = roundGames[`r${j.round}`] || [];
    roundGames[`r${j.round}`].push(j);
  });

  for (let r = 1; r < rounds; r++) {
    const current = roundGames[`r${r}`];
    const next = roundGames[`r${r + 1}`];
    current.forEach((game, idx) => {
      const targetIdx = Math.floor(idx / 2);
      const slot = idx % 2 === 0 ? "A" : "B";
      game.proximoJogoId = next[targetIdx].id;
      game.slot = slot;
    });
  }

  // Byes avançam automaticamente – se um time estiver contra null, coloca o vencedor no próximo game
  jogos.forEach((game) => {
    if (game.timeAId && !game.timeBId) {
      // A avança
      if (game.proximoJogoId) {
        const nextGame = jogos.find((g) => g.id === game.proximoJogoId);
        if (nextGame) {
          nextGame[game.slot === "A" ? "timeAId" : "timeBId"] = game.timeAId;
        }
      }
    } else if (!game.timeAId && game.timeBId) {
      // B avança
      if (game.proximoJogoId) {
        const nextGame = jogos.find((g) => g.id === game.proximoJogoId);
        if (nextGame) {
          nextGame[game.slot === "A" ? "timeAId" : "timeBId"] = game.timeBId;
        }
      }
    }
  });

  return jogos;
};

/**
 * gerarFaseGrupos(times, numGrupos)
 *   - Distribui times em grupos após shuffle.
 *   - Gera todos os confrontos round‑robin dentro de cada grupo.
 * Retorna objeto { grupos: [{ id, times: [] }], jogos: [] }
 */
export const gerarFaseGrupos = (times, numGrupos) => {
  const shuffled = shuffle(times);
  const groups = [];
  const perGroup = Math.ceil(shuffled.length / numGrupos);
  for (let i = 0; i < numGrupos; i++) {
    groups.push({
      id: `grupo_${i + 1}`,
      times: shuffled.slice(i * perGroup, (i + 1) * perGroup),
    });
  }
  const jogos = [];
  groups.forEach((g) => {
    const ts = g.times;
    for (let a = 0; a < ts.length; a++) {
      for (let b = a + 1; b < ts.length; b++) {
        const jogo = {
          id: `jogo_${Date.now()}_${g.id}_${ts[a].id}_${ts[b].id}`,
          fase: "grupos",
          grupoId: g.id,
          timeAId: ts[a].id,
          timeBId: ts[b].id,
          status: "pendente",
          proximoJogoId: null,
          slot: null,
        };
        jogos.push(jogo);
      }
    }
  });
  return { grupos, jogos };
};

/**
 * gerarMataMataPosGrupos(grupos, classificadosPorGrupo, regras, esporteId)
 *   - grupos: array de objetos { id, times }
 *   - classificadosPorGrupo: { [grupoId]: [timeId] } (ordenado por classificação)
 *   - regras: objeto de regras do esporte (usado apenas para persistência)
 *   - retorna array de jogos de mata‑mata já encadeados.
 */
export const gerarMataMataPosGrupos = (grupos, classificadosPorGrupo, esporteId) => {
  // Cross‑seed: 1ºA x 2ºB, 1ºB x 2ºA etc.
  const seeds = [];
  const gruposArr = grupos.map((g) => ({
    id: g.id,
    classificados: classificadosPorGrupo[g.id] || [],
  }));

  // Assume dois grupos para simplificar; se houver mais, faz pareamento em ordem
  if (gruposArr.length !== 2) {
    console.warn("gerarMataMataPosGrupos espera exatamente 2 grupos");
  }
  const [gA, gB] = gruposArr;
  const minLen = Math.min(gA.classificados.length, gB.classificados.length);
  for (let i = 0; i < minLen; i++) {
    const timeA = i % 2 === 0 ? gA.classificados[i / 2] : gB.classificados[Math.floor(i / 2)];
    const timeB = i % 2 === 0 ? gB.classificados[i / 2] : gA.classificados[Math.floor(i / 2)];
    seeds.push({ timeAId: timeA, timeBId: timeB });
  }
  // Usa gerarBracketMataMata sobre os times seed
  const seedTimes = seeds.map((s, idx) => ({ id: `seed_${idx}`, ...s }));
  // Para compatibilidade, vamos criar jogos usando gerarBracketMataMata e depois substituir os ids
  const bracket = gerarBracketMataMata(seedTimes);
  // Substitui os placeholders de timeAId/BId pelos verdadeiros
  bracket.forEach((j) => {
    if (j.timeAId && j.timeAId.startsWith("seed_")) {
      const seed = seeds[parseInt(j.timeAId.split("_")[1], 10)];
      j.timeAId = seed.timeAId;
    }
    if (j.timeBId && j.timeBId.startsWith("seed_")) {
      const seed = seeds[parseInt(j.timeBId.split("_")[1], 10)];
      j.timeBId = seed.timeBId;
    }
    j.esporteId = esporteId;
    j.fase = "mata-mata";
  });
  return bracket;
};

/**
 * gerarRodadasColetivo(times, numRodadas)
 *   - Para esportes coletivos (não‑1v1).
 *   - Em cada rodada, embaralha os times. Se número ímpar, escolhe aleatoriamente um time que jogará duas vezes.
 *   - Retorna array de jogos.
 */
export const gerarRodadasColetivo = (times, numRodadas) => {
  const jogos = [];
  for (let r = 1; r <= numRodadas; r++) {
    const shuffled = shuffle(times);
    let extra = null;
    if (shuffled.length % 2 === 1) {
      const idx = Math.floor(Math.random() * shuffled.length);
      extra = shuffled.splice(idx, 1)[0];
    }
    for (let i = 0; i < shuffled.length; i += 2) {
      const jogo = {
        id: `jogo_${Date.now()}_${r}_${i / 2}`,
        fase: "coletivo",
        rodada: r,
        timeAId: shuffled[i].id,
        timeBId: shuffled[i + 1].id,
        status: "pendente",
        proximoJogoId: null,
        slot: null,
      };
      jogos.push(jogo);
    }
    if (extra) {
      // Cria dois jogos onde o extra aparece duas vezes contra dois adversários aleatórios
      const opponents = shuffle(times.filter((t) => t.id !== extra.id)).slice(0, 2);
      opponents.forEach((opp, idx) => {
        const jogo = {
          id: `jogo_${Date.now()}_${r}_extra_${idx}`,
          fase: "coletivo",
          rodada: r,
          timeAId: extra.id,
          timeBId: opp.id,
          status: "pendente",
          proximoJogoId: null,
          slot: null,
        };
        jogos.push(jogo);
      });
    }
  }
  return jogos;
};

/**
 * avancarBracket(jogo)
 *   - jogo: objeto completo já carregado do Firestore.
 *   - Atualiza o próximo jogo (se houver) colocando o vencedor no slot correto.
 *   - Não persiste; usado dentro de um writeBatch na camada de serviço.
 */
export const avancarBracket = (jogo, vencedorId) => {
  if (!jogo.proximoJogoId || !vencedorId) return null;
  const campoSlot = jogo.slot === "A" ? "timeAId" : "timeBId";
  return { proximoJogoId: jogo.proximoJogoId, campoSlot, vencedorId };
};

/**
 * Helper para gerar um ID de jogo único (para uso interno, não confiável como chave primária em produção).
 */
export const gerarIdJogo = () => `jogo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

