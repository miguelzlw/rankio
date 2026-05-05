import TimeChip from '../common/TimeChip.jsx';
import { classificarGrupo } from '../../services/scoring.js';

export default function GrupoTable({ grupoId, timeIds, esporteId, jogos, times }) {
  const timesPorId = new Map(times.map((t) => [t.id, t]));
  const timesDoGrupo = timeIds.map((id) => timesPorId.get(id)).filter(Boolean);
  const jogosDoGrupo = jogos.filter(
    (j) => j.esporteId === esporteId && j.fase === 'grupos' && j.grupoId === grupoId
  );
  const ranking = classificarGrupo(timesDoGrupo, jogosDoGrupo, esporteId);

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <h3 className="font-semibold text-sm mb-2">Grupo {grupoId.replace('G', '')}</h3>
      <table className="w-full text-sm">
        <thead className="text-xs text-slate-500">
          <tr>
            <th className="text-left font-normal w-6">#</th>
            <th className="text-left font-normal">Time</th>
            <th className="text-right font-normal w-12">Pts</th>
            <th className="text-right font-normal w-12">Sd</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((r, i) => (
            <tr key={r.time.id} className="border-t border-slate-100">
              <td className="py-1 text-slate-400">{i + 1}º</td>
              <td className="py-1">
                <TimeChip time={r.time} size="sm" />
              </td>
              <td className="py-1 text-right tabular-nums font-semibold">{r.pontos}</td>
              <td className="py-1 text-right tabular-nums text-slate-500">
                {r.saldo > 0 ? '+' : ''}
                {r.saldo}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {jogosDoGrupo.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-1">Jogos do grupo</p>
          <ul className="space-y-1">
            {jogosDoGrupo.map((j) => {
              const a = timesPorId.get(j.timeAId);
              const b = timesPorId.get(j.timeBId);
              return (
                <li key={j.id} className="flex items-center gap-2 text-xs">
                  <TimeChip time={a} size="sm" />
                  <span className="tabular-nums text-slate-600 mx-1">
                    {j.status === 'finalizado'
                      ? `${j.pontosTimeA} × ${j.pontosTimeB}`
                      : '—'}
                  </span>
                  <TimeChip time={b} size="sm" />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
