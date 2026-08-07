import React, { useState, useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore.js';
import { Transaction, PaymentMode } from '../types.js';
import { renderCategoryIcon, renderPaymentModeBadge } from '../lib/categoryIcons.jsx';
import {
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  Calendar,
  Tag as TagIcon,
  AlertTriangle,
  Tag,
} from 'lucide-react';
import { CustomSubcategoryModal } from './CustomSubcategoryModal.js';

interface ExpenseTrackerProps {
  isOpenAddModal: boolean;
  setIsOpenAddModal: (open: boolean) => void;
}

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  isOpenAddModal,
  setIsOpenAddModal,
}) => {
  const { transactions, categories, addTransaction, updateTransaction, deleteTransaction } =
    useFinanceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedSubcategoryFilter, setSelectedSubcategoryFilter] = useState('');
  const [selectedPaymentModeFilter, setSelectedPaymentModeFilter] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isCustomSubModalOpen, setIsCustomSubModalOpen] = useState(false);

  // Form State
  const [formCategoryId, setFormCategoryId] = useState(categories[0]?.id || '');
  const [formSubcategoryId, setFormSubcategoryId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMode, setFormPaymentMode] = useState<PaymentMode>('UPI');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formTagInput, setFormTagInput] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentFormCategory = useMemo(() => {
    return categories.find((c) => c.id === formCategoryId) || categories[0];
  }, [categories, formCategoryId]);

  const availableSubcategories = currentFormCategory?.subcategories || [];

  const openModalForNew = () => {
    setEditingTransaction(null);
    const cat = categories[0];
    setFormCategoryId(cat?.id || '');
    setFormSubcategoryId(cat?.subcategories?.[0]?.id || '');
    setFormAmount('');
    setFormPaymentMode('UPI');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDescription('');
    setFormTags([]);
    setFormTagInput('');
    setIsOpenAddModal(true);
  };

  const openModalForEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setFormCategoryId(tx.categoryId);
    setFormSubcategoryId(tx.subcategoryId);
    setFormAmount(String(tx.amount));
    setFormPaymentMode(tx.paymentMode);
    setFormDate(tx.date);
    setFormDescription(tx.description || '');
    setFormTags(tx.tags || []);
    setFormTagInput('');
    setIsOpenAddModal(true);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && formTagInput.trim()) {
      e.preventDefault();
      const newTag = formTagInput.trim().toLowerCase().replace(/,/g, '');
      if (newTag && !formTags.includes(newTag)) {
        setFormTags([...formTags, newTag]);
      }
      setFormTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormTags(formTags.filter((t) => t !== tagToRemove));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || isNaN(parseFloat(formAmount))) return;

    setIsSubmitting(true);
    try {
      const payload = {
        categoryId: formCategoryId,
        subcategoryId: formSubcategoryId || availableSubcategories[0]?.id || '',
        amount: parseFloat(formAmount),
        paymentMode: formPaymentMode,
        date: formDate,
        description: formDescription.trim() || null,
        tags: formTags,
      };

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, payload);
      } else {
        await addTransaction(payload);
      }

      setIsOpenAddModal(false);
    } catch (err) {
      console.error('Error saving transaction', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesDesc = tx.description?.toLowerCase().includes(query);
        const matchesCat = tx.categoryName?.toLowerCase().includes(query);
        const matchesSub = tx.subcategoryName?.toLowerCase().includes(query);
        const matchesTag = tx.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchesDesc && !matchesCat && !matchesSub && !matchesTag) return false;
      }

      if (selectedCategoryFilter && tx.categoryId !== selectedCategoryFilter) return false;
      if (selectedSubcategoryFilter && tx.subcategoryId !== selectedSubcategoryFilter) return false;
      if (selectedPaymentModeFilter && tx.paymentMode !== selectedPaymentModeFilter) return false;
      if (selectedTagFilter && !tx.tags.includes(selectedTagFilter)) return false;
      if (startDateFilter && tx.date < startDateFilter) return false;
      if (endDateFilter && tx.date > endDateFilter) return false;

      return true;
    });
  }, [
    transactions,
    searchQuery,
    selectedCategoryFilter,
    selectedSubcategoryFilter,
    selectedPaymentModeFilter,
    selectedTagFilter,
    startDateFilter,
    endDateFilter,
  ]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach((tx) => {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    });
    return Object.entries(groups).sort(
      ([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime()
    );
  }, [filteredTransactions]);

  const currentFilterCategory = categories.find((c) => c.id === selectedCategoryFilter);

  return (
    <div className="space-y-6">
      <CustomSubcategoryModal
        isOpen={isCustomSubModalOpen}
        onClose={() => setIsCustomSubModalOpen(false)}
      />

      {/* Filter Header Bar */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#8B8B94]" />
            <input
              type="text"
              placeholder="Search description, subcategory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 glass-input text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-[#8B8B94] hover:text-[#F5F5F7]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsCustomSubModalOpen(true)}
              className="py-2.5 px-3.5 rounded-xl bg-white/5 border border-white/10 text-[#F5F5F7] text-xs font-semibold flex items-center gap-1.5 hover:bg-white/10 transition-all"
            >
              <Tag className="w-3.5 h-3.5 text-cyan-400" /> Custom Subcategory
            </button>
            <button
              onClick={openModalForNew}
              className="py-2.5 px-4 rounded-xl gradient-positive text-white font-bold text-xs glow-violet flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        </div>

        {/* Dropdowns for Categories & Subcategories */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => {
              setSelectedCategoryFilter(e.target.value);
              setSelectedSubcategoryFilter('');
            }}
            className="glass-input px-3 py-2 text-xs font-medium cursor-pointer"
          >
            <option value="" className="bg-[#0A0A0F] text-[#F5F5F7]">
              All Categories
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#0A0A0F] text-[#F5F5F7]">
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSubcategoryFilter}
            onChange={(e) => setSelectedSubcategoryFilter(e.target.value)}
            disabled={!selectedCategoryFilter}
            className="glass-input px-3 py-2 text-xs font-medium cursor-pointer disabled:opacity-40"
          >
            <option value="" className="bg-[#0A0A0F] text-[#F5F5F7]">
              All Subcategories
            </option>
            {currentFilterCategory?.subcategories.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#0A0A0F] text-[#F5F5F7]">
                {s.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            className="glass-input px-3 py-2 text-xs font-medium"
          />

          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            className="glass-input px-3 py-2 text-xs font-medium"
          />
        </div>
      </div>

      {/* Transaction List */}
      {groupedTransactions.length > 0 ? (
        <div className="space-y-4">
          {groupedTransactions.map(([date, items]) => {
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-US', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const dayTotal = items.reduce((sum, i) => sum + i.amount, 0);

            return (
              <div key={date} className="space-y-2">
                <div className="flex items-center justify-between px-2 text-xs font-semibold text-[#8B8B94]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-violet-400" /> {formattedDate}
                  </span>
                  <span className="text-[#F5F5F7]">Daily Total: ₹{dayTotal.toFixed(2)}</span>
                </div>

                <div className="glass-card divide-y divide-white/5 overflow-hidden">
                  {items.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                          {renderCategoryIcon(tx.categoryIcon || 'Grid')}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-[#F5F5F7]">
                              {tx.description || tx.subcategoryName || tx.categoryName}
                            </h4>
                            {renderPaymentModeBadge(tx.paymentMode)}
                          </div>
                          <p className="text-[11px] text-[#8B8B94] mt-0.5">
                            {tx.categoryName} • <span className="text-cyan-400 font-semibold">{tx.subcategoryName}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold text-[#FB7185]">
                          -₹{tx.amount.toFixed(2)}
                        </span>
                        <div className="opacity-80 group-hover:opacity-100 flex items-center gap-1 transition-all">
                          <button
                            onClick={() => openModalForEdit(tx)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-[#8B8B94] hover:text-cyan-400"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteTransaction(tx.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-[#8B8B94] hover:text-[#FB7185]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card p-12 text-center text-[#8B8B94]">
          <AlertTriangle className="w-8 h-8 text-[#8B8B94] mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#F5F5F7]">No transactions found</p>
          <p className="text-xs text-[#8B8B94] mt-1">
            Try adjusting your filters or click "+ Add Expense" to record a transaction.
          </p>
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      {isOpenAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            data-lenis-prevent
            className="w-full max-w-lg bg-[#121212] border border-white/10 rounded-2xl p-6 text-white relative shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            <button
              onClick={() => setIsOpenAddModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold mb-1 text-white">
              {editingTransaction ? 'Edit Expense' : 'Add New Expense'}
            </h3>
            <p className="text-xs text-gray-400 mb-5">
              Select category, subcategory, amount, payment mode, and date.
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Category
                </label>
                <div data-lenis-prevent className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 no-scrollbar">
                  {categories.map((c) => {
                    const isSelected = formCategoryId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setFormCategoryId(c.id);
                          setFormSubcategoryId(c.subcategories[0]?.id || '');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-white text-black font-bold shadow-md'
                            : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {renderCategoryIcon(c.icon, 'w-3.5 h-3.5')}
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {availableSubcategories.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Subcategory
                  </label>
                  <div data-lenis-prevent className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 no-scrollbar">
                    {availableSubcategories.map((sub) => {
                      const isSubSelected = formSubcategoryId === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setFormSubcategoryId(sub.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                            isSubSelected
                              ? 'bg-white text-black font-bold'
                              : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                          }`}
                        >
                          {sub.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#181818] border border-white/10 text-white rounded-xl text-sm font-semibold focus:outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#181818] border border-white/10 text-white rounded-xl text-sm focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Payment Mode
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-xs">
                  {(['UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'NETBANKING'] as PaymentMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFormPaymentMode(mode)}
                      className={`py-2 px-1 rounded-xl text-[11px] font-semibold border transition-colors ${
                        formPaymentMode === mode
                          ? 'bg-white text-black font-bold border-white'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {mode.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Starbucks iced latte"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#181818] border border-white/10 text-white rounded-xl text-xs focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpenAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-white hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? 'Saving...' : editingTransaction ? 'Save Changes' : 'Create Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
