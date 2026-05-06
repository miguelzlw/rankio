// Funcoes puras para gerar chaveamentos. Retornam estruturas em memoria
// que serao gravadas em batch pela camada de firestore.js.
//
// CONTRATOS:
// - Status inicial dos jogos = 'agendado'.
// - Coletivo usa fase no formato 'rodada-N' (ex: 'rodada-1').
// - Mata-mata usa fase 'mata-mata'. Fase de grupos usa 'grupos'.
// - Cada jogo de mata-mata pode ter proximoJogoId + slot ('A' | 'B') indicando
//   onde o vencedor entra na proxima rodada.
// - Times participantes "vazios" (bye) viram null no slot e o jogo ja eh
//   marcado como finalizado com vencedor automatico.

import { classificarGrupo } from './scoring.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function genId(prefix = 'jogo') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}_${Math.random().toString(36).slice(2, 6)}`;
}

function jogoBase(esporteId, fase, ordem, extras = {}) {
  return {
    id: genId('jogo'),
    esporteId,
    timeAId: null,
    timeBId: null,
    status: 'agendado',
    fase,
    eventos: [],
    placarTimeA: 0,
    placarTimeB: 0,
    pontosTimeA: 0,
    pontosTimeB: 0,
    vencedor: null,
    proximoJogoId: null,
    slot: null,
    ordem,
    ...extras,
  };
}

// =========== MATA-MATA DIRETO (1v1) ===========
export function gerarBracketMataMata(esporteId, times) {
  if (!times || times.length < 2) return [];
  const embaralhados = shuffle(times);
  return montarBracketComSeeds(esporteId, embaralhados.map((t) => t.id));
}

// Monta um bracket com seeds ja definidos (pareamento alto vs baixo).
// `slots` e array de timeIds com `null` representando byes.
function montarBracketComSeeds(esporteId, seeds, ordemBase = 1) {
  const tamanho = nextPowerOfTwo(seeds.length);
  const slots = [...seeds];
  while (slots.length < tamanho) slots.push(null);

  const totalRodadas = Math.log2(tamanho);
  const jogosPorRodada = [];
  let ordem = ordemBase;

  // Rodada 0: pareamento "alto x baixo" classico (slots[i] vs slots[size-1-i])
  const r0 = [];
  for (let i = 0; i < slots.length / 2; i++) {
    r0.push(
      jogoBase(esporteId, 'mata-mata', ordem++, {
        timeAId: slots[i],
        timeBId: slots[slots.length - 1 - i],
      })
    );
  }
  jogosPorRodada.push(r0);

  // Rodadas seguintes: jogos vazios encadeados
  for (let r = 1; r < totalRodadas; r++) {
    const prev = jogosPorRodada[r - 1];
    const curr = [];
    for (let i = 0; i < prev.length; i += 2) {
      const novo = jogoBase(esporteId, 'mata-mata', ordem++);
      curr.push(novo);
      prev[i].proximoJogoId = novo.id;
      prev[i].slot = 'A';
      prev[i + 1].proximoJogoId = novo.id;
      prev[i + 1].slot = 'B';
    }
    jogosPorRodada.push(curr);
  }

  return resolverByes(jogosPorRodada.flat());
}

// Resolve byes em cascata: jogos onde um lado eh null e o outro nao
// E que nao tem outro jogo alimentando o slot vazio sao marcados como finalizados
// automaticamente, propagando o vencedor pro proximo jogo.
function resolverByes(jogos) {
  const porId = new Map(jogos.map((j) => [j.id, j]));
  const alimentadores = new Map(); // id do jogo -> [ids dos predecessores]
  jogos.forEach((j) => {
    if (j.proximoJogoId) {
      const lista = alimentadores.get(j.proximoJogoId) || [];
      lista.push(j.id);
      alimentadores.set(j.proximoJogoId, lista);
    }
  });

  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const j of jogos) {
      if (j.status !== 'agendado') continue;
      const aVazio = !j.timeAId;
      const bVazio = !j.timeBId;
      if (!aVazio && !bVazio) continue;
      if (aVazio && bVazio) continue;

      // Se ha algum predecessor que ainda pode mandar um time pra esse jogo,
      // espera. So resolve bye se todos os predecessores ja finalizaram.
      const preds = alimentadores.get(j.id) || [];
      const algumPendente = preds.some((pid) => {
        const p = porId.get(pid);
        return p && p.status !== 'finalizado';
      });
      if (algumPendente) continue;

      const vencedor = aVazio ? j.timeBId : j.timeAId;
      if (!vencedor) continue;
      j.status = 'finalizado';
      j.vencedor = vencedor;
      j.bye = true;
      if (j.proximoJogoId) {
        const prox = porId.get(j.proximoJogoId);
        if (prox) {
          if (j.slot === 'A') prox.timeAId = vencedor;
          else prox.timeBId = vencedor;
        }
      }
      mudou = true;
    }
  }
  return jogos;
}

