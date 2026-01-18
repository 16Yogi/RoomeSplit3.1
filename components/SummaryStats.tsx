
import React, { useState, useMemo } from 'react';
import { Expense, ExpenseType, SharedPurchase } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { X, Receipt, Filter, Search, Calendar } from 'lucide-react';
import { formatDateToDDMMYYYY, formatDateToYYYYMMDD, isDateInRange } from '../utils/dateUtils';

interface SummaryStatsProps {
  expenses: Expense[];
  fixedCosts: number;
  roommatesCount: number;
  sharedPurchases?: SharedPurchase[];
}

const SummaryStats: React.FC<SummaryStatsProps> = ({ expenses, fixedCosts, roommatesCount, sharedPurchases = [] }) => {
  const [selectedPersonForDetails, setSelectedPersonForDetails] = useState<string | null>(null);
  const [personalFilterSearch, setPersonalFilterSearch] = useState<string>('');
  const [personalFilterStartDate, setPersonalFilterStartDate] = useState<string>('');
  const [personalFilterEndDate, setPersonalFilterEndDate] = useState<string>('');
  const [showPersonalFilters, setShowPersonalFilters] = useState(false);
  const [modalFilterSearch, setModalFilterSearch] = useState<string>('');
  const [modalFilterStartDate, setModalFilterStartDate] = useState<string>('');
  const [modalFilterEndDate, setModalFilterEndDate] = useState<string>('');
  const [showModalFilters, setShowModalFilters] = useState(false);
  // Helper to identify expenses that correspond to Shared Purchases
  const getLikelyItemSplitKeys = (purchaseList: SharedPurchase[]) => {
    const keys = new Set<string>();
    purchaseList.forEach(p => {
      // Only include purchases that are actually split (have splitBetween)
      if (p.splitBetween && p.splitBetween.length > 0) {
        keys.add(`${p.payer}|${p.amount.toFixed(2)}|${p.itemName.toLowerCase()}`);
      }
    });
    return keys;
  };

  const isExpenseDuplicate = (e: Expense, keys: Set<string>) => {
    if (!e.note || !e.note.toLowerCase().includes('item:')) return false;
    const match = e.note.match(/Item:\s*(.+?)(?:\s*-|$)/i);
    if (!match) return false;
    const itemName = match[1].trim().toLowerCase();
    const key = `${e.name}|${e.amount.toFixed(2)}|${itemName}`;
    return keys.has(key);
  };

  const itemSplitKeys = getLikelyItemSplitKeys(sharedPurchases);

  // Helper to identify personal expenses
  // Personal expenses are those with "Item:" in note but NOT in shared purchases (or in purchases without splitBetween)
  const isPersonalExpense = (e: Expense) => {
    if (!e.note || !e.note.toLowerCase().includes('item:')) return false;
    // If it has "Item:" but is NOT a duplicate of a shared purchase with splitBetween, it's personal
    return !isExpenseDuplicate(e, itemSplitKeys);
  };

  // Separate personal and shared expenses
  const personalExpenses = expenses.filter(e => e.type !== ExpenseType.SETTLEMENT && isPersonalExpense(e));
  const sharedExpenses = expenses.filter(e => e.type !== ExpenseType.SETTLEMENT && !isPersonalExpense(e));

  // Calculate totals
  const personalExpensesTotal = personalExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalVariable = sharedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    
  const totalSpend = totalVariable + fixedCosts;
  const perPerson = totalSpend / (roommatesCount || 1);

  // Data for chart - calculate total contribution per person (expenses + shared purchases)
  const nameMap = new Map<string, number>();
  
  // Add expenses (excluding settlements)
  expenses.forEach(e => {
    if (e.type !== ExpenseType.SETTLEMENT) {
      nameMap.set(e.name, (nameMap.get(e.name) || 0) + e.amount);
    }
  });
  
  // Add shared purchases (where person is the payer)
  sharedPurchases.forEach(purchase => {
    // Check if this purchase has a matching expense to avoid double counting
    const hasMatchingExpense = expenses.some(e => {
      if (e.name !== purchase.payer || e.type === ExpenseType.SETTLEMENT) return false;
      if (!e.note?.toLowerCase().includes('item:')) return false;
      const match = e.note.match(/Item:\s*(.+?)(?:\s*-|$)/i);
      if (!match) return false;
      const itemNameFromNote = match[1].trim().toLowerCase();
      const purchaseItemName = purchase.itemName.toLowerCase();
      return itemNameFromNote === purchaseItemName && 
             Math.abs(e.amount - purchase.amount) < 0.01;
    });
    
    // If no matching expense, add the purchase amount
    if (!hasMatchingExpense) {
      nameMap.set(purchase.payer, (nameMap.get(purchase.payer) || 0) + purchase.amount);
    }
  });
  
  const chartData = Array.from(nameMap.entries()).map(([name, amount]) => ({
    name,
    amount
  })).sort((a, b) => b.amount - a.amount);
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-900">{payload[0].payload.name}</p>
          <p className="text-indigo-600 font-semibold">₹{payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Monthly Spend</p>
            <p className="text-2xl font-bold text-gray-900">₹{totalSpend.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-2">Inc. ₹{fixedCosts.toFixed(2)} fixed</p>
            <p className="text-xs text-gray-400 mt-1">Excl. personal expenses</p>
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
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
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
          {/* Person-wise totals below chart */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {chartData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">₹{item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Expenses Section */}
      {personalExpensesTotal > 0 && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-2">
                <span className="text-blue-600">Personal Expenses</span>
                <span className="text-xs font-normal text-gray-500 normal-case">(Not split among roommates)</span>
              </p>
              <p className="text-2xl font-bold text-blue-900">₹{personalExpensesTotal.toFixed(2)}</p>
            </div>
            <p className="text-xs text-gray-500">
              {personalExpenses.length} item{personalExpenses.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          {/* Filter Controls */}
          <div className="mt-4 pt-4 border-t border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-600">Personal Expenses Breakdown</span>
              <div className="flex items-center gap-2">
                {(personalFilterSearch || personalFilterStartDate || personalFilterEndDate) && (
                  <button
                    onClick={() => {
                      setPersonalFilterSearch('');
                      setPersonalFilterStartDate('');
                      setPersonalFilterEndDate('');
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                  >
                    <X size={14} />
                    Clear Filters
                  </button>
                )}
                <button
                  onClick={() => setShowPersonalFilters(!showPersonalFilters)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  <Filter size={14} />
                  {showPersonalFilters ? 'Hide' : 'Show'} Filters
                </button>
              </div>
            </div>

            {/* Filters Section */}
            {showPersonalFilters && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Search size={14} className="text-gray-400" />
                      Search
                    </label>
                    <input
                      type="text"
                      value={personalFilterSearch}
                      onChange={(e) => setPersonalFilterSearch(e.target.value)}
                      placeholder="Search by person, item, amount..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={personalFilterStartDate ? formatDateToYYYYMMDD(personalFilterStartDate) : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value) {
                          setPersonalFilterStartDate(formatDateToDDMMYYYY(value));
                        } else {
                          setPersonalFilterStartDate('');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      End Date
                    </label>
                    <input
                      type="date"
                      value={personalFilterEndDate ? formatDateToYYYYMMDD(personalFilterEndDate) : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value) {
                          setPersonalFilterEndDate(formatDateToDDMMYYYY(value));
                        } else {
                          setPersonalFilterEndDate('');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Personal Expenses Breakdown - Grouped by Person */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {(() => {
                // Filter expenses first
                const filteredPersonalExpenses = personalExpenses.filter((expense) => {
                  // Date filter
                  const expenseDate = formatDateToDDMMYYYY(expense.date);
                  if (!isDateInRange(expenseDate, personalFilterStartDate || null, personalFilterEndDate || null)) {
                    return false;
                  }

                  // Search filter
                  if (personalFilterSearch) {
                    const query = personalFilterSearch.toLowerCase();
                    const matchesName = expense.name.toLowerCase().includes(query);
                    const itemMatch = expense.note?.match(/Item:\s*(.+?)(?:\s*-|$)/i);
                    const itemName = itemMatch ? itemMatch[1].trim().toLowerCase() : '';
                    const matchesItem = itemName.includes(query);
                    const matchesAmount = expense.amount.toString().includes(query);
                    const matchesNote = expense.note?.toLowerCase().includes(query) || false;
                    
                    if (!matchesName && !matchesItem && !matchesAmount && !matchesNote) {
                      return false;
                    }
                  }

                  return true;
                });

                // Group filtered expenses by person name
                const groupedByPerson = new Map<string, Expense[]>();
                filteredPersonalExpenses.forEach(expense => {
                  const existing = groupedByPerson.get(expense.name) || [];
                  existing.push(expense);
                  groupedByPerson.set(expense.name, existing);
                });

                // Convert to array and calculate totals for each person
                const personGroups = Array.from(groupedByPerson.entries()).map(([name, expenses]) => ({
                  name,
                  expenses,
                  total: expenses.reduce((acc, curr) => acc + curr.amount, 0),
                  count: expenses.length
                }));

                if (personGroups.length === 0 && (personalFilterSearch || personalFilterStartDate || personalFilterEndDate)) {
                  return (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No personal expenses match the current filters
                    </div>
                  );
                }

                return personGroups.map((personGroup) => (
                <div 
                  key={personGroup.name} 
                  onClick={() => setSelectedPersonForDetails(personGroup.name)}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-blue-900 hover:underline">{personGroup.name}</span>
                      <span className="text-xs text-blue-600 px-2 py-0.5 bg-blue-100 rounded-full font-medium">
                        {personGroup.count} payment{personGroup.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">Click to view all personal expenses</div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-blue-900">₹{personGroup.total.toFixed(2)}</span>
                  </div>
                </div>
              ));
              })()}
            </div>
            {(personalFilterSearch || personalFilterStartDate || personalFilterEndDate) && personalExpenses.length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-gray-500">
                Showing filtered results from {personalExpenses.length} total expense(s)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Personal Expenses Details Modal */}
      {selectedPersonForDetails && (() => {
        const allPersonPersonalExpenses = personalExpenses.filter(e => e.name === selectedPersonForDetails);
        
        // Filter expenses based on modal filters
        const personPersonalExpenses = allPersonPersonalExpenses.filter((expense) => {
          // Date filter
          const expenseDate = formatDateToDDMMYYYY(expense.date);
          if (!isDateInRange(expenseDate, modalFilterStartDate || null, modalFilterEndDate || null)) {
            return false;
          }

          // Search filter
          if (modalFilterSearch) {
            const query = modalFilterSearch.toLowerCase();
            const itemMatch = expense.note?.match(/Item:\s*(.+?)(?:\s*-|$)/i);
            const itemName = itemMatch ? itemMatch[1].trim().toLowerCase() : '';
            const matchesItem = itemName.includes(query);
            const matchesType = expense.type.toLowerCase().includes(query);
            const matchesAmount = expense.amount.toString().includes(query);
            const matchesNote = expense.note?.toLowerCase().includes(query) || false;
            
            if (!matchesItem && !matchesType && !matchesAmount && !matchesNote) {
              return false;
            }
          }

          return true;
        });

        const personTotal = personPersonalExpenses.reduce((acc, curr) => acc + curr.amount, 0);
        
        return (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" 
            onClick={() => setSelectedPersonForDetails(null)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" 
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedPersonForDetails}'s Personal Expenses</h2>
                    <p className="text-blue-100 text-sm mt-1">Items not split among roommates</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(modalFilterSearch || modalFilterStartDate || modalFilterEndDate) && (
                      <button
                        onClick={() => {
                          setModalFilterSearch('');
                          setModalFilterStartDate('');
                          setModalFilterEndDate('');
                        }}
                        className="text-xs text-white/90 hover:text-white font-medium flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors"
                      >
                        <X size={14} />
                        Clear Filters
                      </button>
                    )}
                    <button
                      onClick={() => setShowModalFilters(!showModalFilters)}
                      className="text-xs text-white/90 hover:text-white font-medium flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors"
                    >
                      <Filter size={14} />
                      {showModalFilters ? 'Hide' : 'Show'} Filters
                    </button>
                    <button
                      onClick={() => setSelectedPersonForDetails(null)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Filters Section */}
              {showModalFilters && (
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Search size={16} className="text-gray-400" />
                        Search
                      </label>
                      <input
                        type="text"
                        value={modalFilterSearch}
                        onChange={(e) => setModalFilterSearch(e.target.value)}
                        placeholder="Search by item, amount, type..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={modalFilterStartDate ? formatDateToYYYYMMDD(modalFilterStartDate) : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value) {
                            setModalFilterStartDate(formatDateToDDMMYYYY(value));
                          } else {
                            setModalFilterStartDate('');
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        End Date
                      </label>
                      <input
                        type="date"
                        value={modalFilterEndDate ? formatDateToYYYYMMDD(modalFilterEndDate) : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value) {
                            setModalFilterEndDate(formatDateToDDMMYYYY(value));
                          } else {
                            setModalFilterEndDate('');
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="overflow-y-auto flex-1 p-6 space-y-4">
                {/* Summary Card */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-600 mb-1">Total Personal Expenses</p>
                      <p className="text-2xl font-bold text-blue-900">₹{personTotal.toFixed(2)}</p>
                      {(modalFilterSearch || modalFilterStartDate || modalFilterEndDate) && (
                        <p className="text-xs text-gray-500 mt-1">
                          Showing {personPersonalExpenses.length} of {allPersonPersonalExpenses.length} expense(s)
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-blue-600">{personPersonalExpenses.length} item{personPersonalExpenses.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>

                {/* Expenses List */}
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {personPersonalExpenses.length > 0 ? (
                    personPersonalExpenses.map((expense) => {
                    const itemMatch = expense.note?.match(/Item:\s*(.+?)(?:\s*-|$)/i);
                    const itemName = itemMatch ? itemMatch[1].trim() : (expense.note || expense.type);
                    const additionalNote = expense.note && itemMatch ? expense.note.replace(itemMatch[0], '').trim() : '';
                    
                    return (
                      <div key={expense.id} className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Receipt size={18} className="text-blue-600" />
                              <span className="text-lg font-bold text-gray-900">{itemName}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                              <span>{expense.date}</span>
                              <span>•</span>
                              <span>{expense.paymode}</span>
                              <span>•</span>
                              <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">
                                {expense.type}
                              </span>
                            </div>
                            {additionalNote && (
                              <div className="text-xs text-gray-400 italic mt-2">{additionalNote}</div>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <span className="text-2xl font-bold text-blue-900">₹{expense.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                    })
                  ) : (modalFilterSearch || modalFilterStartDate || modalFilterEndDate) ? (
                    <div className="text-center py-8 text-gray-500">
                      <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
                      <p>No expenses match the current filters</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
                      <p>No personal expenses found for {selectedPersonForDetails}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default SummaryStats;
