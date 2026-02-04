import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import type { UserOut } from '../../types';

interface Props {
  user: UserOut;
  onLogout: () => void;
}

export default function SidebarLayout({ user, onLogout }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-dota-bg">
      <Sidebar
        user={user}
        onLogout={onLogout}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />
      <main
        className={`min-h-screen ${collapsed ? 'ml-16' : 'ml-60'}`}
      >
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
