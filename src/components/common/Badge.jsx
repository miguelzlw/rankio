// Badge de status do jogo, adaptado ao tema dark bordo.
const colors = {
  agendado: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  ao_vivo: 'bg-red-500/15 text-red-300 border-red-500/40',
  finalizado: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

const labels = {
  agendado: 'Agendado',
  ao_vivo: 'Ao vivo',
  finalizado: 'Finalizado',
};

export default function Badge({ status }) {
  const cor = colors[status] || 'bg-white/5 text-slate-300 border-white/10';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cor}`}
    >
      {status === 'ao_vivo' && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
      )}
      {labels[status] || status}
    </span>
  );
}
