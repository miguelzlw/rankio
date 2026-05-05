import TimeChip from '../common/TimeChip.jsx';

export default function RodadasColetivo({ jogos, times }) {
  const timesPorId = new Map(times.map((t) => [t.id, t]));
  const porRodada = new Map();
  jogos.forEach((j) => {
    if (!j.fase?.startsWith('rodada-')) return;
    const lista = porRodada.get(j.fase) || [];
    lista.push(j);
    porRodada.set(j.fase, lista);
  });
  const rodadas = Array.from(porRodada.entries()).sort(([a], [b]) =>
    Number(a.split('-')[1]) - Number(b.split('-')[1])
  );

  if (rodadas.length === 0) return <p className="text-slate-500 text-sm">Sem jogos.</p>;

  return (
    <div className="space-y-3">
      {rodadas.map(([fase, jogos]) => (
        <div key={fase} className="bg-surface/50 rounded-xl p-3 border border-white/10">
          <h3 className="font-semibold text-sm mb-2 text-text">Rodada {fase.split('-')[1]}</h3>
          <ul className="space-y-1.5">
            {jogos.map((j) => {
              const a = timesPorId.get(j.timeAId);
              const b = timesPorId.get(j.timeBId);
              const fim = j.status === 'finalizado';
              return (
                <li key={j.id} className="flex items-center gap-2 text-sm">
                  <TimeChip time={a} size="sm" />
                  <span className="tabular-nums text-slate-400 mx-1">
                    {fim ? `${j.pontosTimeA} × ${j.pontosTimeB}` : 'vs'}
                  </span>
                  <TimeChip time={b} size="sm" />
                  {fim && j.vencedor && (
                    <span className="text-emerald-400 text-xs ml-auto">✓</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
