import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore.js';
import { X, Plus, Sparkles, Check, Tag, AlertTriangle, Trash2 } from 'lucide-react';

interface CustomSubcategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomSubcategoryModal: React.FC<CustomSubcategoryModalProps> = ({ isOpen, onClose }) => {
  const { categories, addSubcategory, deleteSubcategory } = useFinanceStore();
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || 'cat_1');
  const [subcategoryName, setSubcategoryName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcategoryName.trim()) return;

    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const result = await addSubcategory(selectedCatId, subcategoryName.trim());
    setIsSubmitting(false);

    if (result.subcategory) {
      setSuccessMessage(`Subcategory "${result.subcategory.name}" created!`);
      setSubcategoryName('');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);
    } else if (result.error) {
      setErrorMessage(result.error);
    }
  };

  const handleDeleteSub = async (subId: string, subName: string) => {
    if (confirmingDeleteId !== subId) {
      setConfirmingDeleteId(subId);
      return;
    }

    // Direct deletion on 2nd click
    setConfirmingDeleteId(null);
    await deleteSubcategory(selectedCatId, subId);
    setSuccessMessage(`Subcategory "${subName}" deleted.`);
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  const selectedCategory = categories.find((c) => c.id === selectedCatId) || categories[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/10 text-white border border-white/10">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Manage Subcategories</h3>
              <p className="text-xs text-gray-400">Add or remove custom tags for expense categories</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-white" /> {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Parent Category
            </label>
            <select
              value={selectedCatId}
              onChange={(e) => {
                setSelectedCatId(e.target.value);
                setErrorMessage(null);
                setSuccessMessage(null);
                setConfirmingDeleteId(null);
              }}
              className="w-full px-3.5 py-2.5 bg-[#181818] border border-white/10 text-white rounded-xl text-xs font-medium cursor-pointer focus:outline-none focus:border-white/30"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-[#121212] text-white">
                  {cat.name} ({cat.subcategories.length} subcategories)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              New Subcategory Name
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="e.g. Zepto, Blinkit, Starbucks, Specialty Coffee..."
                value={subcategoryName}
                onChange={(e) => {
                  setSubcategoryName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#181818] border border-white/10 text-white rounded-xl text-xs font-medium focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          {/* Existing Subcategories List with Delete option */}
          {selectedCategory && (
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <span>Existing in {selectedCategory.name}:</span>
                <span>{selectedCategory.subcategories.length} tags</span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 no-scrollbar">
                {selectedCategory.subcategories.map((sub) => {
                  const isConfirming = confirmingDeleteId === sub.id;
                  return (
                    <span
                      key={sub.id}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 transition-colors ${
                        isConfirming
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                          : 'bg-white/5 border-white/10 text-white'
                      }`}
                    >
                      <span>{sub.name}</span>
                      {sub.name !== 'No specific subcategory' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSub(sub.id, sub.name)}
                          className={`p-0.5 rounded transition-colors ${
                            isConfirming
                              ? 'text-amber-300 hover:text-white font-bold'
                              : 'text-gray-400 hover:text-white'
                          }`}
                          title={isConfirming ? 'Click again to confirm delete' : `Delete ${sub.name}`}
                        >
                          {isConfirming ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      )}
                    </span>
                  );
                })}

                {selectedCategory.subcategories.length === 0 && (
                  <span className="text-[11px] text-gray-400">No subcategories yet</span>
                )}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !subcategoryName.trim()}
              className="px-5 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4 text-black" />
              {isSubmitting ? 'Adding...' : 'Add Subcategory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