// =========== FASE DE GRUPOS (1v1) ===========
// Distribui times nos grupos sequencialmente apos shuffle.
// Gera todos os confrontos round-robin de cada grupo.
// Retorna { jogos, composicao }, onde composicao eh persistida em
// esporte.config.grupos pra ser usada no chaveamento.
export function gerarFaseGrupos(esporteId, times, numGrupos) {
  const embaralhados = shuffle(times);
  const grupos = Array.from({ length: numGrupos }, () => []);
  embaralhados.forEach((t, i) => grupos[i % numGrupos].push(t));

  const jogos = [];
  let ordem = 1;
  grupos.forEach((timesDoGrupo, gIdx) => {
    const grupoId = `G${gIdx + 1}`;
    for (let i = 0; i < timesDoGrupo.length; i++) {
      for (let j = i + 1; j < timesDoGrupo.length; j++) {
        jogos.push(
          jogoBase(esporteId, 'grupos', ordem++, {
            grupoId,
            timeAId: timesDoGrupo[i].id,
            timeBId: timesDoGrupo[j].id,
          })
        );
      }
    }
  });

  const composicao = grupos.map((g, i) => ({
    grupoId: `G${i + 1}`,
    timeIds: g.map((t) => t.id),
  }));

  return { jogos, composicao };
}

// Apos finalizar todos os jogos da fase de grupos, monta o mata-mata
// com os top-N classificados de cada grupo (seeding cruzado).
export function gerarMataMataPosGrupos({ esporteId, esporteConfig, times, jogos }) {
  const composicao = esporteConfig?.grupos || [];
  const timesQueAvancam = esporteConfig?.timesQueAvancam || 1;
  const timesPorId = new Map(times.map((t) => [t.id, t]));

  // Top-N de cada grupo
  const classificadosPorGrupo = composicao.map(({ grupoId, timeIds }) => {
    const timesDoGrupo = timeIds.map((id) => timesPorId.get(id)).filter(Boolean);
    const jogosDoGrupo = jogos.filter(
      (j) => j.esporteId === esporteId && j.fase === 'grupos' && j.grupoId === grupoId
    );
    const ranking = classificarGrupo(timesDoGrupo, jogosDoGrupo, esporteId);
    return {
      grupoId,
      top: ranking.slice(0, timesQueAvancam).map((r) => r.time),
    };
  });

  // Lista de classificados em ordem de seed (pos 1 de todos, depois pos 2, etc.)
  const seeds = [];
  for (let pos = 0; pos < timesQueAvancam; pos++) {
    for (const g of classificadosPorGrupo) {
      if (g.top[pos]) seeds.push(g.top[pos].id);
    }
  }
  if (seeds.length < 2) return [];

  // Pareamento cruzado: seeds[0] vs seeds[N-1], seeds[1] vs seeds[N-2], etc.
  // (que e o que `montarBracketComSeeds` ja faz quando recebe na ordem 1..N)
  // Comeca com ordem 1000 pra ficar depois dos jogos de grupo na visualizacao.
  return montarBracketComSeeds(esporteId, seeds, 1000);
}

// =========== COLETIVO (rodadas) ===========
// Pra cada rodada: embaralha e pareia. Se nº ímpar, sorteia UM time pra jogar 2x
// (aparece duas vezes no pool da rodada). Total de jogos na rodada = ceil(N/2).
export function gerarRodadasColetivo(esporteId, times, numRodadas) {
  if (!times || times.length < 2) return [];
  const jogos = [];
  let ordem = 1;
  for (let r = 1; r <= numRodadas; r++) {
    const fase = `rodada-${r}`;
    let pool = shuffle(times);

    // Se ímpar, escolhe um time pra duplicar nessa rodada
    if (pool.length % 2 === 1) {
      const dobradoIdx = Math.floor(Math.random() * pool.length);
      const dobrado = pool[dobradoIdx];
      pool = shuffle([...pool, dobrado]);
      // Garante que o time dobrado nao apareca nos dois lados do mesmo jogo:
      // se dois `dobrado` ficarem em posicoes consecutivas pares, embaralha de novo
      let tentativas = 0;
      while (tentativas < 10) {
        let conflito = false;
        for (let i = 0; i < pool.length; i += 2) {
          if (pool[i].id === pool[i + 1].id) {
            conflito = true;
            break;
          }
        }
        if (!conflito) break;
        pool = shuffle(pool);
        tentativas++;
      }
    }

    for (let i = 0; i < pool.length; i += 2) {
      jogos.push(
        jogoBase(esporteId, fase, ordem++, {
          timeAId: pool[i].id,
          timeBId: pool[i + 1].id,
        })
      );
    }
  }
  return jogos;
}
