import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore.js';
import { Lending, LendingType, LendingStatus } from '../types.js';
import {
  Plus,
  HandCoins,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  X,
  CreditCard,
  Trash2,
} from 'lucide-react';

export const LendingManager: React.FC = () => {
  const { lendings, addLending, payLendingInstallment, updateLending, deleteLending } = useFinanceStore();

  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Form State
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<LendingType>('GIVEN');
  const [dueDate, setDueDate] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openModal = () => {
    setPersonName('');
    setAmount('');
    setType('GIVEN');
    setDueDate('');
    setTotalInstallments('');
    setNotes('');
    setIsOpenAddModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim() || !amount || isNaN(parseFloat(amount))) return;

    setIsSubmitting(true);
    try {
      await addLending({
        personName: personName.trim(),
        amount: parseFloat(amount),
        type,
        dueDate: dueDate || null,
        totalInstallments: type === 'EMI' && totalInstallments ? parseInt(totalInstallments, 10) : null,
        installmentNo: type === 'EMI' ? 0 : null,
        notes: notes.trim() || null,
        status: 'PENDING',
      });
      setIsOpenAddModal(false);
    } catch (err) {
      console.error('Error adding lending record', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayInstallmentClick = async (id: string) => {
    setPayingId(id);
    try {
      await payLendingInstallment(id);
    } catch (err) {
      console.error('Error paying installment', err);
    } finally {
      setPayingId(null);
    }
  };

  const handleStatusChange = async (lending: Lending, status: LendingStatus) => {
    await updateLending(lending.id, { status });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="glass-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8B8B94] flex items-center gap-1.5">
            <HandCoins className="w-4 h-4 text-cyan-400" /> Peer Loans & Installments
          </span>
          <h2 className="text-2xl font-bold text-[#F5F5F7] mt-1">Lending & EMI Tracker</h2>
          <p className="text-xs text-[#8B8B94] mt-0.5">
            Track money lent, borrowed, or paid via monthly installments
          </p>
        </div>

        <button
          onClick={openModal}
          className="py-2.5 px-4 rounded-xl gradient-positive text-white text-xs font-bold glow-violet hover:opacity-95 transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Record
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lendings.map((item) => {
          const isSettled = item.status === 'SETTLED';
          return (
            <div
              key={item.id}
              className={`glass-card p-5 relative overflow-hidden transition-all ${
                isSettled ? 'opacity-60 border-emerald-500/20' : 'hover:border-violet-500/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-violet-400" />
                    <h4 className="text-base font-bold text-[#F5F5F7]">{item.personName}</h4>
                  </div>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      item.type === 'GIVEN'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : item.type === 'BORROWED'
                        ? 'bg-rose-500/10 text-[#FB7185] border border-rose-500/20'
                        : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    }`}
                  >
                    {item.type === 'GIVEN' ? 'Money Lent' : item.type === 'BORROWED' ? 'Money Borrowed' : 'EMI Loan'}
                  </span>
                </div>

                <span className="text-lg font-extrabold text-[#F5F5F7]">
                  ₹{item.amount.toFixed(2)}
                </span>
              </div>

              {item.type === 'EMI' && item.totalInstallments && (
                <div className="mt-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#8B8B94]">
                    <span>Installment Progress</span>
                    <span className="font-bold text-[#F5F5F7]">
                      {item.installmentNo || 0} / {item.totalInstallments}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-400 h-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (((item.installmentNo || 0) / item.totalInstallments) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-[#8B8B94] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" /> {item.dueDate || 'No due date'}
                </span>

                <div className="flex items-center gap-1">
                  {item.type === 'EMI' && !isSettled && (
                    <button
                      onClick={() => handlePayInstallmentClick(item.id)}
                      disabled={payingId === item.id}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-bold hover:bg-cyan-500/20 transition-all flex items-center gap-1"
                    >
                      <CreditCard className="w-3 h-3" /> Pay Installment
                    </button>
                  )}

                  {!isSettled && item.type !== 'EMI' && (
                    <button
                      onClick={() => handleStatusChange(item, 'SETTLED')}
                      className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-[#8B8B94] hover:text-emerald-400 transition-colors"
                      title="Settle"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => deleteLending(item.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[#8B8B94] hover:text-[#FB7185] transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {lendings.length === 0 && (
          <div className="col-span-full glass-card p-12 text-center text-[#8B8B94]">
            <Clock className="w-8 h-8 text-[#8B8B94] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#F5F5F7]">No lending or EMI records</p>
            <p className="text-xs text-[#8B8B94] mt-1">
              Add records when you lend money to friends, borrow money, or pay monthly EMIs.
            </p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isOpenAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-card border border-white/10 rounded-2xl p-6 text-[#F5F5F7] relative shadow-2xl">
            <button
              onClick={() => setIsOpenAddModal(false)}
              className="absolute top-4 right-4 text-[#8B8B94] hover:text-[#F5F5F7]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold mb-1">New Lending / EMI Record</h3>
            <p className="text-xs text-[#8B8B94] mb-4">Track peer loans or installment debts.</p>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B8B94] mb-1">
                  Person / Entity Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex, HDFC Bank EMI..."
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="w-full px-3.5 py-2.5 glass-input text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B8B94] mb-1">
                    Total Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="250.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 glass-input text-xs font-bold text-[#F5F5F7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B8B94] mb-1">
                    Record Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as LendingType)}
                    className="w-full px-3.5 py-2.5 glass-input text-xs font-medium cursor-pointer"
                  >
                    <option value="GIVEN" className="bg-[#0A0A0F] text-[#F5F5F7]">
                      Given (Lent)
                    </option>
                    <option value="BORROWED" className="bg-[#0A0A0F] text-[#F5F5F7]">
                      Taken (Borrowed)
                    </option>
                    <option value="EMI" className="bg-[#0A0A0F] text-[#F5F5F7]">
                      EMI Installment
                    </option>
                  </select>
                </div>
              </div>

              {type === 'EMI' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B8B94] mb-1">
                    Total Number of Installments
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="12"
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(e.target.value)}
                    className="w-full px-3.5 py-2.5 glass-input text-xs font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B8B94] mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 glass-input text-xs font-medium"
                />
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
                  {isSubmitting ? 'Saving...' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
