// Funcoes puras para calculo de placar do jogo, pontos do torneio,
// classificacao de grupo e ranking geral. Sem efeitos colaterais.
//
// CONTRATO DE DADOS:
//
// Esporte (campos relevantes pra pontuacao):
//   {
//     pontosVencedor: number,   // ex: +5 (aplicado ao vencedor ao finalizar)
//     pontosPerdedor: number,   // ex: -1 ou 0 (aplicado ao perdedor)
//     pontosEmpate: number,     // ex: +1 (so coletivo/grupos; mata-mata 1v1 nao permite empate)
//     regras: [{
//       id, nome,
//       placarACausa, placarBSofre,    // afetam o placar do jogo (gols, cestas...)
//       pontosACausa, pontosBSofre,    // afetam o ranking do torneio (bonus por evento)
//     }]
//   }
//
// Eventos (lancados durante o jogo):
//   { id, regraId, regraNome, timeAfetado: 'A' | 'B', timestamp, timestampCronometro }
//
// Jogo armazenado:
//   {
//     placarTimeA, placarTimeB,   // placar da partida (gols)
//     pontosTimeA, pontosTimeB,   // pontos no ranking do torneio
//     vencedor: timeId | null,    // determinado pelo PLACAR ao finalizar
//   }
//
// COMPATIBILIDADE com regras antigas: se uma regra so tem `pontosACausa`/`pontosBSofre`
// (modelo legado) e nao tem `placarACausa`/`placarBSofre`, tratamos os pontos como
// placar (afinal, antes os "pontos" eram a unica medida do jogo).

function placarCausaDe(regra) {
  if (regra.placarACausa !== undefined) return regra.placarACausa || 0;
  return regra.pontosACausa || 0;
}
function placarSofreDe(regra) {
  if (regra.placarBSofre !== undefined) return regra.placarBSofre || 0;
  return regra.pontosBSofre || 0;
}
function pontosCausaDe(regra) {
  // So conta como pontos de torneio se a regra eh do modelo novo (tem placar* definido).
  if (regra.placarACausa === undefined) return 0;
  return regra.pontosACausa || 0;
}
function pontosSofreDe(regra) {
  if (regra.placarACausa === undefined) return 0;
  return regra.pontosBSofre || 0;
}

// Calcula o placar parcial e os pontos parciais do torneio com base nos eventos.
// Retorna { placarTimeA, placarTimeB, pontosTimeA, pontosTimeB }.
// Os pontos retornados aqui NAO incluem pontosVencedor/Perdedor/Empate — esses
// sao aplicados em `aplicarPontosFinais` quando o jogo eh finalizado.
export function calcularPlacarJogo(eventos = [], regras = []) {
  const regraPorId = new Map((regras || []).map((r) => [r.id, r]));
  let placarA = 0;
  let placarB = 0;
  let pontosA = 0;
  let pontosB = 0;
  for (const ev of eventos || []) {
    const regra = regraPorId.get(ev.regraId);
    if (!regra) continue;
    const pCausa = placarCausaDe(regra);
    const pSofre = placarSofreDe(regra);
    const tCausa = pontosCausaDe(regra);
    const tSofre = pontosSofreDe(regra);
    if (ev.timeAfetado === 'A') {
      placarA += pCausa;
      placarB += pSofre;
      pontosA += tCausa;
      pontosB += tSofre;
    } else if (ev.timeAfetado === 'B') {
      placarB += pCausa;
      placarA += pSofre;
      pontosB += tCausa;
      pontosA += tSofre;
    }
  }
  return { placarTimeA: placarA, placarTimeB: placarB, pontosTimeA: pontosA, pontosTimeB: pontosB };
}

// Determina vencedor do jogo a partir do placar. Retorna timeId ou null (empate).
export function determinarVencedor(jogo) {
  const a = jogo.placarTimeA ?? 0;
  const b = jogo.placarTimeB ?? 0;
  if (a > b) return jogo.timeAId;
  if (b > a) return jogo.timeBId;
  return null;
}

