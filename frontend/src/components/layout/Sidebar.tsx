import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import type { UserOut } from '../../types';

interface NavItem {
  path: string;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    shortcut: 'D',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
  {
    path: '/matches',
    label: 'Matches',
    shortcut: 'M',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    path: '/insights',
    label: 'Insights',
    shortcut: 'I',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

interface Props {
  user: UserOut;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ user, onLogout, collapsed, onToggleCollapse }: Props) {
  const navigate = useNavigate();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toUpperCase();
      const item = navItems.find((nav) => nav.shortcut === key);
      if (item) {
        e.preventDefault();
        navigate(item.path);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-dota-surface border-r border-dota-border flex flex-col z-50 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo / Brand */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-dota-border">
        {!collapsed && (
          <span className="text-dota-gold font-bold text-lg tracking-tight">D2 Analytics</span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded hover:bg-dota-accent text-dota-text-muted hover:text-dota-text-primary"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded text-sm ${
                isActive
                  ? 'bg-dota-accent text-dota-text-primary'
                  : 'text-dota-text-secondary hover:text-dota-text-primary hover:bg-dota-accent/50'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? `${item.label} (${item.shortcut})` : undefined}
          >
            {item.icon}
            {!collapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                <kbd className="text-label text-dota-text-muted bg-dota-bg px-1.5 py-0.5 rounded">
                  {item.shortcut}
                </kbd>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t border-dota-border p-4">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          {user.avatar_url && (
            <img
              src={user.avatar_url}
              alt=""
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm text-dota-text-primary truncate">
                {user.persona_name}
              </div>
              <button
                onClick={onLogout}
                className="text-label text-dota-text-muted hover:text-dota-text-secondary"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
