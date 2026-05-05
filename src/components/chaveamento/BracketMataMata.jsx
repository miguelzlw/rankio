// Renderiza um bracket eliminatorio em colunas (uma por rodada).
import TimeChip from '../common/TimeChip.jsx';

export default function BracketMataMata({ jogos, timesPorId }) {
  // Agrupa em rodadas: rodada 0 = jogos sem proximoJogoId apontando pra eles
  // Constroi grafo: para cada jogo, quantos predecessores tem.
  const sucessores = new Map(); // jogoId -> proximo
  const predecessores = new Map(); // jogoId -> [jogosAnteriores]
  jogos.forEach((j) => {
    if (j.proximoJogoId) {
      sucessores.set(j.id, j.proximoJogoId);
      const lista = predecessores.get(j.proximoJogoId) || [];
      lista.push(j);
      predecessores.set(j.proximoJogoId, lista);
    }
  });

  // Rodada de cada jogo: jogos sem predecessores sao rodada 0; demais incrementam
  const rodadaPorJogo = new Map();
  function calcularRodada(j) {
    if (rodadaPorJogo.has(j.id)) return rodadaPorJogo.get(j.id);
    const preds = predecessores.get(j.id) || [];
    if (preds.length === 0) {
      rodadaPorJogo.set(j.id, 0);
      return 0;
    }
    const r = Math.max(...preds.map(calcularRodada)) + 1;
    rodadaPorJogo.set(j.id, r);
    return r;
  }
  jogos.forEach(calcularRodada);

  const totalRodadas = Math.max(0, ...Array.from(rodadaPorJogo.values())) + 1;
  const rodadas = Array.from({ length: totalRodadas }, () => []);
  jogos
    .slice()
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .forEach((j) => rodadas[rodadaPorJogo.get(j.id)].push(j));

  if (jogos.length === 0) return <p className="text-slate-500 text-sm">Sem jogos.</p>;

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className="flex gap-3 min-w-max pb-2">
        {rodadas.map((rodada, idx) => (
          <div key={idx} className="flex flex-col gap-2 justify-around min-w-[180px]">
            <p className="text-xs font-medium text-slate-500 mb-1">
              {idx === totalRodadas - 1
                ? 'Final'
                : idx === totalRodadas - 2
                  ? 'Semi'
                  : `Rodada ${idx + 1}`}
            </p>
            {rodada.map((j) => (
              <JogoBracket key={j.id} jogo={j} timesPorId={timesPorId} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function JogoBracket({ jogo, timesPorId }) {
  const a = timesPorId.get(jogo.timeAId);
  const b = timesPorId.get(jogo.timeBId);
  const fim = jogo.status === 'finalizado';
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-2 text-xs">
      <Linha
        time={a}
        pontos={fim ? jogo.pontosTimeA : null}
        vencedor={fim && jogo.vencedor === jogo.timeAId}
      />
      <div className="border-t border-slate-100 my-1" />
      <Linha
        time={b}
        pontos={fim ? jogo.pontosTimeB : null}
        vencedor={fim && jogo.vencedor === jogo.timeBId}
      />
    </div>
  );
}

function Linha({ time, pontos, vencedor }) {
  return (
    <div className={`flex items-center gap-2 ${vencedor ? 'font-semibold' : ''}`}>
      <TimeChip time={time} size="sm" placeholder="—" />
      {pontos !== null && pontos !== undefined && (
        <span className="ml-auto tabular-nums text-slate-700">{pontos}</span>
      )}
    </div>
  );
}
