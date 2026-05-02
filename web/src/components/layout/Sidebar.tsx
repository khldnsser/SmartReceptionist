'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/lib/auth-actions';

const navItems = [
  { href: '/calendar', label: 'Calendar', emoji: '📅' },
  { href: '/patients', label: 'Patients', emoji: '👥' },
  { href: '/settings', label: 'Settings', emoji: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-sm">🏥</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-none">Clinic PMS</p>
            <p className="text-xs text-gray-400 mt-0.5">Practice Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, emoji }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="text-base leading-none">{emoji}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-gray-200">
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                       text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <span className="text-base leading-none">🚪</span>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
