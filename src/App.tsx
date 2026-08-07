import React, { useState, useEffect } from 'react';
import Lenis from 'lenis';
import { useAuth } from './context/AuthContext.js';
import { useFinanceStore } from './store/useFinanceStore.js';
import { Navbar, ActiveTab } from './components/Navbar.js';
import { DashboardSummary } from './components/DashboardSummary.js';
import { ExpenseTracker } from './components/ExpenseTracker.js';
import { SubscriptionsManager } from './components/SubscriptionsManager.js';
import { LendingManager } from './components/LendingManager.js';
import { AnalyticsView } from './components/AnalyticsView.js';
import { TodoAndGoals } from './components/TodoAndGoals.js';
import { GeminiExpenseChatbot } from './components/GeminiExpenseChatbot.js';
import { ExcelImportExportModals } from './components/ExcelImportExportModals.js';
import { DashboardSkeleton } from './components/Skeletons.js';
import { AuthModal } from './components/AuthModal.js';
import { QuickCommandDock } from './components/QuickCommandDock.js';
import { CustomSubcategoryModal } from './components/CustomSubcategoryModal.js';
import { BudgetSettingsModal } from './components/BudgetSettingsModal.js';
import { Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isSyncing, initialize, categories, transactions } = useFinanceStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Modals state
  const [isOpenAddExpenseModal, setIsOpenAddExpenseModal] = useState(false);
  const [isOpenExportModal, setIsOpenExportModal] = useState(false);
  const [isOpenImportModal, setIsOpenImportModal] = useState(false);
  const [isOpenAuthModal, setIsOpenAuthModal] = useState(false);
  const [isOpenSubcategoryModal, setIsOpenSubcategoryModal] = useState(false);
  const [isOpenBudgetModal, setIsOpenBudgetModal] = useState(false);

  // Smooth Scrolling with Lenis
  const lenisRef = React.useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Initialize store on mount or auth change
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Always scroll to top when switching tabs so user lands at the top of the section by default
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
  }, [activeTab]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center animate-pulse mb-3">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <p className="text-xs font-semibold text-gray-400">Loading ExpenseAI...</p>
      </div>
    );
  }

  // If not authenticated, require login/signup - no access without login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center p-4 relative">
        <div className="mb-6 flex items-center gap-2">
          <div className="p-2.5 rounded-2xl bg-white text-black font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-white">
            Expense<span className="text-gray-400">AI</span>
          </span>
        </div>
        <AuthModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-white selection:text-black pb-24 relative">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuthModal={() => setIsOpenAuthModal(true)}
      />

      {/* Auth Modal overlay if opened manually from navbar */}
      {isOpenAuthModal && <AuthModal onClose={() => setIsOpenAuthModal(false)} />}

      {/* Modals triggered from Quick Dock */}
      <CustomSubcategoryModal isOpen={isOpenSubcategoryModal} onClose={() => setIsOpenSubcategoryModal(false)} />
      <BudgetSettingsModal isOpen={isOpenBudgetModal} onClose={() => setIsOpenBudgetModal(false)} />

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {isSyncing && transactions.length === 0 ? (
          <DashboardSkeleton />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardSummary
                onOpenAddModal={() => {
                  setActiveTab('expenses');
                  setIsOpenAddExpenseModal(true);
                }}
                onOpenExportModal={() => setIsOpenExportModal(true)}
                onOpenImportModal={() => setIsOpenImportModal(true)}
                onNavigateToAi={() => setActiveTab('ai')}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpenseTracker
                isOpenAddModal={isOpenAddExpenseModal}
                setIsOpenAddModal={setIsOpenAddExpenseModal}
              />
            )}

            {activeTab === 'analytics' && <AnalyticsView token={localStorage.getItem('pfinance_token') || 'demo_guest_token'} />}

            {activeTab === 'subscriptions' && <SubscriptionsManager />}

            {activeTab === 'lendings' && <LendingManager />}

            {activeTab === 'goals' && <TodoAndGoals />}

            {activeTab === 'ai' && <GeminiExpenseChatbot />}
          </>
        )}
      </main>

      {/* Floating Bottom Quick Command Dock */}
      <QuickCommandDock
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => {
          setActiveTab('expenses');
          setIsOpenAddExpenseModal(true);
        }}
        onOpenSubcategoriesModal={() => setIsOpenSubcategoryModal(true)}
        onOpenBudgetModal={() => setIsOpenBudgetModal(true)}
        onOpenExportModal={() => setIsOpenExportModal(true)}
      />

      {/* Global Excel Import / Export Modals */}
      <ExcelImportExportModals
        token={localStorage.getItem('pfinance_token') || 'demo_guest_token'}
        transactions={transactions}
        categories={categories}
        isOpenExport={isOpenExportModal}
        setIsOpenExport={setIsOpenExportModal}
        isOpenImport={isOpenImportModal}
        setIsOpenImport={setIsOpenImportModal}
        onImportSuccess={() => initialize()}
      />
    </div>
  );
};

export default App;