// Aplica os pontos de vencedor/perdedor/empate nos pontos parciais que vieram dos eventos.
// Se jogo.vencedorOverride estiver setado (ex: decisao por penaltis em empate de
// mata-mata), usa esse vencedor em vez de calcular pelo placar — mas os pontos
// aplicados ainda sao V/P (vencedor/perdedor), nao E (empate), pois alguem ganhou.
// Retorna { pontosTimeA, pontosTimeB, vencedor }.
export function aplicarPontosFinais(jogo, esporte) {
  const placarA = jogo.placarTimeA ?? 0;
  const placarB = jogo.placarTimeB ?? 0;
  let pontosA = jogo.pontosTimeA ?? 0;
  let pontosB = jogo.pontosTimeB ?? 0;

  const pVenc = esporte?.pontosVencedor ?? 0;
  const pPerd = esporte?.pontosPerdedor ?? 0;
  const pEmp = esporte?.pontosEmpate ?? 0;

  // Override tem prioridade
  let vencedor = null;
  if (jogo.vencedorOverride) {
    vencedor = jogo.vencedorOverride;
  } else if (placarA > placarB) {
    vencedor = jogo.timeAId;
  } else if (placarB > placarA) {
    vencedor = jogo.timeBId;
  }

  if (vencedor === jogo.timeAId) {
    pontosA += pVenc;
    pontosB += pPerd;
  } else if (vencedor === jogo.timeBId) {
    pontosB += pVenc;
    pontosA += pPerd;
  } else {
    // Sem vencedor: empate de verdade
    pontosA += pEmp;
    pontosB += pEmp;
  }

  return { pontosTimeA: pontosA, pontosTimeB: pontosB, vencedor };
}

// Soma de pontos do torneio de um time num esporte, considerando jogos finalizados.
// Se o esporte for fornecido, aplica tambem os bonus de campeao/vice/3o lugar.
export function pontuacaoTimeNoEsporte(timeId, esporteId, jogos = [], esporte = null) {
  let total = 0;
  for (const j of jogos) {
    if (j.esporteId !== esporteId) continue;
    if (j.status !== 'finalizado') continue;
    if (j.timeAId === timeId) total += j.pontosTimeA ?? 0;
    if (j.timeBId === timeId) total += j.pontosTimeB ?? 0;
  }
  if (esporte) total += bonusCampeonato(timeId, esporte, jogos);
  return total;
}

// Bonus aplicado ao campeao/vice/terceiro do mata-mata final (1v1).
// Detecta a final como o jogo mata-mata sem proximoJogoId. Os semifinalistas
// (3o lugar) sao quem perdeu nos jogos que apontam pra final.
// Coletivos (rodadas) nao tem 'campeao' formal, retorna 0.
export function bonusCampeonato(timeId, esporte, jogos = []) {
  if (!esporte || esporte.tipo !== '1v1') return 0;

  const jogosDoEsporte = jogos.filter((j) => j.esporteId === esporte.id);
  const final = jogosDoEsporte.find(
    (j) => j.fase === 'mata-mata' && !j.proximoJogoId && j.status === 'finalizado'
  );
  if (!final) return 0;

  const campeao = final.vencedor;
  if (!campeao) return 0;
  const vice = campeao === final.timeAId ? final.timeBId : final.timeAId;

  if (timeId === campeao) return esporte.pontosCampeao ?? 0;
  if (timeId === vice) return esporte.pontosVice ?? 0;

  // 3o lugar: perdedor das semifinais (jogos que apontam pra final)
  const semis = jogosDoEsporte.filter(
    (j) => j.proximoJogoId === final.id && j.status === 'finalizado'
  );
  for (const semi of semis) {
    if (!semi.vencedor) continue;
    const perdedor = semi.vencedor === semi.timeAId ? semi.timeBId : semi.timeAId;
    if (perdedor === timeId) return esporte.pontosTerceiro ?? 0;
  }

  return 0;
}

