import { NavLink } from 'react-router-dom';
import type { UserOut } from '../types';

interface Props {
  user: UserOut;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: Props) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link ${isActive ? 'active' : ''}`;

  return (
    <header className="bg-dota-surface/95 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between">
          {/* Logo and navigation */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-dota-gold to-dota-gold-dark flex items-center justify-center shadow-inner-glow">
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 text-dota-bg-dark"
                  fill="currentColor"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="font-display text-lg font-semibold text-dota-gold group-hover:text-dota-gold-light transition-colors hidden sm:block">
                D2 Analyzer
              </span>
            </NavLink>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              <NavLink to="/" className={linkClass} end>
                <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Matches
              </NavLink>
              <NavLink to="/insights" className={linkClass}>
                <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Insights
              </NavLink>
            </nav>
          </div>

          {/* User profile */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user.avatar_url && (
                <div className="relative">
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="w-9 h-9 rounded-lg border-2 border-gray-700/50 shadow-md"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-dota-radiant rounded-full border-2 border-dota-surface" />
                </div>
              )}
              <span className="text-sm font-medium text-dota-text-primary hidden sm:block">
                {user.persona_name}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="text-sm text-dota-text-muted hover:text-dota-text-primary px-3 py-1.5 rounded-md hover:bg-dota-surface-light transition-all duration-200 border border-transparent hover:border-gray-700/50"
            >
              <svg className="w-4 h-4 sm:mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
