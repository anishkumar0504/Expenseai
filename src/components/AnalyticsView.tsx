import React, { useState, useEffect } from 'react';
import { AnalyticsSummary } from '../types.js';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { BarChart3, TrendingUp, Calendar, Tag, AlertCircle, RefreshCw } from 'lucide-react';
import { apiFetch } from '../lib/api.js';

interface AnalyticsViewProps {
  token: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ token }) => {
  const [range, setRange] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async (selectedRange: 'weekly' | 'monthly' | 'yearly') => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/analytics?range=${selectedRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(range);
  }, [range, token]);

  const isYearlyDisabled = data ? data.monthsAvailableCount < 12 : false;

  // Modern monochrome neutral color palette for categories
  const pieColors = [
    '#ffffff',
    '#e4e4e7',
    '#d4d4d8',
    '#a1a1aa',
    '#71717a',
    '#52525b',
    '#3f3f46',
    '#27272a',
  ];

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Time Range Selector Header */}
      <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2.5 rounded-xl bg-white text-black font-bold shadow-md">
              <BarChart3 className="w-5 h-5 text-black" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Expense Analytics</h2>
          </div>
          <p className="text-xs text-gray-400">
            Visual breakdown of spending habits, category distribution, and payment modes.
          </p>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#181818] border border-white/10 rounded-xl shrink-0">
          <button
            onClick={() => setRange('weekly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              range === 'weekly'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setRange('monthly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              range === 'monthly'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => {
              if (!isYearlyDisabled) setRange('yearly');
            }}
            disabled={isYearlyDisabled}
            title={isYearlyDisabled ? 'Requires at least 12 months of transaction history' : 'Yearly View'}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              range === 'yearly'
                ? 'bg-white text-black font-bold shadow-sm'
                : isYearlyDisabled
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Yearly {isYearlyDisabled && '(12m required)'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-16 text-center text-gray-400">
          <RefreshCw className="w-8 h-8 text-white animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Loading analytics data...</p>
        </div>
      ) : data ? (
        <>
          {/* Summary Stat Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Total Spend ({data.range})
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
                ₹{data.totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-gray-500 mt-1.5">{data.daysElapsed} days elapsed in range</p>
            </div>

            <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Avg / Day
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
                ₹{data.avgPerDay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-gray-500 mt-1.5">Total / {data.daysElapsed} days</p>
            </div>

            <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Avg / Week
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
                ₹{data.avgPerWeek.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-gray-500 mt-1.5">Computed over selected timeframe</p>
            </div>

            <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Avg / Month
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
                ₹{data.avgPerMonth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-gray-500 mt-1.5">Projected monthly run-rate</p>
            </div>
          </div>

          {/* Charts Row 1: Donut Category Chart & Line Trend Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Donut Chart */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-white" /> Spend by Category
                </h3>
              </div>

              {data.categoryBreakdown.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 my-auto">
                  <div className="w-full sm:w-1/2 h-56 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.categoryBreakdown}
                          dataKey="amount"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {data.categoryBreakdown.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={pieColors[index % pieColors.length]}
                              stroke="rgba(0,0,0,0.5)"
                              strokeWidth={1}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#181818',
                            borderColor: 'rgba(255, 255, 255, 0.15)',
                            borderRadius: '12px',
                            color: '#ffffff',
                            fontSize: '12px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                          }}
                          formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, 'Amount']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="w-full sm:w-1/2 space-y-2.5 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                    {data.categoryBreakdown.map((item, index) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#181818] border border-white/5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: pieColors[index % pieColors.length] }}
                          />
                          <span className="text-gray-300 font-medium truncate">{item.name}</span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="font-bold text-white">₹{item.amount.toFixed(2)}</span>
                          <span className="text-[10px] text-gray-400 ml-1.5">({item.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-gray-500">No transaction data in this timeframe</div>
              )}
            </div>

            {/* Spend Trend Line Chart */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-white" />
                  Spend Trend ({data.range === 'weekly' ? 'Daily' : data.range === 'monthly' ? 'Weekly' : 'Monthly'})
                </h3>
              </div>

              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                    <XAxis dataKey="period" stroke="#888888" fontSize={11} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#181818',
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                      }}
                      formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, 'Spent']}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#ffffff"
                      strokeWidth={2.5}
                      dot={{ fill: '#ffffff', stroke: '#000000', strokeWidth: 1, r: 4 }}
                      activeDot={{ fill: '#ffffff', r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2: Payment Mode Bar Chart & Top Tags */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Mode Bar Chart */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white" /> Payment Mode Breakdown
                </h3>
              </div>

              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.paymentModeBreakdown} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                    <XAxis dataKey="mode" stroke="#888888" fontSize={11} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#181818',
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                      }}
                      formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, 'Total Amount']}
                    />
                    <Bar dataKey="amount" fill="#ffffff" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Tags List */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-white" /> Top Tags by Spend
                </h3>
              </div>

              {data.topTags.length > 0 ? (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 no-scrollbar my-auto">
                  {data.topTags.map((tagItem) => (
                    <div
                      key={tagItem.tag}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#181818] border border-white/10 text-xs hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
                          #{tagItem.tag}
                        </span>
                        <span className="text-[11px] text-gray-400">({tagItem.count} transactions)</span>
                      </div>
                      <span className="font-extrabold text-white">₹{tagItem.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-gray-500">No tagged expenses found</div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