// Saldo de placar (gols feitos − sofridos) do time num esporte.
function saldoPlacarNoEsporte(timeId, esporteId, jogos) {
  let saldo = 0;
  for (const j of jogos) {
    if (j.esporteId !== esporteId) continue;
    if (j.status !== 'finalizado') continue;
    const a = j.placarTimeA ?? 0;
    const b = j.placarTimeB ?? 0;
    if (j.timeAId === timeId) saldo += a - b;
    if (j.timeBId === timeId) saldo += b - a;
  }
  return saldo;
}

function vencedorConfrontoDireto(idA, idB, esporteId, jogos) {
  let vitoriasA = 0;
  let vitoriasB = 0;
  for (const j of jogos) {
    if (j.esporteId !== esporteId || j.status !== 'finalizado') continue;
    const enfrentaram =
      (j.timeAId === idA && j.timeBId === idB) ||
      (j.timeAId === idB && j.timeBId === idA);
    if (!enfrentaram) continue;
    if (j.vencedor === idA) vitoriasA += 1;
    if (j.vencedor === idB) vitoriasB += 1;
  }
  if (vitoriasA > vitoriasB) return idA;
  if (vitoriasB > vitoriasA) return idB;
  return null;
}

// Ranking geral (todos os esportes somados, com bonus de campeao/vice/3o).
export function calcularRanking(times = [], esportes = [], jogos = []) {
  return (times || [])
    .map((time) => {
      const breakdown = {};
      let total = 0;
      for (const esp of esportes || []) {
        const pts = pontuacaoTimeNoEsporte(time.id, esp.id, jogos, esp);
        breakdown[esp.id] = pts;
        total += pts;
      }
      return { time, total, breakdown };
    })
    .sort((a, b) => b.total - a.total);
}

// Calcula artilharia de um esporte: top N autores de eventos.
// Considera tanto jogos finalizados quanto ao_vivo (eventos ja contam).
// Retorna [{ autor, time, eventos: { regraNome: count, _total: total }}] ordenado.
export function calcularArtilharia(esporteId, jogos = [], times = []) {
  const timesPorId = new Map((times || []).map((t) => [t.id, t]));
  // chave eh `${timeId}|${autor}` pra nao misturar jogadores homonimos de times distintos
  const acumulado = new Map();
  for (const j of jogos || []) {
    if (j.esporteId !== esporteId) continue;
    if (j.status !== 'finalizado' && j.status !== 'ao_vivo') continue;
    for (const ev of j.eventos || []) {
      if (!ev.autor) continue;
      const timeId = ev.timeAfetado === 'A' ? j.timeAId : j.timeBId;
      if (!timeId) continue;
      const chave = `${timeId}|${ev.autor}`;
      const slot = acumulado.get(chave) || {
        autor: ev.autor,
        time: timesPorId.get(timeId) ?? null,
        eventos: {},
        total: 0,
      };
      slot.eventos[ev.regraNome] = (slot.eventos[ev.regraNome] ?? 0) + 1;
      slot.total += 1;
      acumulado.set(chave, slot);
    }
  }
  return Array.from(acumulado.values()).sort((a, b) => b.total - a.total);
}

// Classifica os times de um grupo (ou subconjunto num esporte).
// Criterios: pontos no esporte → saldo de placar → confronto direto → ordem cadastro.
export function classificarGrupo(timesDoGrupo = [], jogosDoEsporte = [], esporteId) {
  const dados = (timesDoGrupo || []).map((t, idx) => ({
    time: t,
    pontos: pontuacaoTimeNoEsporte(t.id, esporteId, jogosDoEsporte),
    saldo: saldoPlacarNoEsporte(t.id, esporteId, jogosDoEsporte),
    ordemCadastro: idx,
  }));

  dados.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.saldo !== a.saldo) return b.saldo - a.saldo;
    const v = vencedorConfrontoDireto(a.time.id, b.time.id, esporteId, jogosDoEsporte);
    if (v === a.time.id) return -1;
    if (v === b.time.id) return 1;
    return a.ordemCadastro - b.ordemCadastro;
  });

  return dados;
}
