import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Repeat,
  HandCoins,
  CheckSquare,
  Bot,
  Sparkles,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export type ActiveTab =
  | 'dashboard'
  | 'expenses'
  | 'analytics'
  | 'subscriptions'
  | 'lendings'
  | 'goals'
  | 'ai';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenAuthModal }) => {
  const { user, isAuthenticated, logout } = useAuth();

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'expenses' as ActiveTab, label: 'Expenses', icon: Receipt },
    { id: 'analytics' as ActiveTab, label: 'Analytics', icon: BarChart3 },
    { id: 'subscriptions' as ActiveTab, label: 'Subscriptions', icon: Repeat },
    { id: 'lendings' as ActiveTab, label: 'Lendings & EMI', icon: HandCoins },
    { id: 'goals' as ActiveTab, label: 'Goals & Tasks', icon: CheckSquare },
    { id: 'ai' as ActiveTab, label: 'AI Assistant', icon: Bot },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#121212]">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="p-2 rounded-xl bg-white text-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white">
                Expense<span className="text-gray-300">AI</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/15 text-[10px] font-semibold">
                Smart Financials
              </span>
            </div>
          </div>

          {/* Auth Button on Mobile */}
          <div className="md:hidden">
            {isAuthenticated ? (
              <button
                onClick={logout}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-gray-200"
              >
                Login
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Horizontal Navigation Bar */}
        <nav className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                  isActive
                    ? 'bg-white text-black font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-gray-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User / Auth Controls on Desktop */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-semibold text-white">{user?.name || 'User'}</span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-gray-200 transition-colors"
            >
              Login / Sign Up
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
