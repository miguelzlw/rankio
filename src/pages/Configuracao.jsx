import { useTimes, useEsportes } from '../hooks/useDados.js';
import TimesManager from '../components/configuracao/TimesManager.jsx';
import EsportesManager from '../components/configuracao/EsportesManager.jsx';
import JogosManager from '../components/configuracao/JogosManager.jsx';
import BackupSection from '../components/configuracao/BackupSection.jsx';
import { CheckCircle2 } from 'lucide-react';

export default function Configuracao() {
  const { data: times, loading: lt } = useTimes();
  const { data: esportes, loading: le } = useEsportes();

  const temTimes = times && times.length > 0;
  const temEsportes = esportes && esportes.length > 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Configuração</h1>

      {/* Guia de passos — mostra progresso do setup */}
      {(!temTimes || !temEsportes) && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <p className="text-sm font-semibold mb-3 text-blue-400">📋 Como montar seu torneio:</p>
          <ol className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              {temTimes ? (
                <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
              )}
              <span className={temTimes ? 'text-slate-500 line-through' : 'text-slate-300'}>
                Crie os <strong>times</strong> que vão participar
              </span>
            </li>
            <li className="flex items-start gap-2">
              {temEsportes ? (
                <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
              )}
              <span className={temEsportes ? 'text-slate-500 line-through' : temTimes ? 'text-slate-300' : 'text-slate-500'}>
                Crie os <strong>esportes/brincadeiras</strong> e suas regras
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
              <span className={temEsportes ? 'text-slate-300' : 'text-slate-500'}>
                Gere o <strong>chaveamento</strong> dos jogos
              </span>
            </li>
          </ol>
        </div>
      )}

      <TimesManager />

      {/* Mostra esportes só depois que tiver times */}
      {temTimes && <EsportesManager />}

      {/* Mostra jogos só depois que tiver esportes */}
      {temTimes && temEsportes && <JogosManager />}

      <BackupSection />
    </div>
  );
}
