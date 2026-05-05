const PALETA = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#64748b', '#1e293b', '#000000',
];

export default function ColorPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-10 gap-2">
      {PALETA.map((cor) => (
        <button
          key={cor}
          type="button"
          onClick={() => onChange(cor)}
          aria-label={`Cor ${cor}`}
          className={`w-8 h-8 rounded-full border-2 transition ${
            value === cor ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-110'
          }`}
          style={{ backgroundColor: cor }}
        />
      ))}
    </div>
  );
}
