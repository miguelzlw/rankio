// "Login" do operador via SENHA simples (sem Firebase Auth, sem console).
//
// Por que assim: ativar o Firebase Authentication exige configurar o console do
// projeto. Pra destravar o uso sem depender disso, usamos uma senha de operador
// guardada no app. Quem souber a senha edita; visitantes so veem.
//
// LIMITE DE SEGURANCA: isso eh um "cadeado" no app (client-side) — impede
// edicao casual por visitantes, mas NAO tranca o banco em si. Pra protecao real
// no banco (regras do Firestore), seria preciso ativar o Firebase Auth.
//
// A senha vem de VITE_OPERATOR_SENHA (defina no .env.local e na Vercel). Se nao
// definida, cai num padrao pra funcionar de imediato.
import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);
const CHAVE_LS = 'rankio_operador';
const SENHA = import.meta.env.VITE_OPERATOR_SENHA || '645678';

export function AuthProvider({ children }) {
  const [desbloqueado, setDesbloqueado] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_LS) === '1';
    } catch {
      return false;
    }
  });

  const login = useCallback(async (senha) => {
    if (String(senha) !== String(SENHA)) {
      const err = new Error('senha-invalida');
      err.code = 'senha-invalida';
      throw err;
    }
    try {
      localStorage.setItem(CHAVE_LS, '1');
    } catch {
      /* ignora se localStorage indisponivel */
    }
    setDesbloqueado(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem(CHAVE_LS);
    } catch {
      /* ignora */
    }
    setDesbloqueado(false);
  }, []);

  // Mantem a mesma interface de antes (user/carregando) pra nao mexer no resto.
  const user = desbloqueado ? { operador: true } : null;
  return (
    <AuthContext.Provider value={{ user, carregando: false, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa de um <AuthProvider> em volta');
  return ctx;
}
