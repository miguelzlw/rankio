import { NavLink } from 'react-router-dom';
import { Trophy, Gamepad2, Settings, GitBranch } from 'lucide-react';

const itens = [
  { to: '/ranking', label: 'Ranking', Icon: Trophy },
  { to: '/esportes', label: 'Esportes', Icon: Gamepad2 },
  { to: '/configuracao', label: 'Config', Icon: Settings },
  { to: '/chaveamento', label: 'Chaves', Icon: GitBranch },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 safe-bottom z-30">
      <ul className="flex justify-around max-w-2xl mx-auto">
        {itens.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium transition ${
                  isActive ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
