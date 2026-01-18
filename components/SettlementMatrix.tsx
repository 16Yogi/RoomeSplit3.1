import React, { useState, useMemo } from 'react';
import { Roommate, Expense, ExpenseType, PayMode, SharedPurchase } from '../types';
import { CheckCircle2, Circle, ArrowRight, CreditCard, Send, TrendingUp, Calendar, ChevronDown, ChevronUp, Filter, X, User, XCircle, Users, Search } from 'lucide-react';
import { formatDateToDDMMYYYY, formatDateToYYYYMMDD, isDateInRange, getUniqueMonths, filterExpensesByMonth, getMonthYear } from '../utils/dateUtils';

interface SettlementMatrixProps {
  roommates: Roommate[];
  expenses: Expense[];
  sharedPurchases?: SharedPurchase[];
  paidRoommateIds: string[];
  onTogglePaid: (id: string) => void;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  fixedCosts: number;
}

const SettlementMatrix: React.FC<SettlementMatrixProps> = ({ roommates, expenses, sharedPurchases = [], paidRoommateIds, onTogglePaid, onAddExpense, fixedCosts }) => {
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [paymentFilterSearch, setPaymentFilterSearch] = useState<string>('');
  const [paymentFilterTo, setPaymentFilterTo] = useState<string>('all');
  const [paymentFilterStartDate, setPaymentFilterStartDate] = useState<string>('');
  const [paymentFilterEndDate, setPaymentFilterEndDate] = useState<string>('');
  const [showPaymentFilters, setShowPaymentFilters] = useState(false);
  const [receiveFilterSearch, setReceiveFilterSearch] = useState<string>('');
  const [receiveFilterFrom, setReceiveFilterFrom] = useState<string>('all');
  const [showReceiveFilters, setShowReceiveFilters] = useState(false);

  if (roommates.length === 0) return <div className="p-8 text-center text-gray-500 text-lg italic">Add roommates to see the settlement matrix.</div>;

  const m = roommates.length;

  // --- Helper Functions for Deduplication ---

  const getLikelyItemSplitKeys = (purchaseList: SharedPurchase[]) => {
    const keys = new Set<string>();
    purchaseList.forEach(p => {
      // Key format: PayerName|Amount|ItemName
      keys.add(`${p.payer}|${p.amount.toFixed(2)}|${p.itemName.toLowerCase()}`);
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

  // ------------------------------------------

  // Calculate settlements for given expenses and shared purchases
  const calculateSettlements = (expenseList: Expense[], purchaseList: SharedPurchase[] = []) => {
    const spendingMap = new Map<string, number>();
    const spendingDisplayMap = new Map<string, number>();
    const paymentsMap = new Map<string, number>();
    
    roommates.forEach(r => {
      spendingMap.set(r.name, 0);
      spendingDisplayMap.set(r.name, 0);
    });

    const itemSplitExpenseKeys = getLikelyItemSplitKeys(purchaseList);

    // Process regular expenses
    expenseList.forEach(e => {
      if (e.type !== ExpenseType.SETTLEMENT) {
        // If this expense is a duplicate of a Shared Purchase, SKIP IT entirely.
        // We rely on the purchaseList loop to add it to the Display Map (Variable Spent)
        // and the Debt Map (Shared Debts). This prevents double counting.
        if (isExpenseDuplicate(e, itemSplitExpenseKeys)) {
          return;
        }

        // Standard Shared Expense (Split by All)
        spendingMap.set(e.name, (spendingMap.get(e.name) || 0) + e.amount);
        spendingDisplayMap.set(e.name, (spendingDisplayMap.get(e.name) || 0) + e.amount);
      } else {
        // Handle Settlements
        let to = e.to;
        if (!to) {
          const match = e.note?.match(/Settlement payment to (.+)/);
          to = match ? match[1] : undefined;
        }
        if (to) {
          const key = `${e.name}-${to}`;
          paymentsMap.set(key, (paymentsMap.get(key) || 0) + e.amount);
        }
      }
    });

    // Process shared purchases (Specific Debts & Variable Spent)
    const sharedPurchaseDebts = new Map<string, number>();
    purchaseList.forEach(purchase => {
      // Always add to display map so the payer sees their total spend (Variable Spent).
      spendingDisplayMap.set(purchase.payer, (spendingDisplayMap.get(purchase.payer) || 0) + purchase.amount);

      if (purchase.splitBetween && purchase.splitBetween.length > 0) {
        const splitCount = purchase.splitBetween.length;
        const perPerson = purchase.perPersonAmount ?? (purchase.amount / splitCount);

        purchase.splitBetween.forEach(personName => {
          if (personName !== purchase.payer) {
            const debtKey = `${personName}-${purchase.payer}`;
            sharedPurchaseDebts.set(debtKey, (sharedPurchaseDebts.get(debtKey) || 0) + perPerson);
          }
        });
        return;
      }

      // Legacy direct-debt
      if (purchase.buyer !== purchase.payer) {
        const debtKey = `${purchase.buyer}-${purchase.payer}`;
        sharedPurchaseDebts.set(debtKey, (sharedPurchaseDebts.get(debtKey) || 0) + purchase.amount);
      }
    });

    return { purchaseSpending: spendingMap, purchaseSpendingDisplay: spendingDisplayMap, directPayments: paymentsMap, sharedPurchaseDebts };
  };

  // Get unique months from expenses
  const uniqueMonths = useMemo(() => getUniqueMonths(expenses), [expenses]);
  
  // Convert dates for filtering
  const startDateInput = startDate ? formatDateToYYYYMMDD(startDate) : '';
  const endDateInput = endDate ? formatDateToYYYYMMDD(endDate) : '';
  
  // Filter expenses by date range
  const filteredExpenses = useMemo(() => {
    if (!startDate && !endDate) return expenses;
    
    return expenses.filter(expense => {
      const expenseDate = formatDateToDDMMYYYY(expense.date);
      return isDateInRange(expenseDate, startDate || null, endDate || null);
    });
  }, [expenses, startDate, endDate]);

  // Filter shared purchases by date range
  const filteredPurchases = useMemo(() => {
    if (!startDate && !endDate) return sharedPurchases;
    
    return sharedPurchases.filter(purchase => {
      const purchaseDate = formatDateToDDMMYYYY(purchase.date);
      return isDateInRange(purchaseDate, startDate || null, endDate || null);
    });
  }, [sharedPurchases, startDate, endDate]);
  
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

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const hasDateFilter = startDate || endDate;

  // Calculate settlements for filtered expenses and purchases
  const { purchaseSpending, purchaseSpendingDisplay, directPayments, sharedPurchaseDebts } = useMemo(() => {
    return calculateSettlements(filteredExpenses, filteredPurchases);
  }, [filteredExpenses, filteredPurchases, roommates]);

  // Calculate settlements for each month
  const monthlySettlements = useMemo(() => {
    const monthly: Record<string, ReturnType<typeof calculateSettlements>> = {};
    uniqueMonths.forEach(month => {
      const monthExpenses = filterExpensesByMonth<Expense>(expenses, month);
      const monthPurchases = sharedPurchases.filter(purchase => {
        const purchaseMonth = getMonthYear(purchase.date);
        return purchaseMonth === month;
      });
      monthly[month] = calculateSettlements(monthExpenses, monthPurchases);
    });
    return monthly;
  }, [expenses, sharedPurchases, uniqueMonths, roommates]);

  const getDateRangeText = () => {
    if (!hasDateFilter) return 'All Time Settlement';
    if (startDate && endDate) return `Settlement from ${startDate} to ${endDate}`;
    if (startDate) return `Settlement from ${startDate}`;
    if (endDate) return `Settlement until ${endDate}`;
    return 'All Time Settlement';
  };

  const getDebt = (rowName: string, colName: string, spending: Map<string, number>, payments: Map<string, number>, sharedPurchaseDebts?: Map<string, number>) => {
    if (rowName === colName) return 0;

    const jSpent = spending.get(colName) || 0;
    const iSpent = spending.get(rowName) || 0;
    
    const baseDebt = (jSpent / m) - (iSpent / m);

    const iPaidJ = payments.get(`${rowName}-${colName}`) || 0;
    const jPaidI = payments.get(`${colName}-${rowName}`) || 0;

    const sharedDebt = (sharedPurchaseDebts?.get(`${rowName}-${colName}`) || 0) - (sharedPurchaseDebts?.get(`${colName}-${rowName}`) || 0);

    return baseDebt - iPaidJ + jPaidI + sharedDebt;
  };

  const getSettlementInstructions = (
    spending: Map<string, number>, 
    payments: Map<string, number>, 
    sharedDebts?: Map<string, number>, 
    expenseList?: Expense[],
    purchaseList?: SharedPurchase[]
  ) => {
    const inst: { from: string; to: string; amount: number; expenseDetails?: Array<{ type: string; amount: number; totalAmount: number; items?: string[] }> }[] = [];
    
    // Prepare filter keys once
    const splitKeys = getLikelyItemSplitKeys(purchaseList || []);

    for (let i = 0; i < roommates.length; i++) {
      for (let j = 0; j < roommates.length; j++) {
        if (i === j) continue; // Skip diagonal
        
        const debt = getDebt(roommates[i].name, roommates[j].name, spending, payments, sharedDebts);
        
        // Only include positive debts
        if (debt > 0.01) {
          const expenseDetails: Array<{ type: string; amount: number; totalAmount: number; items?: string[] }> = [];
          
          // 1. Details from General Expenses (Split by All)
          if (expenseList) {
            // FILTER: Exclude any expense that is a duplicate of a Shared Purchase
            // This prevents "Personal" items (like facewash) from showing up here
            const colExpenses = expenseList.filter(e => 
              e.name === roommates[j].name && 
              e.type !== ExpenseType.SETTLEMENT &&
              !isExpenseDuplicate(e, splitKeys)
            );
            
            const expensesByType = new Map<string, { totalAmount: number; items: string[] }>();
            colExpenses.forEach(e => {
              const existing = expensesByType.get(e.type) || { totalAmount: 0, items: [] };
              existing.totalAmount += e.amount;
              
              if (e.note) {
                const itemMatch = e.note.match(/Item:\s*(.+?)(?:\s*-|$)/i);
                if (itemMatch) {
                  const itemName = itemMatch[1].trim();
                  if (!existing.items.includes(itemName)) {
                    existing.items.push(itemName);
                  }
                }
              }
              
              expensesByType.set(e.type, existing);
            });
            
            expensesByType.forEach((data, expenseType) => {
              const sharePerPerson = data.totalAmount / m;
              expenseDetails.push({ 
                type: expenseType, 
                amount: sharePerPerson, 
                totalAmount: data.totalAmount,
                items: data.items.length > 0 ? data.items : undefined
              });
            });
          }

          // 2. Details from Specific Shared Purchases (Split Items or Direct)
          if (purchaseList) {
            const creditorName = roommates[j].name;
            const debtorName = roommates[i].name;

            // Iterate through EACH purchase individually to avoid clumping them together
            purchaseList.forEach(p => {
              if (p.payer !== creditorName) return;
              
              let isRelevant = false;
              let shareAmount = 0;

              // Check if debtor owes for this SPECIFIC purchase
              if (p.splitBetween && p.splitBetween.length > 0) {
                 if (p.splitBetween.includes(debtorName) && debtorName !== creditorName) {
                   isRelevant = true;
                   shareAmount = p.perPersonAmount ?? (p.amount / p.splitBetween.length);
                 }
              } else {
                 // Legacy direct debt (Buyer owes Payer)
                 if (p.buyer === debtorName && debtorName !== creditorName) {
                   isRelevant = true;
                   shareAmount = p.amount;
                 }
              }

              if (isRelevant) {
                 expenseDetails.push({
                   type: 'Specific/Split Items', // Or you can change this label if needed
                   amount: shareAmount,
                   totalAmount: p.amount,
                   items: [p.itemName] // Display individual item name
                 });
              }
            });
          }
          
          inst.push({ from: roommates[i].name, to: roommates[j].name, amount: debt, expenseDetails });
        }
      }
    }
    return inst;
  };

  const settlementInstructions = useMemo(() => {
    return getSettlementInstructions(purchaseSpending, directPayments, sharedPurchaseDebts, filteredExpenses, filteredPurchases);
  }, [purchaseSpending, directPayments, sharedPurchaseDebts, roommates, filteredExpenses, filteredPurchases]);

  const handleRecordPayment = (from: string, to: string, defaultAmount: number) => {
    const amountToSubmit = parseFloat(payAmount) || defaultAmount;
    if (amountToSubmit <= 0) return;

    onAddExpense({
      name: from,
      to: to,
      type: ExpenseType.SETTLEMENT,
      amount: amountToSubmit,
      date: new Date().toISOString().split('T')[0],
      paymode: PayMode.UPI,
      note: `Settlement payment to ${to}`
    });
    setRecordingId(null);
    setPayAmount('');
  };

  const toggleMonthExpansion = (month: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedMonths(newExpanded);
  };

  const allSettledCount = roommates.filter(r => paidRoommateIds.includes(r.id)).length;

  const renderMatrix = (
    spending: Map<string, number>,
    spendingDisplay: Map<string, number>,
    payments: Map<string, number>,
    title?: string,
    sharedDebts?: Map<string, number>
  ) => {
    const getDebtForMatrix = (rowName: string, colName: string) => {
      return getDebt(rowName, colName, spending, payments, sharedDebts);
    };

    return (
      <div className="space-y-4">
        {title && (
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <Calendar size={18} />
            <h3 className="font-bold text-lg">{title}</h3>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase tracking-wider text-[10px] bg-white sticky left-0 z-10 border-r">Name</th>
                <th className="px-6 py-4 text-left font-bold text-emerald-600 uppercase tracking-wider text-[10px] border-r">Variable Spent</th>
                {roommates.map(r => (
                  <th key={r.id} className="px-6 py-4 text-center font-bold text-indigo-600 uppercase tracking-wider text-[10px]">
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roommates.map(rowUser => {
                const spent = spendingDisplay.get(rowUser.name) || 0;
                const isPaid = paidRoommateIds.includes(rowUser.id);

                return (
                  <tr key={rowUser.id} className={`transition-colors ${isPaid ? 'bg-emerald-50/20' : 'hover:bg-gray-50'}`}>
                    <td className={`px-6 py-4 font-bold text-gray-900 sticky left-0 bg-white border-r z-10 ${isPaid ? 'text-emerald-700' : ''}`}>
                      {rowUser.name}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600 border-r">
                      ₹{spent.toFixed(2)}
                    </td>
                    {roommates.map(colUser => {
                      const debt = getDebtForMatrix(rowUser.name, colUser.name);
                      const isZero = Math.abs(debt) < 0.01;
                      return (
                        <td key={colUser.id} className="px-6 py-4 text-center whitespace-nowrap">
                          <span className={`font-mono font-bold text-base ${isZero ? 'text-gray-200' : debt > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {isZero ? '0' : (debt > 0 ? `+${debt.toFixed(2)}` : debt.toFixed(2))}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-white space-y-6">
      {/* Date Range Filter */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-indigo-600">
            <Filter size={18} />
            <label className="text-sm font-semibold text-gray-700">Date Range Filter:</label>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-500" />
              <label className="text-xs font-medium text-gray-600">From:</label>
              <input
                type="date"
                value={startDateInput}
                onChange={handleStartDateChange}
                className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Start Date"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-500" />
              <label className="text-xs font-medium text-gray-600">To:</label>
              <input
                type="date"
                value={endDateInput}
                onChange={handleEndDateChange}
                className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="End Date"
              />
            </div>
            
            {hasDateFilter && (
              <button
                onClick={clearDateFilters}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
              >
                <X size={14} />
                Clear Filter
              </button>
            )}
          </div>
        </div>
        
        {hasDateFilter && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              Showing <span className="font-bold text-indigo-600">{filteredExpenses.length}</span> expenses 
              {filteredPurchases.length > 0 && (
                <> and <span className="font-bold text-purple-600">{filteredPurchases.length}</span> shared purchases</>
              )}
              {startDate && endDate && ` from ${startDate} to ${endDate}`}
              {startDate && !endDate && ` from ${startDate}`}
              {!startDate && endDate && ` until ${endDate}`}
            </p>
          </div>
        )}
      </div>

      {/* Current View Matrix */}
      {renderMatrix(purchaseSpending, purchaseSpendingDisplay, directPayments, getDateRangeText(), sharedPurchaseDebts)}

      {/* Monthly Breakdown Section */}
      {uniqueMonths.length > 0 && (
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-600" />
            Month-wise Settlement Breakdown
          </h3>
          <div className="space-y-4">
            {uniqueMonths.map(month => {
              const monthExpenses = filterExpensesByMonth(expenses, month);
              const monthPurchases = sharedPurchases.filter(purchase => {
                const purchaseMonth = getMonthYear(purchase.date);
                return purchaseMonth === month;
              });

              const monthData = monthlySettlements[month];
              const monthInstructions = getSettlementInstructions(
                monthData.purchaseSpending, 
                monthData.directPayments, 
                monthData.sharedPurchaseDebts, 
                monthExpenses,
                monthPurchases
              );
              
              const isExpanded = expandedMonths.has(month);
              const monthTotal = Array.from(monthData.purchaseSpending.values()).reduce((sum: number, val: number) => sum + val, 0);

              return (
                <div key={month} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => toggleMonthExpansion(month)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronUp size={18} className="text-indigo-600" /> : <ChevronDown size={18} className="text-indigo-600" />}
                      <div className="text-left">
                        <div className="font-bold text-gray-900">
                          {monthExpenses.length > 0 && monthExpenses[0]?.date 
                            ? getMonthYear(monthExpenses[0].date, 'text')
                            : getMonthYear(month, 'text')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {monthExpenses.length} expenses • Total: ${(monthTotal as number).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 font-semibold">Settlements</div>
                      <div className="text-sm font-bold text-indigo-600">{monthInstructions.length}</div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 border-t border-gray-100 space-y-4">
                      {renderMatrix(monthData.purchaseSpending, monthData.purchaseSpendingDisplay, monthData.directPayments, undefined, monthData.sharedPurchaseDebts)}
                      
                      {monthInstructions.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-bold text-gray-700 mb-3">Settlement Instructions:</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {monthInstructions.map((inst, idx) => (
                              <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-gray-900">{inst.from}</span>
                                    <ArrowRight size={12} className="text-indigo-400" />
                                    <span className="font-bold text-sm text-gray-900">{inst.to}</span>
                                  </div>
                          <span className="font-mono font-bold text-rose-500 text-sm">₹{inst.amount.toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Settlement Instructions & Direct Pay */}
      <div className="bg-gray-50 p-6 border-t border-gray-200">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-500" />
              Settlement Instructions & Direct Pay ({hasDateFilter ? `${startDate || '...'} to ${endDate || '...'}` : 'All Time'})
            </h3>
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${allSettledCount === m ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
               {allSettledCount} / {m} SETTLED (FIXED COSTS)
            </div>
          </div>

          {/* Roommates List - Click to View Details */}
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Users size={16} className="text-indigo-600" />
              Select Roommate to View Details
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {roommates.map(roommate => {
                const userSettlements = settlementInstructions.filter(inst => inst.from === roommate.name);
                const totalDue = userSettlements.reduce((sum, inst) => sum + inst.amount, 0);
                const isSelected = selectedUser === roommate.name;
                
                return (
                  <button
                    key={roommate.id}
                    onClick={() => setSelectedUser(isSelected ? null : roommate.name)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <User size={18} className={isSelected ? 'text-indigo-600' : 'text-gray-500'} />
                      <span className={`font-bold text-sm ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>
                        {roommate.name}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs text-gray-500 mb-1">Total Due</div>
                      <div className={`font-mono font-bold text-sm ${
                        totalDue > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        ₹{totalDue.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {userSettlements.length} payment{userSettlements.length !== 1 ? 's' : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Debt Summary Modal */}
          {selectedUser && (() => {
            // Get all settlement instructions where this user is the "from" (owes money)
            const userSettlements = settlementInstructions.filter(inst => inst.from === selectedUser);
            const totalAmount = userSettlements.reduce((sum, inst) => sum + inst.amount, 0);
            
            // Also get what others owe to this user
            const owedToUser = settlementInstructions.filter(inst => inst.to === selectedUser);
            const totalOwed = owedToUser.reduce((sum, inst) => sum + inst.amount, 0);
            
            return (
              <div className="bg-white p-6 rounded-xl border-2 border-indigo-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <User size={20} className="text-indigo-600" />
                    <h4 className="text-lg font-bold text-gray-900">Payment Details for {selectedUser}</h4>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XCircle size={20} />
                  </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
                    <div className="text-xs text-rose-600 font-semibold uppercase mb-1">Total Due (Owes)</div>
                    <div className="font-mono font-bold text-rose-600 text-2xl">₹{totalAmount.toFixed(2)}</div>
                    <div className="text-xs text-gray-600 mt-1">{userSettlements.length} payment{userSettlements.length !== 1 ? 's' : ''} to make</div>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                    <div className="text-xs text-emerald-600 font-semibold uppercase mb-1">Total Owed (Receiving)</div>
                    <div className="font-mono font-bold text-emerald-600 text-2xl">₹{totalOwed.toFixed(2)}</div>
                    <div className="text-xs text-gray-600 mt-1">{owedToUser.length} payment{owedToUser.length !== 1 ? 's' : ''} to receive</div>
                  </div>
                </div>

                {userSettlements.length > 0 ? (
                  <>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                          <ArrowRight size={16} className="text-rose-500" />
                          Payments {selectedUser} Needs to Make:
                        </h5>
                        <div className="flex items-center gap-2">
                          {(paymentFilterSearch || paymentFilterTo !== 'all' || paymentFilterStartDate || paymentFilterEndDate) && (
                            <button
                              onClick={() => {
                                setPaymentFilterSearch('');
                                setPaymentFilterTo('all');
                                setPaymentFilterStartDate('');
                                setPaymentFilterEndDate('');
                              }}
                              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                            >
                              <X size={14} />
                              Clear Filters
                            </button>
                          )}
                          <button
                            onClick={() => setShowPaymentFilters(!showPaymentFilters)}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                          >
                            <Filter size={14} />
                            {showPaymentFilters ? 'Hide' : 'Show'} Filters
                          </button>
                        </div>
                      </div>

                      {/* Filters Section */}
                      {showPaymentFilters && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                <Search size={16} className="text-gray-400" />
                                Search
                              </label>
                              <input
                                type="text"
                                value={paymentFilterSearch}
                                onChange={(e) => setPaymentFilterSearch(e.target.value)}
                                placeholder="Search by person, amount, items..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Filter by Person to Pay
                              </label>
                              <select
                                value={paymentFilterTo}
                                onChange={(e) => setPaymentFilterTo(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                              >
                                <option value="all">All People</option>
                                {roommates.map((r) => (
                                  <option key={r.id} value={r.name}>
                                    {r.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                <Calendar size={16} className="text-gray-400" />
                                Start Date
                              </label>
                              <input
                                type="date"
                                value={paymentFilterStartDate ? formatDateToYYYYMMDD(paymentFilterStartDate) : ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value) {
                                    setPaymentFilterStartDate(formatDateToDDMMYYYY(value));
                                  } else {
                                    setPaymentFilterStartDate('');
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
                                value={paymentFilterEndDate ? formatDateToYYYYMMDD(paymentFilterEndDate) : ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value) {
                                    setPaymentFilterEndDate(formatDateToDDMMYYYY(value));
                                  } else {
                                    setPaymentFilterEndDate('');
                                  }
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Filtered and Scrollable Payments List */}
                      {(() => {
                        const filteredSettlements = userSettlements.filter((inst) => {
                          // Filter by person to pay
                          if (paymentFilterTo !== 'all' && inst.to !== paymentFilterTo) {
                            return false;
                          }

                          // Date filter - check if any related expenses/purchases fall in date range
                          if (paymentFilterStartDate || paymentFilterEndDate) {
                            const creditorName = inst.to;
                            let hasDateMatch = false;

                            // Check expenses by the creditor that fall in date range
                            const matchingExpenses = expenses.filter(e => 
                              e.name === creditorName && 
                              e.type !== ExpenseType.SETTLEMENT &&
                              isDateInRange(
                                formatDateToDDMMYYYY(e.date),
                                paymentFilterStartDate || null,
                                paymentFilterEndDate || null
                              )
                            );

                            // Check purchases where payer is the creditor that fall in date range
                            const matchingPurchases = sharedPurchases.filter(p => 
                              p.payer === creditorName &&
                              isDateInRange(
                                formatDateToDDMMYYYY(p.date),
                                paymentFilterStartDate || null,
                                paymentFilterEndDate || null
                              )
                            );

                            hasDateMatch = matchingExpenses.length > 0 || matchingPurchases.length > 0;

                            if (!hasDateMatch) {
                              return false;
                            }
                          }

                          // Search filter
                          if (paymentFilterSearch) {
                            const query = paymentFilterSearch.toLowerCase();
                            const matchesTo = inst.to.toLowerCase().includes(query);
                            const matchesAmount = inst.amount.toString().includes(query);
                            const matchesItems = inst.expenseDetails?.some(detail => 
                              detail.items?.some(item => item.toLowerCase().includes(query))
                            ) || false;
                            const matchesType = inst.expenseDetails?.some(detail => 
                              detail.type.toLowerCase().includes(query)
                            ) || false;

                            if (!matchesTo && !matchesAmount && !matchesItems && !matchesType) {
                              return false;
                            }
                          }

                          return true;
                        });

                        return (
                          <>
                            {filteredSettlements.length === 0 && (paymentFilterSearch || paymentFilterTo !== 'all' || paymentFilterStartDate || paymentFilterEndDate) ? (
                              <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-gray-500 text-sm">No payments match the current filters</p>
                                <button
                                  onClick={() => {
                                    setPaymentFilterSearch('');
                                    setPaymentFilterTo('all');
                                    setPaymentFilterStartDate('');
                                    setPaymentFilterEndDate('');
                                  }}
                                  className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                  Clear Filters
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {filteredSettlements.map((inst, idx) => (
                          <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 transition-all">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                  <span className="font-bold text-indigo-600 text-sm">{idx + 1}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 text-lg">{inst.from}</span>
                                  <ArrowRight size={18} className="text-indigo-500" />
                                  <span className="font-bold text-gray-900 text-lg">{inst.to}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Amount</div>
                                <div className="font-mono font-bold text-rose-600 text-xl">₹{inst.amount.toFixed(2)}</div>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-600 mb-2">
                                <span className="font-semibold">{inst.from}</span> needs to pay <span className="font-semibold">{inst.to}</span> <span className="font-bold text-rose-600">₹{inst.amount.toFixed(2)}</span>
                              </p>
                              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                <div className="font-semibold mb-1">This amount includes:</div>
                                <div className="space-y-1">
                                  {inst.expenseDetails && inst.expenseDetails.length > 0 ? (
                                    inst.expenseDetails.map((detail, detailIdx) => (
                                      <div key={detailIdx}>
                                        • <span className="font-medium">{detail.type}</span>
                                        {detail.items && detail.items.length > 0 && (
                                          <span className="text-gray-500"> ({detail.items.join(', ')})</span>
                                        )}
                                        : ₹{detail.amount.toFixed(2)} (from ₹{detail.totalAmount.toFixed(2)})
                                      </div>
                                    ))
                                  ) : (
                                    <div>• Share of {inst.to}'s expenses</div>
                                  )}
                                  {/* <div>• Item Split Calculator purchases (if any)</div> */}
                                  <div>• Adjusted for any settlements already made</div>
                                </div>
                              </div>
                            </div>
                          </div>
                                ))}
                              </div>
                            )}
                            {(paymentFilterSearch || paymentFilterTo !== 'all' || paymentFilterStartDate || paymentFilterEndDate) && (
                              <div className="mt-2 text-xs text-gray-600">
                                Showing {filteredSettlements.length} of {userSettlements.length} payment(s)
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 bg-emerald-50 rounded-lg border border-emerald-200">
                    <CheckCircle2 size={32} className="text-emerald-600 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium">
                      {selectedUser} has no pending payments to make
                    </p>
                  </div>
                )}

                {owedToUser.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                        <ArrowRight size={16} className="text-emerald-500 rotate-180" />
                        Payments {selectedUser} Will Receive:
                      </h5>
                      <div className="flex items-center gap-2">
                        {(receiveFilterSearch || receiveFilterFrom !== 'all') && (
                          <button
                            onClick={() => {
                              setReceiveFilterSearch('');
                              setReceiveFilterFrom('all');
                            }}
                            className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                          >
                            <X size={14} />
                            Clear Filters
                          </button>
                        )}
                        <button
                          onClick={() => setShowReceiveFilters(!showReceiveFilters)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                        >
                          <Filter size={14} />
                          {showReceiveFilters ? 'Hide' : 'Show'} Filters
                        </button>
                      </div>
                    </div>

                    {/* Filters Section */}
                    {showReceiveFilters && (
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                              <Search size={16} className="text-gray-400" />
                              Search
                            </label>
                            <input
                              type="text"
                              value={receiveFilterSearch}
                              onChange={(e) => setReceiveFilterSearch(e.target.value)}
                              placeholder="Search by person, amount, items..."
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Filter by Person Paying
                            </label>
                            <select
                              value={receiveFilterFrom}
                              onChange={(e) => setReceiveFilterFrom(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            >
                              <option value="all">All People</option>
                              {roommates.map((r) => (
                                <option key={r.id} value={r.name}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Filtered and Scrollable Payments List */}
                    {(() => {
                      const filteredReceives = owedToUser.filter((inst) => {
                        // Filter by person paying
                        if (receiveFilterFrom !== 'all' && inst.from !== receiveFilterFrom) {
                          return false;
                        }

                        // Search filter
                        if (receiveFilterSearch) {
                          const query = receiveFilterSearch.toLowerCase();
                          const matchesFrom = inst.from.toLowerCase().includes(query);
                          const matchesAmount = inst.amount.toString().includes(query);
                          const matchesItems = inst.expenseDetails?.some(detail => 
                            detail.items?.some(item => item.toLowerCase().includes(query))
                          ) || false;
                          const matchesType = inst.expenseDetails?.some(detail => 
                            detail.type.toLowerCase().includes(query)
                          ) || false;

                          if (!matchesFrom && !matchesAmount && !matchesItems && !matchesType) {
                            return false;
                          }
                        }

                        return true;
                      });

                      return (
                        <>
                          {filteredReceives.length === 0 && (receiveFilterSearch || receiveFilterFrom !== 'all') ? (
                            <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-gray-500 text-sm">No payments match the current filters</p>
                              <button
                                onClick={() => {
                                  setReceiveFilterSearch('');
                                  setReceiveFilterFrom('all');
                                }}
                                className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                              >
                                Clear Filters
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                              {filteredReceives.map((inst, idx) => (
                        <div key={idx} className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 hover:border-emerald-300 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                <span className="font-bold text-emerald-600 text-sm">{idx + 1}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-lg">{inst.from}</span>
                                <ArrowRight size={18} className="text-emerald-500" />
                                <span className="font-bold text-gray-900 text-lg">{inst.to}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Amount</div>
                              <div className="font-mono font-bold text-emerald-600 text-xl">₹{inst.amount.toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-emerald-200">
                            <p className="text-xs text-gray-600 mb-2">
                              <span className="font-semibold">{inst.from}</span> will pay <span className="font-semibold">{inst.to}</span> <span className="font-bold text-emerald-600">₹{inst.amount.toFixed(2)}</span>
                            </p>
                            <div className="text-xs text-gray-500 bg-emerald-50 p-2 rounded">
                              <div className="font-semibold mb-1">This amount includes:</div>
                              <div className="space-y-1">
                                {inst.expenseDetails && inst.expenseDetails.length > 0 ? (
                                  inst.expenseDetails.map((detail, detailIdx) => (
                                    <div key={detailIdx}>
                                      • <span className="font-medium">{detail.type}</span>
                                      {detail.items && detail.items.length > 0 && (
                                        <span className="text-gray-500"> ({detail.items.join(', ')})</span>
                                      )}
                                      : ₹{detail.amount.toFixed(2)} (from ₹{detail.totalAmount.toFixed(2)})
                                    </div>
                                  ))
                                ) : (
                                  <div>• Share of your expenses</div>
                                )}
                                {/* <div>• Item Split Calculator purchases (if any)</div> */}
                                <div>• Adjusted for any settlements already made</div>
                              </div>
                            </div>
                          </div>
                        </div>
                              ))}
                            </div>
                          )}
                          {(receiveFilterSearch || receiveFilterFrom !== 'all') && (
                            <div className="mt-2 text-xs text-gray-600">
                              Showing {filteredReceives.length} of {owedToUser.length} payment(s)
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {settlementInstructions.length > 0 ? (
              settlementInstructions.map((inst, idx) => {
                const isRecording = recordingId === `${inst.from}-${inst.to}`;
                return (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 group hover:border-indigo-200 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setSelectedUser(inst.from)}
                          className="font-bold text-gray-900 hover:text-indigo-600 hover:underline transition-colors cursor-pointer"
                          title={`View all debts for ${inst.from}`}
                        >
                          {inst.from}
                        </button>
                        <ArrowRight size={14} className="text-indigo-400" />
                        <button
                          onClick={() => setSelectedUser(inst.to)}
                          className="font-bold text-gray-900 hover:text-indigo-600 hover:underline transition-colors cursor-pointer"
                          title={`View all debts for ${inst.to}`}
                        >
                          {inst.to}
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Debt</div>
                        <div className="font-mono font-bold text-rose-500">₹{inst.amount.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                      <div className="font-semibold text-gray-700 mb-1">This amount includes:</div>
                      <div className="space-y-0.5 text-gray-600">
                        {inst.expenseDetails && inst.expenseDetails.length > 0 ? (
                          inst.expenseDetails.map((detail, detailIdx) => (
                            <div key={detailIdx}>
                              • <span className="font-medium">{detail.type}</span>
                              {detail.items && detail.items.length > 0 && (
                                <span className="text-gray-500"> ({detail.items.join(', ')})</span>
                              )}
                              : ₹{detail.amount.toFixed(2)} (from ₹{detail.totalAmount.toFixed(2)})
                            </div>
                          ))
                        ) : (
                          <div>• Share of {inst.to}'s expenses</div>
                        )}
                        {/* <div>• Item Split purchases (if any)</div> */}
                        {/* <div>• Adjusted for settlements made</div> */}
                      </div>
                    </div>

                    {!isRecording ? (
                      <button 
                        onClick={() => {
                          setRecordingId(`${inst.from}-${inst.to}`);
                          setPayAmount(inst.amount.toFixed(2));
                        }}
                        className="w-full py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <CreditCard size={14} />
                        PAY NOW
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                          <input 
                            autoFocus
                            type="number" 
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            className="w-full pl-6 pr-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Amount"
                          />
                        </div>
                        <button 
                          onClick={() => handleRecordPayment(inst.from, inst.to, inst.amount)}
                          className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <Send size={14} />
                        </button>
                        <button 
                          onClick={() => setRecordingId(null)}
                          className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"
                        >
                          <Circle size={14} className="rotate-45" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-6 text-gray-400 text-sm italic border-2 border-dashed border-gray-200 rounded-xl">
                The group is perfectly settled. No pending payments.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettlementMatrix;