import { useTimes, useEsportes } from '../hooks/useDados.js';
import TimesManager from '../components/configuracao/TimesManager.jsx';
import EsportesManager from '../components/configuracao/EsportesManager.jsx';
import JogosManager from '../components/configuracao/JogosManager.jsx';
import { CheckCircle2, Settings } from 'lucide-react';

export default function Configuracao() {
  const { data: times } = useTimes();
  const { data: esportes } = useEsportes();

  const temTimes = times && times.length > 0;
  const temEsportes = esportes && esportes.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 via-surface to-surface border border-white/10 p-5">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
            <Settings size={24} className="text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Configuração</h1>
            <p className="text-sm text-slate-400">Times, esportes e jogos do torneio.</p>
          </div>
        </div>
      </header>

      {(!temTimes || !temEsportes) && (
        <div className="bg-surface/50 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
          <p className="text-sm font-semibold mb-3 text-accent">Como montar seu torneio</p>
          <ol className="space-y-2.5 text-sm">
            <li className="flex items-start gap-2.5">
              {temTimes ? (
                <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
              )}
              <span className={temTimes ? 'text-slate-500 line-through' : 'text-slate-200'}>
                Crie os <strong>times</strong> que vão participar
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              {temEsportes ? (
                <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
              )}
              <span className={temEsportes ? 'text-slate-500 line-through' : temTimes ? 'text-slate-200' : 'text-slate-500'}>
                Crie os <strong>esportes</strong> e suas regras
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-white/10 text-slate-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
              <span className={temEsportes ? 'text-slate-200' : 'text-slate-500'}>
                Gere o <strong>chaveamento</strong> dos jogos
              </span>
            </li>
          </ol>
        </div>
      )}

      <TimesManager />
      {temTimes && <EsportesManager />}
      {temTimes && temEsportes && <JogosManager />}
    </div>
  );
}
