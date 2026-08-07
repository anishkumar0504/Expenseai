import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore.js';
import { Todo, Goal } from '../types.js';
import {
  CheckSquare,
  Plus,
  Target,
  Trash2,
  Calendar,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const TodoAndGoals: React.FC = () => {
  const { todos, goals, addTodo, toggleTodo, deleteTodo, addGoal, updateGoal, deleteGoal } =
    useFinanceStore();

  // Local Draft Storage Fallback for new Todo creation
  const [draftTitle, setDraftTitle] = useState(() => localStorage.getItem('draft_todo_title') || '');
  const [draftDesc, setDraftDesc] = useState(() => localStorage.getItem('draft_todo_desc') || '');
  const [isAddingTodo, setIsAddingTodo] = useState(false);

  useEffect(() => {
    localStorage.setItem('draft_todo_title', draftTitle);
  }, [draftTitle]);

  useEffect(() => {
    localStorage.setItem('draft_todo_desc', draftDesc);
  }, [draftDesc]);

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim()) return;

    setIsAddingTodo(true);
    try {
      await addTodo({
        title: draftTitle.trim(),
        description: draftDesc.trim() || null,
        date: new Date().toISOString().split('T')[0],
        isDone: false,
      });

      setDraftTitle('');
      setDraftDesc('');
      localStorage.removeItem('draft_todo_title');
      localStorage.removeItem('draft_todo_desc');
    } catch (err) {
      console.error('Error creating todo', err);
    } finally {
      setIsAddingTodo(false);
    }
  };

  const handleToggleTodo = async (todo: Todo) => {
    await toggleTodo(todo.id, !todo.isDone);
  };

  // Goals State
  const [isOpenGoalModal, setIsOpenGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('0');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim() || !goalTarget || isNaN(parseFloat(goalTarget))) return;

    setIsSubmittingGoal(true);
    try {
      await addGoal({
        title: goalTitle.trim(),
        targetValue: parseFloat(goalTarget),
        currentValue: parseFloat(goalCurrent) || 0,
        deadline: goalDeadline || null,
        status: 'ACTIVE',
      });

      setGoalTitle('');
      setGoalTarget('');
      setGoalCurrent('0');
      setGoalDeadline('');
      setIsOpenGoalModal(false);
    } catch (err) {
      console.error('Error creating goal', err);
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* SECTION 1: Tasks & To-dos */}
      <div className="glass-card p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8B8B94] flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-cyan-400" /> Daily Action List
              </span>
              <h3 className="text-xl font-bold text-[#F5F5F7] mt-0.5">Tasks & To-Dos</h3>
            </div>
          </div>

          {/* New Todo Quick Add */}
          <form onSubmit={handleCreateTodo} className="space-y-2 mb-4">
            <input
              type="text"
              placeholder="What needs to get done today?"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 glass-input text-xs font-semibold"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Optional description / details..."
                value={draftDesc}
                onChange={(e) => setDraftDesc(e.target.value)}
                className="flex-1 px-3.5 py-2 glass-input text-xs"
              />
              <button
                type="submit"
                disabled={!draftTitle.trim() || isAddingTodo}
                className="px-4 py-2 rounded-xl gradient-positive text-white text-xs font-bold glow-violet hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </div>
          </form>

          {/* Todo List */}
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                  todo.isDone
                    ? 'bg-white/[0.01] border-white/5 opacity-50'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleTodo(todo)}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                      todo.isDone
                        ? 'bg-emerald-500 border-emerald-500 text-black'
                        : 'border-white/20 hover:border-violet-400'
                    }`}
                  >
                    {todo.isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-bold truncate ${
                        todo.isDone ? 'line-through text-[#8B8B94]' : 'text-[#F5F5F7]'
                      }`}
                    >
                      {todo.title}
                    </p>
                    {todo.description && (
                      <p className="text-[11px] text-[#8B8B94] truncate">{todo.description}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="p-1.5 rounded-lg text-[#8B8B94] hover:text-[#FB7185] hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {todos.length === 0 && (
              <div className="py-8 text-center text-[#8B8B94] text-xs">
                No tasks yet. Create a task above to stay productive!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Financial Goals */}
      <div className="glass-card p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8B8B94] flex items-center gap-1.5">
                <Target className="w-4 h-4 text-violet-400" /> Milestone Tracking
              </span>
              <h3 className="text-xl font-bold text-[#F5F5F7] mt-0.5">Financial Goals</h3>
            </div>

            <button
              onClick={() => setIsOpenGoalModal(true)}
              className="py-2 px-3.5 rounded-xl gradient-positive text-white text-xs font-bold glow-violet hover:opacity-95 transition-all flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Goal
            </button>
          </div>

          {/* Goals List */}
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {goals.map((goal) => {
              const percent = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
              return (
                <div
                  key={goal.id}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-violet-500/30 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F5F7]">{goal.title}</h4>
                      {goal.deadline && (
                        <span className="text-[10px] text-[#8B8B94] flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-cyan-400" /> Deadline: {goal.deadline}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-cyan-400">{percent}%</span>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="p-1 rounded-lg text-[#8B8B94] hover:text-[#FB7185]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-cyan-400 h-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-[#8B8B94]">
                    <span>Saved: ₹{goal.currentValue.toLocaleString('en-IN')}</span>
                    <span>Target: ₹{goal.targetValue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })}

            {goals.length === 0 && (
              <div className="py-12 text-center text-[#8B8B94] text-xs">
                No financial goals set. Click "Add Goal" to set milestone targets!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Goal Modal */}
      {isOpenGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-card border border-white/10 rounded-2xl p-6 text-[#F5F5F7] relative shadow-2xl">
            <button
              onClick={() => setIsOpenGoalModal(false)}
              className="absolute top-4 right-4 text-[#8B8B94] hover:text-[#F5F5F7]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold mb-1">Create Financial Goal</h3>
            <p className="text-xs text-[#8B8B94] mb-4">
              Set target savings for emergency funds, travel, or gadgets.
            </p>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B8B94] mb-1">
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Japan Trip Fund, New MacBook..."
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 glass-input text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B8B94] mb-1">
                    Target Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="20000"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full px-3.5 py-2.5 glass-input text-xs font-bold text-[#F5F5F7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B8B94] mb-1">
                    Currently Saved (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    className="w-full px-3.5 py-2.5 glass-input text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B8B94] mb-1">
                  Target Deadline Date
                </label>
                <input
                  type="date"
                  value={goalDeadline}
                  onChange={(e) => setGoalDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 glass-input text-xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpenGoalModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#8B8B94] hover:bg-white/5 border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGoal}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white gradient-positive shadow-md glow-violet"
                >
                  {isSubmittingGoal ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
