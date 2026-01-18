import React, { useState, useMemo } from 'react';
import { Calendar, Filter, X, Receipt, Search, Package, Trash2, ShoppingBag, Utensils, Home, Zap, HelpCircle, HandCoins } from 'lucide-react';
import { Expense, ExpenseType, SharedPurchase } from '../types';
import { formatDateToDDMMYYYY, formatDateToYYYYMMDD, isDateInRange } from '../utils/dateUtils';

interface BillingHistoryProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  sharedPurchases?: SharedPurchase[];
  onDeletePurchase?: (id: string) => void;
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

const BillingHistory: React.FC<BillingHistoryProps> = ({ expenses, onDelete, sharedPurchases = [], onDeletePurchase }) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Convert dates for filtering (convert DD-MM-YYYY to YYYY-MM-DD for input)
  const startDateInput = startDate ? formatDateToYYYYMMDD(startDate) : '';
  const endDateInput = endDate ? formatDateToYYYYMMDD(endDate) : '';

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Date range filter
      const expenseDate = formatDateToDDMMYYYY(expense.date);
      if (!isDateInRange(expenseDate, startDate || null, endDate || null)) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = expense.name.toLowerCase().includes(query);
        const matchesNote = expense.note?.toLowerCase().includes(query) || false;
        const matchesTo = expense.to?.toLowerCase().includes(query) || false;
        const matchesAmount = expense.amount.toString().includes(query);
        if (!matchesName && !matchesNote && !matchesTo && !matchesAmount) {
          return false;
        }
      }

      // Type filter
      if (selectedType !== 'all' && expense.type !== selectedType) {
        return false;
      }

      return true;
    });
  }, [expenses, startDate, endDate, searchQuery, selectedType]);

  // Filter shared purchases (Item Split Calculator) using same filters
  const filteredPurchases = useMemo(() => {
    return sharedPurchases.filter(purchase => {
      const purchaseDate = formatDateToDDMMYYYY(purchase.date);
      if (!isDateInRange(purchaseDate, startDate || null, endDate || null)) {
        return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesBuyer = purchase.buyer.toLowerCase().includes(query);
        const matchesPayer = purchase.payer.toLowerCase().includes(query);
        const matchesItem = purchase.itemName.toLowerCase().includes(query);
        const matchesNote = purchase.note?.toLowerCase().includes(query) || false;
        const matchesAmount = purchase.amount.toString().includes(query);
        const matchesSplitBetween = (purchase.splitBetween || []).some(n => n.toLowerCase().includes(query));
        if (!matchesBuyer && !matchesPayer && !matchesItem && !matchesNote && !matchesAmount && !matchesSplitBetween) {
          return false;
        }
      }

      return true;
    });
  }, [sharedPurchases, startDate, endDate, searchQuery]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setStartDate(formatDateToDDMMYYYY(value));
    } else {
      setStartDate('');
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setEndDate(formatDateToDDMMYYYY(value));
    } else {
      setEndDate('');
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setSelectedType('all');
  };

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSharedAmount = filteredPurchases.reduce((sum, p) => sum + p.amount, 0);
  const hasActiveFilters = startDate || endDate || searchQuery || selectedType !== 'all';

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-indigo-600">
            <Filter size={20} />
            <h3 className="font-bold text-gray-800 text-lg">Filters</h3>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
              >
                <X size={14} />
                Clear All
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Search</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, note, amount..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <Calendar size={14} />
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDateInput}
                  onChange={handleStartDateChange}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <Calendar size={14} />
                  End Date
                </label>
                <input
                  type="date"
                  value={endDateInput}
                  onChange={handleEndDateChange}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Category</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Categories</option>
                {Object.values(ExpenseType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Showing <span className="font-bold text-gray-900">{filteredExpenses.length}</span> of{' '}
              <span className="font-bold text-gray-900">{expenses.length}</span> expenses
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase">Total Amount</p>
            <p className="text-xl font-bold text-indigo-600">₹{totalAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-gray-50/30">
          <div className="flex items-center gap-2 text-indigo-600">
            <Receipt size={20} />
            <h2 className="font-bold text-gray-800 text-xl">Billing History</h2>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 italic">
              {expenses.length === 0 
                ? 'No expenses recorded yet.' 
                : 'No expenses match your filters.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear filters to see all expenses
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto pr-2">
            {filteredExpenses.map((expense) => {
              const formattedDate = formatDateToDDMMYYYY(expense.date);
              return (
                <div key={expense.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                      {getIcon(expense.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{expense.name}</span>
                        {expense.to && (
                          <span className="text-xs text-indigo-600 font-medium">
                            → {expense.to}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold uppercase">
                          {expense.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-xs text-gray-500 font-medium">{formattedDate}</p>
                        <span className="text-xs text-gray-300">•</span>
                        <p className="text-xs text-gray-500">{expense.paymode}</p>
                        {expense.note && (
                          <>
                            <span className="text-xs text-gray-300">•</span>
                            <p className="text-xs text-gray-500 italic">{expense.note}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-bold text-lg min-w-[80px] text-right ${
                      expense.type === ExpenseType.SETTLEMENT ? 'text-indigo-600' : 'text-gray-900'
                    }`}>
                      ₹{expense.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => onDelete(expense.id)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shared Purchases (Item Split Calculator) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-gray-50/30">
          <div className="flex items-center gap-2 text-orange-600">
            <Package size={20} />
            <h2 className="font-bold text-gray-800 text-xl">Item Split Purchases</h2>
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Total: <span className="font-bold text-gray-800">₹{totalSharedAmount.toFixed(2)}</span> · {filteredPurchases.length} item{filteredPurchases.length !== 1 ? 's' : ''}
          </div>
        </div>

        {filteredPurchases.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 italic">
              {sharedPurchases.length === 0 
                ? 'No shared purchases recorded yet.' 
                : 'No shared purchases match your filters.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear filters to see all shared purchases
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto pr-2">
            {filteredPurchases.map((purchase) => {
              const formattedDate = formatDateToDDMMYYYY(purchase.date);
              const splitCount = purchase.splitBetween?.length || 0;
              const perPerson = splitCount > 0
                ? (purchase.perPersonAmount ?? (purchase.amount / splitCount))
                : null;
              return (
                <div key={purchase.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100">
                      <Package size={16} className="text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{purchase.itemName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold uppercase">
                          Item Split
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-500">
                        <span>Buyer:</span><span className="font-semibold text-gray-800">{purchase.buyer}</span>
                        <span className="text-gray-300">•</span>
                        <span>Payer:</span><span className="font-semibold text-gray-800">{purchase.payer}</span>
                        <span className="text-gray-300">•</span>
                        <span>{formattedDate}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-500">{purchase.paymode}</span>
                        {splitCount > 0 && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-indigo-600 font-semibold">
                              Split: {splitCount} people (₹{perPerson?.toFixed(2)} each)
                            </span>
                          </>
                        )}
                        {purchase.note && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="italic">{purchase.note}</span>
                          </>
                        )}
                      </div>
                      {splitCount > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          <span className="font-semibold">Between:</span> {purchase.splitBetween!.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-lg min-w-[80px] text-right text-gray-900">
                      ₹{purchase.amount.toFixed(2)}
                    </span>
                    {onDeletePurchase && (
                      <button
                        onClick={() => onDeletePurchase(purchase.id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingHistory;

