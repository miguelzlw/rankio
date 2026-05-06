import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Botao de voltar destacado, com fundo proprio em "janelinha"
// pra nao ficar perdido no canto da pagina.
export default function BackButton({ to, label = 'Voltar', className = '' }) {
  const navigate = useNavigate();

  function handleClick() {
    if (to) navigate(to);
    else navigate(-1);
  }

  return (
    <button
      onClick={handleClick}
      className={`group inline-flex items-center gap-2 bg-surface/80 hover:bg-surface border border-white/15 hover:border-accent/40 text-text rounded-xl px-3 py-2 text-sm font-medium shadow-md shadow-black/20 transition active:scale-95 backdrop-blur-sm ${className}`}
    >
      <span className="w-7 h-7 rounded-lg bg-primary/30 group-hover:bg-primary/50 flex items-center justify-center transition">
        <ArrowLeft size={16} className="text-text" />
      </span>
      <span>{label}</span>
    </button>
  );
}
