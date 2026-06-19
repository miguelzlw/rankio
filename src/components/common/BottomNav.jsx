import { NavLink } from 'react-router-dom';
import { Trophy, Gamepad2, Settings, GitBranch, Shuffle } from 'lucide-react';

const itens = [
  { to: '/ranking', label: 'Ranking', Icon: Trophy },
  { to: '/esportes', label: 'Esportes', Icon: Gamepad2 },
  { to: '/chaveamento', label: 'Chaves', Icon: GitBranch },
  { to: '/sorteio', label: 'Sorteio', Icon: Shuffle },
  { to: '/configuracao', label: 'Config', Icon: Settings },
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 pointer-events-none px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
      {/* Pilula flutuante de vidro fosco (liquid glass): fundo translucido +
          blur forte + borda clara e brilho interno pra dar a impressao de vidro. */}
      <div className="pointer-events-auto mx-auto max-w-md rounded-[1.75rem] border border-white/15 bg-surface/40 backdrop-blur-2xl shadow-[0_8px_30px_-6px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/10">
        <ul className="flex justify-around px-1">
          {itens.map(({ to, label, Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/chaveamento'}
                className={({ isActive }) =>
                  `relative flex flex-col items-center justify-center py-2.5 gap-1 text-[11px] font-medium transition ${
                    isActive ? 'text-accent' : 'text-slate-300 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute inset-x-1.5 inset-y-1 rounded-2xl bg-white/10 ring-1 ring-inset ring-white/10" />
                    )}
                    <span
                      className={`relative z-10 transition-transform ${isActive ? 'scale-110' : ''}`}
                    >
                      <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                    </span>
                    <span className="relative z-10">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
