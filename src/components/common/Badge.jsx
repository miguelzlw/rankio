const colors = {
  agendado: 'bg-amber-100 text-amber-800',
  ao_vivo: 'bg-red-100 text-red-700 animate-pulse',
  finalizado: 'bg-emerald-100 text-emerald-800',
};

const labels = {
  agendado: 'Agendado',
  ao_vivo: 'Ao vivo',
  finalizado: 'Finalizado',
};

export default function Badge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-slate-100 text-slate-700'}`}>
      {labels[status] || status}
    </span>
  );
}
