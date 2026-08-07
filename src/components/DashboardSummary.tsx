import React, { useState, useRef } from 'react';
import { useFinanceStore } from '../store/useFinanceStore.js';
import {
  Plus,
  TrendingUp,
  Sparkles,
  FileSpreadsheet,
  Tag,
  ArrowDownRight,
  ChevronRight,
  Calendar,
  Bot,
  Sliders,
  Infinity as InfinityIcon,
  ShieldCheck,
} from 'lucide-react';
import { ViewAllTransactionsModal } from './ViewAllTransactionsModal.js';
import { CustomSubcategoryModal } from './CustomSubcategoryModal.js';
import { GeminiExpenseChatbot } from './GeminiExpenseChatbot.js';
import { BudgetSettingsModal } from './BudgetSettingsModal.js';

interface DashboardSummaryProps {
  onOpenAddModal: () => void;
  onOpenExportModal: () => void;
  onOpenImportModal: () => void;
  onNavigateToAi?: () => void;
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({
  onOpenAddModal,
  onOpenExportModal,
  onOpenImportModal,
  onNavigateToAi,
}) => {
  const { transactions, user, categories } = useFinanceStore();
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const chatbotSectionRef = useRef<HTMLDivElement>(null);

  const scrollToChatbot = () => {
    if (chatbotSectionRef.current) {
      chatbotSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (onNavigateToAi) {
      onNavigateToAi();
    }
  };

  // Current month spend calculation
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthTxs = transactions.filter((t) => t.date.startsWith(currentMonthPrefix));
  const currentMonthSpend = currentMonthTxs.reduce((sum, t) => sum + t.amount, 0);

  const budget = user?.monthlyBudget;
  const isNoLimitMode = budget === null || budget === undefined;
  const percentSpent = !isNoLimitMode && budget > 0 ? Math.min(100, Math.round((currentMonthSpend / budget) * 100)) : 0;

  // Most used subcategories
  const subCountMap: Record<string, { count: number; name: string; categoryName: string }> = {};
  transactions.forEach((t) => {
    if (t.subcategoryName && t.subcategoryName !== 'No specific subcategory') {
      const key = `${t.categoryName} > ${t.subcategoryName}`;
      if (!subCountMap[key]) {
        subCountMap[key] = { count: 0, name: t.subcategoryName, categoryName: t.categoryName || 'General' };
      }
      subCountMap[key].count += 1;
    }
  });

  const mostUsedSubcategories = Object.values(subCountMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recent3To5 = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Modals */}
      <ViewAllTransactionsModal isOpen={isViewAllOpen} onClose={() => setIsViewAllOpen(false)} />
      <CustomSubcategoryModal isOpen={isSubcategoryModalOpen} onClose={() => setIsSubcategoryModalOpen(false)} />
      <BudgetSettingsModal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} />

      {/* Hero Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Monthly Overview / Spend Ring */}
        <div className="glass-card glass-card-hover p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-white" /> Monthly Financial Pulse
            </span>

            <button
              onClick={() => setIsBudgetModalOpen(true)}
              className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                isNoLimitMode
                  ? 'border-white/20 bg-white/10 text-white'
                  : 'border-white/20 bg-white/10 text-white'
              }`}
            >
              {isNoLimitMode ? (
                <>
                  <InfinityIcon className="w-3.5 h-3.5 text-white" /> No Limit Mode
                </>
              ) : (
                <>
                  <Sliders className="w-3 h-3 text-white" /> {percentSpent}% Budget Used
                </>
              )}
            </button>
          </div>

          <div className="my-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Total Spend This Month</p>
              <h2 className="text-3xl font-extrabold text-white mt-1">
                ₹{currentMonthSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                <span>{currentMonthTxs.length} transactions recorded</span>
                {isNoLimitMode && <span className="text-gray-300 font-semibold">• Unlimited Mode</span>}
              </p>
            </div>

            {!isNoLimitMode && budget > 0 ? (
              <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="38" stroke="rgba(255,255,255,0.08)" strokeWidth="7" fill="transparent" />
                  <circle
                    cx="48"
                    cy="48"
                    r="38"
                    stroke="#FFFFFF"
                    strokeWidth="7"
                    strokeDasharray={238}
                    strokeDashoffset={238 - (238 * Math.min(100, percentSpent)) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-gray-400">Rem.</span>
                  <span className="text-xs font-bold text-white">
                    ₹{Math.max(0, budget - currentMonthSpend).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center flex flex-col items-center justify-center shrink-0">
                <InfinityIcon className="w-7 h-7 text-white mb-0.5" />
                <span className="text-[10px] text-gray-300 font-semibold">No Cap Active</span>
              </div>
            )}
          </div>

          {/* Most Used Subcategories Chips */}
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2 font-medium">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gray-300" /> Frequent Subcategory Tags:
              </span>
              <button
                onClick={() => setIsBudgetModalOpen(true)}
                className="text-white hover:underline font-semibold text-[10px]"
              >
                Change Budget
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {mostUsedSubcategories.length > 0 ? (
                mostUsedSubcategories.map((sub, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-semibold text-white flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3 text-gray-400" /> {sub.name}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-gray-400">No subcategories logged yet</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Quick Action Dock */}
        <div className="glass-card glass-card-hover p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-white" /> Quick Command Dock
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={onOpenAddModal}
                className="py-3 px-4 rounded-xl bg-white text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
              >
                <Plus className="w-4 h-4 text-black" /> Add Expense
              </button>

              <button
                onClick={scrollToChatbot}
                className="py-3 px-4 rounded-xl bg-white/10 border border-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
              >
                <Bot className="w-4 h-4 text-white" /> Ask AI Chatbot
              </button>

              <button
                onClick={() => setIsSubcategoryModalOpen(true)}
                className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
              >
                <Tag className="w-3.5 h-3.5 text-gray-400" /> Subcategories
              </button>

              <button
                onClick={() => setIsBudgetModalOpen(true)}
                className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5 text-gray-400" /> Budget Settings
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
            <button
              onClick={onOpenExportModal}
              className="text-xs text-white hover:underline flex items-center gap-1 font-semibold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel Statement
            </button>
            <span className="text-[11px] font-semibold text-gray-400">
              {isNoLimitMode ? 'Mode: No Limit' : `Cap: ₹${(budget || 0).toLocaleString('en-IN')}`}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-300" /> Recent Transactions
            </h3>
            <p className="text-xs text-gray-400">Latest 3–5 records logged in your account</p>
          </div>

          <button
            onClick={() => setIsViewAllOpen(true)}
            className="px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-white hover:bg-white/10 transition-colors flex items-center gap-1"
          >
            View All Records <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {recent3To5.length > 0 ? (
            recent3To5.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/10 text-white border border-white/10">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white">
                        {t.description || t.categoryName}
                      </p>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-gray-300 font-semibold">
                        {t.subcategoryName || 'Subcategory'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                      <span>{t.categoryName}</span>
                      <span>•</span>
                      <span>{t.date}</span>
                      <span>•</span>
                      <span className="uppercase">{t.paymentMode}</span>
                    </p>
                  </div>
                </div>

                <span className="text-sm font-bold text-white">
                  -₹{t.amount.toFixed(2)}
                </span>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-gray-400 text-xs">
              No recent transactions logged. Click "Add Expense" to get started!
            </div>
          )}
        </div>
      </div>

      {/* Embedded Chatbot in the Last Section */}
      <div ref={chatbotSectionRef} className="pt-2">
        <div className="mb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-gray-300" /> AI Assistant & Financial Operations
          </h3>
          <p className="text-xs text-gray-400">
            Ask questions about your budget or tell Gemini to add/delete items directly
          </p>
        </div>
        <GeminiExpenseChatbot />
      </div>
    </div>
  );
};

