import { NavLink } from 'react-router-dom';
import type { UserOut } from '../types';

interface Props {
  user: UserOut;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: Props) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded text-sm font-medium transition-colors ${
      isActive
        ? 'bg-dota-accent text-white'
        : 'text-gray-300 hover:text-white hover:bg-dota-surface'
    }`;

  return (
    <header className="bg-dota-surface border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-dota-gold font-bold text-lg">D2 Analyzer</span>
          <nav className="flex gap-1">
            <NavLink to="/" className={linkClass} end>
              Matches
            </NavLink>
            <NavLink to="/insights" className={linkClass}>
              Insights
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user.avatar_url && (
            <img
              src={user.avatar_url}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-sm text-gray-300">{user.persona_name}</span>
          <button
            onClick={onLogout}
            className="text-sm text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-dota-accent transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
