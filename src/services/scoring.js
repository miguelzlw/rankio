// Funcoes puras para calculo de placar de jogo, classificacao de grupo
// e pontuacao total de cada time no torneio. Sem efeitos colaterais.
//
// CONTRATO DE DADOS (importante):
//
// Eventos lancados durante o jogo:
//   { id, regraId, regraNome, timeAfetado: 'A' | 'B', timestamp, timestampCronometro }
//   - timeAfetado indica qual lado do jogo causou (A ou B), nao o id real do time.
//
// Jogo finalizado guarda:
//   { pontosTimeA, pontosTimeB, vencedor: timeId | null, ... }

export function calcularPlacarJogo(eventos = [], regras = []) {
  const regraPorId = new Map((regras || []).map((r) => [r.id, r]));
  let pontosA = 0;
  let pontosB = 0;
  for (const ev of eventos || []) {
    const regra = regraPorId.get(ev.regraId);
    if (!regra) continue;
    const causa = regra.pontosACausa || 0;
    const sofre = regra.pontosBSofre || 0;
    if (ev.timeAfetado === 'A') {
      pontosA += causa;
      pontosB += sofre;
    } else if (ev.timeAfetado === 'B') {
      pontosB += causa;
      pontosA += sofre;
    }
  }
  return { pontosTimeA: pontosA, pontosTimeB: pontosB };
}

// Soma da pontuacao de um time num esporte especifico.
// Considera apenas jogos finalizados.
// `jogos` pode ser a lista completa do app — filtramos por esporteId aqui.
export function pontuacaoTimeNoEsporte(timeId, esporteId, jogos = []) {
  let total = 0;
  for (const j of jogos) {
    if (j.esporteId !== esporteId) continue;
    if (j.status !== 'finalizado') continue;
    if (j.timeAId === timeId) total += j.pontosTimeA ?? 0;
    if (j.timeBId === timeId) total += j.pontosTimeB ?? 0;
  }
  return total;
}

// Saldo de pontos de um time num esporte (pontos feitos - sofridos no jogo).
function saldoNoEsporte(timeId, esporteId, jogos) {
  let saldo = 0;
  for (const j of jogos) {
    if (j.esporteId !== esporteId) continue;
    if (j.status !== 'finalizado') continue;
    if (j.timeAId === timeId) saldo += (j.pontosTimeA ?? 0) - (j.pontosTimeB ?? 0);
    if (j.timeBId === timeId) saldo += (j.pontosTimeB ?? 0) - (j.pontosTimeA ?? 0);
  }
  return saldo;
}

// Vencedor do confronto direto entre dois times num esporte.
// Retorna o id do time vencedor, ou null se empate / nao se enfrentaram.
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

// Ranking geral do torneio (todos os esportes somados).
// Retorna [{ time, total, breakdown: { [esporteId]: pontos } }] desc.
export function calcularRanking(times = [], esportes = [], jogos = []) {
  return (times || [])
    .map((time) => {
      const breakdown = {};
      let total = 0;
      for (const esp of esportes || []) {
        const pts = pontuacaoTimeNoEsporte(time.id, esp.id, jogos);
        breakdown[esp.id] = pts;
        total += pts;
      }
      return { time, total, breakdown };
    })
    .sort((a, b) => b.total - a.total);
}

// Classifica os times de um grupo (ou de qualquer subconjunto num esporte).
// Criterios: pontos no esporte (desc), saldo (desc), confronto direto, ordem de cadastro.
// Retorna: [{ time, pontos, saldo, ordemCadastro }] na ordem da classificacao.
export function classificarGrupo(timesDoGrupo = [], jogosDoEsporte = [], esporteId) {
  const dados = (timesDoGrupo || []).map((t, idx) => ({
    time: t,
    pontos: pontuacaoTimeNoEsporte(t.id, esporteId, jogosDoEsporte),
    saldo: saldoNoEsporte(t.id, esporteId, jogosDoEsporte),
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
