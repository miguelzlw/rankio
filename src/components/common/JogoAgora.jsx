import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Radio, Play } from 'lucide-react';
import { useJogos, useEsportes } from '../../hooks/useDados.js';

// FAB flutuante que aparece quando ha algum jogo ao vivo ou agendado
// (com ambos os times definidos). Atalho rapido durante o evento ao vivo —
// pula direto pra tela do jogo, sem ter que navegar Esporte → Jogo.
export default function JogoAgora() {
  const { data: jogos } = useJogos();
  const { data: esportes } = useEsportes();
  const navigate = useNavigate();
  const location = useLocation();

  const proximoJogo = useMemo(() => {
    if (!jogos || jogos.length === 0) return null;
    const aoVivo = jogos.find((j) => j.status === 'ao_vivo' && j.timeAId && j.timeBId);
    if (aoVivo) return { jogo: aoVivo, tipo: 'ao_vivo' };
    const agendados = jogos
      .filter((j) => j.status === 'agendado' && j.timeAId && j.timeBId)
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    if (agendados[0]) return { jogo: agendados[0], tipo: 'agendado' };
    return null;
  }, [jogos]);

  if (!proximoJogo) return null;

  // Nao mostra na propria tela do jogo
  const { jogo, tipo } = proximoJogo;
  const rota = `/esportes/${jogo.esporteId}/jogos/${jogo.id}`;
  if (location.pathname === rota) return null;

  const esporte = esportes.find((e) => e.id === jogo.esporteId);
  const corBotao =
    tipo === 'ao_vivo'
      ? 'bg-red-600 hover:bg-red-500 shadow-red-500/40'
      : 'bg-accent hover:bg-accent/90 text-background shadow-accent/40';
  const Icone = tipo === 'ao_vivo' ? Radio : Play;

  return (
    <button
      onClick={() => navigate(rota)}
      className={`fixed bottom-20 right-4 z-40 ${corBotao} text-white font-bold px-4 py-3 rounded-2xl shadow-2xl transition active:scale-95 flex items-center gap-2 max-w-[80vw] animate-fade-in`}
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
        tipo === 'ao_vivo' ? 'bg-white/20 animate-pulse' : 'bg-background/20'
      }`}>
        <Icone size={16} strokeWidth={2.5} />
      </span>
      <span className="text-left min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wider opacity-80">
          {tipo === 'ao_vivo' ? 'Ao vivo' : 'Próximo jogo'}
        </span>
        <span className="block text-sm font-semibold truncate">
          {esporte?.nome ?? 'Jogo'} · #{jogo.ordem}
        </span>
      </span>
    </button>
  );
}
