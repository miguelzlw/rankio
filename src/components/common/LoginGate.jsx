import { useState } from 'react';
import { Lock, LogIn } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';
import Button from './Button.jsx';
import { useToast } from './ToastProvider.jsx';

// Envolve uma area de edicao: mostra o formulario de login pra quem nao esta
// logado e libera o conteudo pra quem esta. Use em telas/areas de operador.
export default function LoginGate({ children, titulo = 'Área restrita' }) {
  const { user, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginForm titulo={titulo} />;
  return children;
}

export function LoginForm({ titulo = 'Entrar' }) {
  const { login } = useAuth();
  const toast = useToast();
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    if (!senha) return;
    setEnviando(true);
    try {
      await login(senha);
      toast.success('Liberado. Você pode editar agora.');
    } catch (err) {
      toast.error('Senha inválida.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={entrar}
      className="max-w-sm mx-auto bg-surface/50 border border-white/10 rounded-2xl p-5 space-y-3"
    >
      <div className="flex items-center gap-2 text-text">
        <Lock size={18} className="text-accent" />
        <h2 className="font-semibold">{titulo}</h2>
      </div>
      <p className="text-xs text-slate-400">
        Apenas o operador edita. Visitantes continuam vendo o ranking e as chaves normalmente.
      </p>
      <input
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        placeholder="Senha do operador"
        autoComplete="current-password"
        autoFocus
        className="w-full border border-white/20 bg-black/20 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder-white/30"
      />
      <Button type="submit" className="w-full" disabled={enviando || !senha}>
        <LogIn size={16} /> {enviando ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
