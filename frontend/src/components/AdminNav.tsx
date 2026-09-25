import { Link, NavLink } from 'react-router-dom';
import { LogOut, Home, Shield, ClipboardList, Clock, BookOpen, Users, FileText } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { logout } from '../api';
import { toast } from 'react-hot-toast';

const LINKS = [
  { to: '/admin/journal', label: 'Журнал', icon: ClipboardList },
  { to: '/admin/schedule', label: 'Расписание', icon: Clock },
  { to: '/admin/subjects', label: 'Предметы', icon: BookOpen },
  { to: '/admin/users', label: 'Пользователи', icon: Users },
  { to: '/admin/audit', label: 'Аудит', icon: FileText },
];

export default function AdminNav() {
  const handleLogout = async () => {
    await logout();
    toast.success('Вы вышли');
    window.location.href = '/login';
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 min-h-16 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/admin" className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <Shield className="w-6 h-6 text-primary-600" />
              <span className="text-lg font-bold text-gray-900 dark:text-white hidden md:inline">Админ-панель</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `btn btn-ghost text-sm flex items-center gap-1 whitespace-nowrap ${
                      isActive ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20' : ''
                    }`
                  }
                >
                  <l.icon className="w-4 h-4" />
                  <span>{l.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <ThemeToggle />
            <Link to="/" className="btn btn-ghost text-sm flex items-center gap-1">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Сайт</span>
            </Link>
            <button onClick={handleLogout} className="btn btn-ghost text-sm flex items-center gap-1 text-red-600">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </div>
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto pb-2 -mx-4 px-4">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `btn btn-ghost text-sm flex items-center gap-1 whitespace-nowrap ${
                  isActive ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20' : ''
                }`
              }
            >
              <l.icon className="w-4 h-4" />
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}