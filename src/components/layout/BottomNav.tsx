import { NavLink } from 'react-router-dom';
import { Calendar, ClipboardCheck, AlertTriangle, Settings } from 'lucide-react';

const navItems = [
  { path: '/', icon: Calendar, label: '排期' },
  { path: '/approval', icon: ClipboardCheck, label: '审批' },
  { path: '/timeout', icon: AlertTriangle, label: '超时' },
  { path: '/management', icon: Settings, label: '管理' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={22}
                  className={`mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}
                />
                <span className="text-xs">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
