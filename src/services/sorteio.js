// Logica pura do sorteio de times ao vivo, com "encaixe fixo" secreto.
//
// IMPORTANTE (sigilo): NOMES_FIXOS mora SO aqui, nunca eh renderizado na UI.
// Toda a aleatoriedade acontece nesta funcao, ANTES da revelacao na tela:
// a tela so reproduz `ordemRevelacao` um item por vez. Como a distribuicao ja
// respeita os fixos e o equilibrio, e a ordem de revelacao eh randomizada, os
// nomes fixos ficam indistinguiveis dos sorteados de verdade.
//
// Para editar as regras fixas: mude o objeto NOMES_FIXOS abaixo. A chave eh o
// nome da PESSOA (normalizado: minusculo, sem acento, espacos colapsados) e o
// valor eh o NOME do time (tambem comparado de forma normalizada contra o campo
// `nome` do time).

// Time alvo dos nomes fixos (comparado de forma normalizada contra o nome do time).
const TIME_FIXO = 'Polônia - São João Paulo II';

const NOMES_FIXOS = {
  // chaves ja normalizadas (minusculo, sem acento, espacos colapsados)
  'luis miguel': TIME_FIXO,
  'luiz miguel': TIME_FIXO,
  'antonny flores': TIME_FIXO,
  'maya macrini': TIME_FIXO,
  'fernanda': TIME_FIXO,
  'neguinho': TIME_FIXO,
  'kross': TIME_FIXO,
  'neguin': TIME_FIXO,
};

// Normaliza pra comparacao robusta: tira espacos das pontas, colapsa espacos
// internos, minuscula e remove acentos.
export function normalizar(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// Fisher-Yates (espelha src/services/brackets.js; copia local pra manter este
// servico autocontido).
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Sorteia os nomes entre os times participantes.
//
// Parametros:
//   nomes: string[]  -> nomes digitados pelo operador (um por linha, ja split)
//   times: Array<{ id, nome, cor? }> -> times participantes (ja existentes)
//
// Retorna:
//   {
//     atribuicoes: { [timeId]: string[] },   // resultado final por time
//     ordemRevelacao: [{ nome, timeId }],    // ordem do show ao vivo (round-robin)
//     avisos: string[],                      // mensagens (duplicados etc.)
//   }
export function sortearTimes({ nomes, times }) {
  const avisos = [];
  const participantes = times || [];

  // 1) Limpa, descarta vazios e remove duplicados (mantendo a 1a ocorrencia).
  const vistos = new Set();
  const limpos = [];
  let duplicados = 0;
  for (const bruto of nomes || []) {
    const nome = String(bruto ?? '').trim().replace(/\s+/g, ' ');
    if (!nome) continue;
    const chave = normalizar(nome);
    if (vistos.has(chave)) {
      duplicados += 1;
      continue;
    }
    vistos.add(chave);
    limpos.push(nome);
  }
  if (duplicados > 0) {
    avisos.push(
      `${duplicados} nome(s) repetido(s) foram ignorados.`
    );
  }

  // 2) Um balde por time participante.
  const atribuicoes = {};
  for (const t of participantes) atribuicoes[t.id] = [];

  // Indice nome-normalizado-do-time -> timeId (pra casar com NOMES_FIXOS).
  const timePorNome = new Map();
  for (const t of participantes) timePorNome.set(normalizar(t.nome), t.id);

  // 3) Fixos primeiro. Nome fixo nao digitado -> some em silencio (so nao
  //    aparece no pool). Nome fixo cujo time nao esta no sorteio -> cai no pool
  //    normal (sera sorteado), sem alarde.
  const pool = [];
  for (const nome of limpos) {
    const alvoNomeTime = NOMES_FIXOS[normalizar(nome)];
    if (alvoNomeTime) {
      const timeId = timePorNome.get(normalizar(alvoNomeTime));
      if (timeId) {
        atribuicoes[timeId].push(nome);
        continue;
      }
    }
    pool.push(nome);
  }

  // 4) Embaralha o resto (aleatorio de verdade).
  const restante = shuffle(pool);

  // 5) Equilibrio: cada nome vai pro time com MENOS membros no momento
  //    (empate quebrado aleatoriamente). Isso distribui o "resto" da divisao
  //    de forma justa e deixa todos iguais (+-1), completando ao redor dos fixos.
  if (participantes.length > 0) {
    for (const nome of restante) {
      const minLen = Math.min(...participantes.map((t) => atribuicoes[t.id].length));
      const candidatos = participantes.filter((t) => atribuicoes[t.id].length === minLen);
      const escolhido = candidatos[Math.floor(Math.random() * candidatos.length)];
      atribuicoes[escolhido.id].push(nome);
    }
  } else if (restante.length > 0) {
    avisos.push('Nenhum time selecionado para o sorteio.');
  }

  // 6) Ordem de revelacao: round-robin entre os times (ordem dos times
  //    randomizada a cada rodada; dentro do time, um membro aleatorio ainda nao
  //    revelado). Produz a cadencia "um time de cada vez" sem expor os fixos.
  const restantesPorTime = {};
  for (const t of participantes) restantesPorTime[t.id] = shuffle(atribuicoes[t.id]);

  const ordemRevelacao = [];
  const totalNomes = participantes.reduce((acc, t) => acc + atribuicoes[t.id].length, 0);
  while (ordemRevelacao.length < totalNomes) {
    const ordemTimes = shuffle(participantes);
    let revelouAlgo = false;
    for (const t of ordemTimes) {
      const fila = restantesPorTime[t.id];
      if (fila.length > 0) {
        ordemRevelacao.push({ nome: fila.shift(), timeId: t.id });
        revelouAlgo = true;
      }
    }
    if (!revelouAlgo) break; // seguranca anti-loop
  }

  return { atribuicoes, ordemRevelacao, avisos };
}
