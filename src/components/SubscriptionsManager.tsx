import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore.js';
import { Subscription, PaymentMode } from '../types.js';
import { renderPaymentModeBadge } from '../lib/categoryIcons.jsx';
import {
  Plus,
  Repeat,
  Calendar,
  PauseCircle,
  PlayCircle,
  XCircle,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Sparkles,
  Tag,
} from 'lucide-react';

export const SubscriptionsManager: React.FC = () => {
  const { categories, subscriptions, addSubscription, updateSubscription, deleteSubscription } =
    useFinanceStore();

  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [billingDay, setBillingDay] = useState('1');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultSubCat = categories.find((c) => c.name === 'Subscriptions') || categories[0];

  const openNewModal = () => {
    setEditingSub(null);
    setName('');
    setAmount('');
    const cId = defaultSubCat?.id || '';
    setCategoryId(cId);
    const subCat = categories.find((c) => c.id === cId)?.subcategories[0]?.id || '';
    setSubcategoryId(subCat);
    setBillingDay('1');
    setPaymentMode('UPI');
    setStartDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setIsOpenAddModal(true);
  };

  const openEditModal = (sub: Subscription) => {
    setEditingSub(sub);
    setName(sub.name);
    setAmount(String(sub.amount));
    setCategoryId(sub.categoryId);
    setSubcategoryId(sub.subcategoryId);
    setBillingDay(String(sub.billingDay));
    setPaymentMode(sub.paymentMode);
    setStartDate(sub.startDate);
    setNotes(sub.notes || '');
    setIsOpenAddModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || isNaN(parseFloat(amount))) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        amount: parseFloat(amount),
        categoryId: categoryId || defaultSubCat?.id,
        subcategoryId: subcategoryId || '',
        billingDay: Math.max(1, Math.min(31, parseInt(billingDay, 10) || 1)),
        paymentMode,
        startDate,
        notes: notes.trim() || null,
        status: 'ACTIVE' as const,
        nextBillingDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(billingDay).padStart(2, '0')}`,
      };

      if (editingSub) {
        await updateSubscription(editingSub.id, payload);
      } else {
        await addSubscription(payload);
      }

      setIsOpenAddModal(false);
    } catch (err) {
      console.error('Error saving subscription', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePause = async (sub: Subscription) => {
    const newStatus = sub.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await updateSubscription(sub.id, { status: newStatus });
  };

  const activeSubscriptions = subscriptions.filter((s) => s.status !== 'CANCELLED');
  const cancelledSubscriptions = subscriptions.filter((s) => s.status === 'CANCELLED');
  const totalMonthlyCommitment = activeSubscriptions
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + s.amount, 0);

  const selectedCategory = categories.find((c) => c.id === categoryId) || defaultSubCat;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8B8B94] flex items-center gap-1.5">
            <Repeat className="w-4 h-4 text-violet-400" /> Recurring Auto-Billing
          </span>
          <h2 className="text-2xl font-bold text-[#F5F5F7] mt-1">
            Subscriptions & Memberships
          </h2>
          <p className="text-xs text-[#8B8B94] mt-0.5">
            Auto-bills transactions on your configured billing day each month
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[11px] text-[#8B8B94]">Monthly Commitment</p>
            <p className="text-xl font-extrabold text-gradient-spend">
              ₹{totalMonthlyCommitment.toLocaleString('en-IN')}/mo
            </p>
          </div>
          <button
            onClick={openNewModal}
            className="py-2.5 px-4 rounded-xl gradient-positive text-white text-xs font-bold glow-violet hover:opacity-95 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Subscription
          </button>
        </div>
      </div>

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeSubscriptions.map((sub) => {
          const isPaused = sub.status === 'PAUSED';
          return (
            <div
              key={sub.id}
              className={`glass-card p-5 relative overflow-hidden transition-all ${
                isPaused ? 'opacity-60 border-amber-500/20' : 'hover:border-violet-500/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-bold text-[#F5F5F7]">{sub.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-cyan-400 font-semibold">
                      {sub.subcategoryName || 'Subscription'}
                    </span>
                    {renderPaymentModeBadge(sub.paymentMode)}
                  </div>
                </div>

                <span className="text-lg font-extrabold text-[#F5F5F7]">
                  ₹{sub.amount.toFixed(2)}
                  <span className="text-[10px] text-[#8B8B94] font-normal">/mo</span>
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-[#8B8B94] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-violet-400" /> Day {sub.billingDay} of month
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTogglePause(sub)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-[#8B8B94] hover:text-amber-400 transition-colors"
                    title={isPaused ? 'Resume auto-billing' : 'Pause auto-billing'}
                  >
                    {isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEditModal(sub)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-[#8B8B94] hover:text-cyan-400 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteSubscription(sub.id)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-[#8B8B94] hover:text-[#FB7185] transition-colors"
                    title="Cancel subscription"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {activeSubscriptions.length === 0 && (
          <div className="col-span-full glass-card p-12 text-center text-[#8B8B94]">
            <AlertCircle className="w-8 h-8 text-[#8B8B94] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#F5F5F7]">No active subscriptions</p>
            <p className="text-xs text-[#8B8B94] mt-1">
              Add Netflix, Spotify, Gym, or iCloud to automatically bill them monthly.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Subscription Modal */}
      {isOpenAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-card border border-white/10 rounded-2xl p-6 text-[#F5F5F7] relative shadow-2xl">
            <button
              onClick={() => setIsOpenAddModal(false)}
              className="absolute top-4 right-4 text-[#8B8B94] hover:text-[#F5F5F7]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold mb-1">
              {editingSub ? 'Edit Subscription' : 'New Subscription'}
            </h3>
            <p className="text-xs text-[#8B8B94] mb-4">
              Configure billing cycle and subcategory tagging.
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B8B94] mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix 4K, Spotify Duo..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 glass-input text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B8B94] mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="15.99"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 glass-input text-xs font-bold text-[#F5F5F7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B8B94] mb-1">
                    Billing Day (1–31) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={billingDay}
                    onChange={(e) => setBillingDay(e.target.value)}
                    className="w-full px-3.5 py-2.5 glass-input text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B8B94] mb-1">
                  Category & Subcategory
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    const cat = categories.find((c) => c.id === e.target.value);
                    setSubcategoryId(cat?.subcategories[0]?.id || '');
                  }}
                  className="w-full px-3.5 py-2.5 glass-input text-xs font-medium mb-2 cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#0A0A0F] text-[#F5F5F7]">
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 glass-input text-xs font-medium cursor-pointer"
                >
                  {selectedCategory?.subcategories.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#0A0A0F] text-[#F5F5F7]">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B8B94] mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-3.5 py-2.5 glass-input text-xs font-medium cursor-pointer"
                >
                  <option value="UPI" className="bg-[#0A0A0F] text-[#F5F5F7]">
                    UPI
                  </option>
                  <option value="CREDIT_CARD" className="bg-[#0A0A0F] text-[#F5F5F7]">
                    Credit Card
                  </option>
                  <option value="DEBIT_CARD" className="bg-[#0A0A0F] text-[#F5F5F7]">
                    Debit Card
                  </option>
                  <option value="NETBANKING" className="bg-[#0A0A0F] text-[#F5F5F7]">
                    Netbanking
                  </option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpenAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#8B8B94] hover:bg-white/5 border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white gradient-positive shadow-md glow-violet"
                >
                  {isSubmitting ? 'Saving...' : editingSub ? 'Save Subscription' : 'Create Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
