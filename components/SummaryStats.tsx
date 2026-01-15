
import React from 'react';
import { Expense, ExpenseType } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SummaryStatsProps {
  expenses: Expense[];
  fixedCosts: number;
  roommatesCount: number;
}

const SummaryStats: React.FC<SummaryStatsProps> = ({ expenses, fixedCosts, roommatesCount }) => {
  // We exclude settlements from total monthly spend because they are redistributions, not new purchases
  const totalVariable = expenses
    .filter(e => e.type !== ExpenseType.SETTLEMENT)
    .reduce((acc, curr) => acc + curr.amount, 0);
    
  const totalSpend = totalVariable + fixedCosts;
  const perPerson = totalSpend / (roommatesCount || 1);

  // Data for chart - we include all contributions for personal spending visualization
  const nameMap = new Map<string, number>();
  expenses.forEach(e => {
    nameMap.set(e.name, (nameMap.get(e.name) || 0) + e.amount);
  });
  
  const chartData = Array.from(nameMap.entries()).map(([name, amount]) => ({
    name,
    amount
  })).sort((a, b) => b.amount - a.amount);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Monthly Spend</p>
          <p className="text-2xl font-bold text-gray-900">₹{totalSpend.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-2">Inc. ₹{fixedCosts.toFixed(2)} fixed</p>
        </div>
        <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg shadow-indigo-100 text-white">
          <p className="text-xs font-semibold text-indigo-100 uppercase tracking-wider mb-1">Per Person Share</p>
          <p className="text-2xl font-bold">₹{perPerson.toFixed(2)}</p>
          <p className="text-xs text-indigo-100 mt-2">Split among {roommatesCount} people</p>
        </div>
      </div>

      {/* Spending Distribution */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Total Contribution by Person</p>
        <div className="h-32 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} style={{fontSize: '12px'}} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={16}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
              No data to display
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryStats;
