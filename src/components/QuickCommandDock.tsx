import React, { useState, useEffect } from 'react';
import {
  Plus,
  Bot,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';
import { ActiveTab } from './Navbar.js';

interface QuickCommandDockProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
  onOpenSubcategoriesModal: () => void;
  onOpenBudgetModal: () => void;
  onOpenExportModal: () => void;
}

export const QuickCommandDock: React.FC<QuickCommandDockProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onOpenExportModal,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let timeoutId: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Always show when near top of page
      if (currentScrollY < 40) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY + 5) {
        // Scrolling DOWN -> Hide dock smoothly
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY - 5) {
        // Scrolling UP -> Show dock
        setIsVisible(true);
      }

      lastScrollY = currentScrollY;

      // Reset timer to re-show dock when scrolling stops for a moment
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsVisible(true);
      }, 1800);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <aside
      aria-label="Quick Action Dock"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] sm:w-auto transition-all duration-300 ease-in-out ${
        isVisible
          ? 'translate-y-0 opacity-100 pointer-events-auto scale-100'
          : 'translate-y-24 opacity-0 pointer-events-none scale-95'
      }`}
    >
      <div className="bg-[#121212] border border-white/10 px-3 py-2 rounded-2xl flex items-center justify-between sm:justify-center gap-1.5 sm:gap-2 shadow-2xl">
        <button
          onClick={onOpenAddModal}
          className="px-3 py-2 rounded-xl bg-white text-black font-bold text-xs flex items-center gap-1.5 hover:bg-gray-200 transition-colors active:scale-95"
          title="Add New Expense"
        >
          <Plus className="w-4 h-4 text-black" />
          <span className="hidden sm:inline">Add Expense</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
            activeTab === 'ai'
              ? 'bg-white/10 text-white border border-white/20 font-bold'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          title="Ask AI Assistant"
        >
          <Bot className="w-4 h-4 text-gray-300" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
            activeTab === 'analytics'
              ? 'bg-white/10 text-white border border-white/20 font-bold'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          title="View Analytics"
        >
          <BarChart3 className="w-4 h-4 text-gray-300" />
          <span className="hidden sm:inline">Analytics</span>
        </button>

        <button
          onClick={onOpenExportModal}
          className="px-2.5 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1"
          title="Export Excel"
        >
          <FileSpreadsheet className="w-4 h-4 text-gray-400" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </aside>
  );
};
