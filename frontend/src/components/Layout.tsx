import { Outlet } from 'react-router-dom';
import Header from './Header';
import type { UserOut } from '../types';

interface Props {
  user: UserOut;
  onLogout: () => void;
}

export default function Layout({ user, onLogout }: Props) {
  return (
    <div className="min-h-screen">
      <Header user={user} onLogout={onLogout} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
