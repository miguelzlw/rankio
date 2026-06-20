// Auth do operador. Leitura do app eh livre; o login serve pra liberar as
// acoes de escrita (criar/pontuar/finalizar/sortear). A seguranca de verdade
// esta nas regras do Firestore (escrita exige request.auth != null).
//
// Nao ha cadastro no app: a conta do operador eh criada no console do Firebase
// (Authentication > Users), provedor Email/Senha.
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { auth } from '../services/firebase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Mantem a sessao no dispositivo (operador loga uma vez).
    setPersistence(auth, browserLocalPersistence).catch(() => {});
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCarregando(false);
    });
    return unsub;
  }, []);

  const login = useCallback(async (email, senha) => {
    await signInWithEmailAndPassword(auth, email, senha);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa de um <AuthProvider> em volta');
  return ctx;
}
