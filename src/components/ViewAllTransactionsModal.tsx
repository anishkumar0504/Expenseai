import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore.js';
import { X, Search, Filter, Trash2, Tag, Calendar, CreditCard, ArrowDownRight } from 'lucide-react';

interface ViewAllTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ViewAllTransactionsModal: React.FC<ViewAllTransactionsModalProps> = ({ isOpen, onClose }) => {
  const { transactions, categories, deleteTransaction } = useFinanceStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('ALL');
  const [selectedSubId, setSelectedSubId] = useState('ALL');

  if (!isOpen) return null;

  const currentCategory = categories.find((c) => c.id === selectedCatId);

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.categoryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subcategoryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.amount.toString().includes(searchTerm);

    const matchesCat = selectedCatId === 'ALL' || t.categoryId === selectedCatId;
    const matchesSub = selectedSubId === 'ALL' || t.subcategoryId === selectedSubId;

    return matchesSearch && matchesCat && matchesSub;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-4xl max-h-[85vh] glass-card border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-xl font-bold text-[#F5F5F7]">All Financial Records</h3>
            <p className="text-xs text-[#8B8B94]">
              Total {transactions.length} records logged • Showing {filteredTransactions.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8B8B94] hover:text-[#F5F5F7] hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8B8B94] absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search description, amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 glass-input text-xs"
            />
          </div>

          <div>
            <select
              value={selectedCatId}
              onChange={(e) => {
                setSelectedCatId(e.target.value);
                setSelectedSubId('ALL');
              }}
              className="w-full px-3.5 py-2.5 glass-input text-xs font-medium cursor-pointer"
            >
              <option value="ALL" className="bg-[#0A0A0F] text-[#F5F5F7]">
                All Categories
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0A0A0F] text-[#F5F5F7]">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(e.target.value)}
              disabled={selectedCatId === 'ALL'}
              className="w-full px-3.5 py-2.5 glass-input text-xs font-medium cursor-pointer disabled:opacity-40"
            >
              <option value="ALL" className="bg-[#0A0A0F] text-[#F5F5F7]">
                All Subcategories
              </option>
              {currentCategory?.subcategories.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#0A0A0F] text-[#F5F5F7]">
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Records List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-coral-500/10 text-coral-400 border border-coral-500/20">
                    <ArrowDownRight className="w-4 h-4 text-[#FB7185]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#F5F5F7]">
                        {t.description || t.categoryName}
                      </p>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-cyan-400 font-semibold">
                        {t.subcategoryName || 'Subcategory'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#8B8B94] mt-1">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" /> {t.categoryName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {t.date}
                      </span>
                      <span className="flex items-center gap-1 uppercase">
                        <CreditCard className="w-3 h-3" /> {t.paymentMode}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold text-[#FB7185]">
                    -₹{t.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => deleteTransaction(t.id)}
                    className="p-1.5 rounded-lg text-[#8B8B94] hover:text-[#FB7185] hover:bg-rose-500/10 transition-colors opacity-80 group-hover:opacity-100"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-[#8B8B94] text-xs">
              No matching records found. Try adjusting your search query or filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
