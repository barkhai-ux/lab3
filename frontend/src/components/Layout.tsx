import { Outlet } from 'react-router-dom';
import Header from './Header';
import type { UserOut } from '../types';

interface Props {
  user: UserOut;
  onLogout: () => void;
}

export default function Layout({ user, onLogout }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} onLogout={onLogout} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>
      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-dota-text-muted">
          <span>Dota 2 Match Analyzer</span>
          <span>Data from OpenDota API</span>
        </div>
      </footer>
    </div>
  );
}
