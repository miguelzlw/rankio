// Chip pequeno mostrando nome + cor do time. Reusado em varios lugares.
export default function TimeChip({ time, size = 'md', placeholder = '—' }) {
  if (!time) {
    return <span className="text-slate-400 italic">{placeholder}</span>;
  }
  const tamanhos = {
    sm: 'h-6 px-2 text-xs',
    md: 'h-8 px-3 text-sm',
    lg: 'h-10 px-4 text-base',
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-medium ${tamanhos[size]}`}
      style={{ backgroundColor: time.cor + '22', color: '#0f172a' }}
    >
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: time.cor }} />
      {time.nome}
    </span>
  );
}
