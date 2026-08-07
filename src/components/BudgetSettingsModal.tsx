import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore.js';
import { X, Infinity as InfinityIcon, DollarSign, Check, Sliders, ShieldCheck } from 'lucide-react';

interface BudgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BudgetSettingsModal: React.FC<BudgetSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUserBudget } = useFinanceStore();
  const [isNoLimit, setIsNoLimit] = useState<boolean>(user?.monthlyBudget === null || user?.monthlyBudget === undefined);
  const [budgetValue, setBudgetValue] = useState<string>(
    user?.monthlyBudget ? user.monthlyBudget.toString() : '25000'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsNoLimit(user?.monthlyBudget === null || user?.monthlyBudget === undefined);
    if (user?.monthlyBudget) {
      setBudgetValue(user.monthlyBudget.toString());
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);

    const newBudget = isNoLimit ? null : Math.max(0, parseFloat(budgetValue) || 0);
    await updateUserBudget(newBudget);

    setIsSaving(false);
    setSuccessMsg(isNoLimit ? 'Switched to No Limit Mode!' : `Monthly budget set to ₹${newBudget?.toLocaleString('en-IN')}`);
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-card border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F5F7]">Budget Settings</h3>
              <p className="text-xs text-[#8B8B94]">Set a monthly cap or enable No-Limit Mode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8B8B94] hover:text-[#F5F5F7] hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" /> {successMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-5">
          {/* Mode Selector Cards */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsNoLimit(false)}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                !isNoLimit
                  ? 'bg-violet-500/15 border-violet-500/50 text-[#F5F5F7] shadow-lg glow-violet'
                  : 'bg-white/[0.02] border-white/10 text-[#8B8B94] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Custom Cap</span>
                <DollarSign className={`w-4 h-4 ${!isNoLimit ? 'text-violet-400' : 'text-[#8B8B94]'}`} />
              </div>
              <p className="text-[10px] mt-2 leading-tight">Enforce strict monthly limit & overspend alerts</p>
            </button>

            <button
              type="button"
              onClick={() => setIsNoLimit(true)}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isNoLimit
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-[#F5F5F7] shadow-lg glow-cyan'
                  : 'bg-white/[0.02] border-white/10 text-[#8B8B94] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">No Limit Mode</span>
                <InfinityIcon className={`w-4 h-4 ${isNoLimit ? 'text-cyan-400' : 'text-[#8B8B94]'}`} />
              </div>
              <p className="text-[10px] mt-2 leading-tight">Track net spend with zero cap warnings</p>
            </button>
          </div>

          {/* Amount input if Custom Budget */}
          {!isNoLimit && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="block text-xs font-semibold text-[#8B8B94] uppercase tracking-wider">
                Monthly Budget (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-extrabold text-violet-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value)}
                  placeholder="e.g. 25000"
                  required
                  className="w-full pl-8 pr-4 py-2.5 glass-input text-sm font-extrabold text-[#F5F5F7]"
                />
              </div>
              <p className="text-[11px] text-[#8B8B94] pt-0.5">
                ExpenseAI will track your progress against this limit each month.
              </p>
            </div>
          )}

          {isNoLimit && (
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-start gap-2 animate-fade-in">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">No Limit Mode Active</p>
                <p className="text-[11px] text-cyan-200/80 mt-0.5">
                  Your expenses will be logged and analyzed freely without triggering budget cap alarms.
                </p>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-[#8B8B94] hover:text-[#F5F5F7] hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl gradient-positive text-white text-xs font-bold shadow-lg glow-violet hover:opacity-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
