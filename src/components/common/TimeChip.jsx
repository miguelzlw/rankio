// Chip pequeno mostrando nome + cor do time. Reusado em varios lugares.
// Usa a cor do time como fundo translucido + texto claro pra contrastar bem
// no tema dark bordo.
export default function TimeChip({ time, size = 'md', placeholder = '—' }) {
  if (!time) {
    return <span className="text-slate-500 italic text-xs">{placeholder}</span>;
  }
  const tamanhos = {
    sm: 'h-6 px-2 text-xs',
    md: 'h-8 px-3 text-sm',
    lg: 'h-10 px-4 text-base',
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-medium text-text whitespace-nowrap ${tamanhos[size]}`}
      style={{ backgroundColor: time.cor + '40', border: `1px solid ${time.cor}80` }}
    >
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: time.cor }}
      />
      <span className="truncate">{time.nome}</span>
    </span>
  );
}
