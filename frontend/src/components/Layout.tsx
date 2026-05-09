import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { BookOpen, Mic, PenTool, MessageSquare, Trophy, LogOut, Settings } from 'lucide-react';
import clsx from 'clsx';
import LevelBadge from './LevelBadge';

const navItems = [
  { path: '/', label: 'Dashboard', icon: BookOpen },
  { path: '/vocabulary', label: 'Vocabulary', icon: BookOpen },
  { path: '/speaking', label: 'Speaking', icon: Mic },
  { path: '/writing', label: 'Writing', icon: PenTool },
  { path: '/tutor', label: 'Tutor', icon: MessageSquare },
  { path: '/achievements', label: 'Achievements', icon: Trophy },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const allNavItems = [
    ...navItems,
    ...(user?.is_admin ? [{ path: '/admin/logs', label: 'Admin', icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              {allNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    location.pathname === item.path
                      ? 'text-indigo-600 bg-indigo-50'
                      : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                  )}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </NavLink>
              ))}
            </div>
            <div className="flex items-center space-x-4">
              <LevelBadge />
              <span className="text-sm text-gray-700">{user?.name}</span>
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}