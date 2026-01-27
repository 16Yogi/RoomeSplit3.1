
import React from 'react';
import { Trash2, ShoppingBag, Utensils, Home, Zap, Package, HelpCircle, HandCoins } from 'lucide-react';
import { Expense, ExpenseType } from '../types';
import { formatDateToDDMMYYYY } from '../utils/dateUtils';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  isLoggedIn?: boolean;
}

const getIcon = (type: ExpenseType) => {
  switch (type) {
    case ExpenseType.VEGETABLE: return <Utensils size={16} className="text-orange-500" />;
    case ExpenseType.GROCERY: return <ShoppingBag size={16} className="text-emerald-500" />;
    case ExpenseType.MART: return <Package size={16} className="text-blue-500" />;
    case ExpenseType.RENT: return <Home size={16} className="text-indigo-500" />;
    case ExpenseType.ELECTRICITY: return <Zap size={16} className="text-yellow-500" />;
    case ExpenseType.SETTLEMENT: return <HandCoins size={16} className="text-indigo-400" />;
    default: return <HelpCircle size={16} className="text-gray-500" />;
  }
};

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDelete, isLoggedIn = false }) => {
  if (expenses.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-gray-500 italic">No expenses recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {expenses.map((expense) => (
        <div key={expense.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
              {getIcon(expense.type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{expense.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold uppercase">
                  {expense.type}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{formatDateToDDMMYYYY(expense.date)} • {expense.paymode} {expense.note && `• ${expense.note}`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-lg ${expense.type === ExpenseType.SETTLEMENT ? 'text-indigo-600' : 'text-gray-900'}`}>
              ₹{expense.amount.toFixed(2)}
            </span>
            {isLoggedIn && (
              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onDelete(expense.id)}
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExpenseList;
