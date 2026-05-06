import { NavLink } from 'react-router-dom';
import { Trophy, Gamepad2, Settings, GitBranch } from 'lucide-react';

const itens = [
  { to: '/ranking', label: 'Ranking', Icon: Trophy },
  { to: '/esportes', label: 'Esportes', Icon: Gamepad2 },
  { to: '/chaveamento', label: 'Chaves', Icon: GitBranch },
  { to: '/configuracao', label: 'Config', Icon: Settings },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 safe-bottom">
      <div className="bg-surface/90 backdrop-blur-md border-t border-white/10 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.5)]">
        <ul className="flex justify-around max-w-2xl mx-auto px-2">
          {itens.map(({ to, label, Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/chaveamento'}
                className={({ isActive }) =>
                  `relative flex flex-col items-center justify-center py-2.5 gap-1 text-[11px] font-medium transition ${
                    isActive ? 'text-accent' : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent rounded-b-full" />
                    )}
                    <span className={`transition-transform ${isActive ? 'scale-110' : ''}`}>
                      <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                    </span>
                    <span>{label}</span>
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
