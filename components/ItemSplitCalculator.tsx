import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Calculator, ShoppingBag, ArrowRight, X, Filter, Search, Calendar } from 'lucide-react';
import { SharedPurchase, Roommate, ExpenseType, PayMode } from '../types';
import { formatDateToDDMMYYYY, formatDateToYYYYMMDD, isDateInRange } from '../utils/dateUtils';

interface ItemSplitCalculatorProps {
  roommates: Roommate[];
  purchases: SharedPurchase[];
  onAddPurchase: (purchase: Omit<SharedPurchase, 'id'>) => void;
  onDeletePurchase: (id: string) => void;
  onAddExpense?: (expense: any) => void; // Optional: to add to expenses if buyer === payer
}

const ItemSplitCalculator: React.FC<ItemSplitCalculatorProps> = ({
  roommates,
  purchases,
  onAddPurchase,
  onDeletePurchase,
  onAddExpense,
}) => {
  const [itemName, setItemName] = useState('');
  const [amount, setAmount] = useState('');
  const [buyer, setBuyer] = useState('');
  const [payer, setPayer] = useState('');
  const [date, setDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [paymode, setPaymode] = useState<PayMode>(PayMode.UPI);
  const [note, setNote] = useState('');
  const [splitBetween, setSplitBetween] = useState<string[]>([]);
  
  // Filter states
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all'); // 'all', 'split', 'non-split'
  const [showFilters, setShowFilters] = useState(false);

  // Convert dates for filtering (convert DD-MM-YYYY to YYYY-MM-DD for input)
  const startDateInput = startDate ? formatDateToYYYYMMDD(startDate) : '';
  const endDateInput = endDate ? formatDateToYYYYMMDD(endDate) : '';

  // Filter purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => {
      // Date range filter
      const purchaseDate = formatDateToDDMMYYYY(purchase.date);
      if (!isDateInRange(purchaseDate, startDate || null, endDate || null)) {
        return false;
      }

      // Search filter
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

      // Filter by split type
      if (filterType === 'split' && (!purchase.splitBetween || purchase.splitBetween.length === 0)) {
        return false;
      }
      if (filterType === 'non-split' && purchase.splitBetween && purchase.splitBetween.length > 0) {
        return false;
      }

      return true;
    });
  }, [purchases, startDate, endDate, searchQuery, filterType]);

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
    setFilterType('all');
  };

  const hasActiveFilters = startDate || endDate || searchQuery || filterType !== 'all';

  // Calculate settlements
  const calculateSettlements = () => {
    const debts: Map<string, Map<string, number>> = new Map();

    filteredPurchases.forEach((purchase) => {
      // Calculate the amount each person owes
      let amountPerPerson = purchase.amount;
      let splitCount = 1;
      
      // If split is enabled, calculate per person amount
      if (purchase.splitBetween && purchase.splitBetween.length > 0) {
        splitCount = purchase.splitBetween.length;
        amountPerPerson = purchase.perPersonAmount || (purchase.amount / splitCount);
      }

      // If split is enabled, each person in splitBetween owes their share to the payer
      if (purchase.splitBetween && purchase.splitBetween.length > 0) {
        purchase.splitBetween.forEach((personName) => {
          // If this person is not the payer, they owe their share
          if (personName !== purchase.payer) {
            if (!debts.has(personName)) {
              debts.set(personName, new Map());
            }
            const personDebts = debts.get(personName)!;
            const currentDebt = personDebts.get(purchase.payer) || 0;
            personDebts.set(purchase.payer, currentDebt + amountPerPerson);
          }
        });
      } else if (purchase.buyer !== purchase.payer) {
        // Original logic: Buyer owes payer the full amount if no split
        if (!debts.has(purchase.buyer)) {
          debts.set(purchase.buyer, new Map());
        }
        const buyerDebts = debts.get(purchase.buyer)!;
        const currentDebt = buyerDebts.get(purchase.payer) || 0;
        buyerDebts.set(purchase.payer, currentDebt + purchase.amount);
      }
    });

    // Convert to settlement instructions
    const instructions: Array<{ from: string; to: string; amount: number; items: string[] }> = [];
    const itemMap: Map<string, Map<string, string[]>> = new Map();

    filteredPurchases.forEach((purchase) => {
      let amountPerPerson = purchase.amount;
      let splitCount = 1;
      
      if (purchase.splitBetween && purchase.splitBetween.length > 0) {
        splitCount = purchase.splitBetween.length;
        amountPerPerson = purchase.perPersonAmount || (purchase.amount / splitCount);
      }

      if (purchase.splitBetween && purchase.splitBetween.length > 0) {
        purchase.splitBetween.forEach((personName) => {
          if (personName !== purchase.payer) {
            if (!itemMap.has(personName)) {
              itemMap.set(personName, new Map());
            }
            const personItems = itemMap.get(personName)!;
            if (!personItems.has(purchase.payer)) {
              personItems.set(purchase.payer, []);
            }
            personItems.get(purchase.payer)!.push(purchase.itemName);
          }
        });
      } else if (purchase.buyer !== purchase.payer) {
        if (!itemMap.has(purchase.buyer)) {
          itemMap.set(purchase.buyer, new Map());
        }
        const buyerItems = itemMap.get(purchase.buyer)!;
        if (!buyerItems.has(purchase.payer)) {
          buyerItems.set(purchase.payer, []);
        }
        buyerItems.get(purchase.payer)!.push(purchase.itemName);
      }
    });

    debts.forEach((buyerDebts, buyerName) => {
      buyerDebts.forEach((totalAmount, payerName) => {
        const items = itemMap.get(buyerName)?.get(payerName) || [];
        instructions.push({
          from: buyerName,
          to: payerName,
          amount: totalAmount,
          items: items,
        });
      });
    });

    return instructions;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    if (!itemName.trim() || !amount || !buyer || !payer) {
      alert('Please fill all required fields');
      return;
    }

    // Validate amount is positive
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    // Calculate per person amount if split is enabled
    let perPersonAmount: number | undefined = undefined;
    if (splitBetween.length > 0) {
      perPersonAmount = parseFloat((amountNum / splitBetween.length).toFixed(2));
    }

    const purchase: Omit<SharedPurchase, 'id'> = {
      itemName: itemName.trim(),
      amount: parseFloat(amount),
      buyer,
      payer,
      date: formatDateToDDMMYYYY(date),
      paymode,
      note: note.trim() || undefined,
      splitBetween: splitBetween.length > 0 ? splitBetween : undefined,
      perPersonAmount: perPersonAmount,
    };

    onAddPurchase(purchase);

    // If buyer and payer are the same, also add to expenses
    // IMPORTANT: Only do this when there is NO custom split selected.
    // Because expenses are split across ALL roommates in SettlementMatrix (m),
    // while Item Split should split ONLY among selected people.
    if (buyer === payer && onAddExpense && splitBetween.length === 0) {
      const expense = {
        name: buyer,
        type: ExpenseType.OTHER,
        amount: parseFloat(amount),
        date: formatDateToDDMMYYYY(date),
        paymode,
        note: `Item: ${itemName.trim()}${note.trim() ? ` - ${note.trim()}` : ''}`,
      };
      onAddExpense(expense);
    }
    
    // Reset form
    setItemName('');
    setAmount('');
    setBuyer('');
    setPayer('');
    setNote('');
    setSplitBetween([]);
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setDate(`${year}-${month}-${day}`);
  };

  const settlements = calculateSettlements();
  const totalAmount = filteredPurchases.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Calculator size={28} className="text-indigo-100" />
          <h2 className="text-2xl font-bold">Item Split Calculator</h2>
        </div>
        <p className="text-indigo-100 text-sm">
          Track shared purchases where buyer and payer are different
        </p>
      </div>

      {/* Form */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ShoppingBag size={20} className="text-indigo-600" />
          Add New Item Purchase
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g., Rice, Flour, Sugar, Facewash"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buyer (Who bought) <span className="text-red-500">*</span>
              </label>
              <select
                value={buyer}
                onChange={(e) => setBuyer(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Select buyer</option>
                {roommates.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payer (Who paid) <span className="text-red-500">*</span>
              </label>
              <select
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Select payer</option>
                {roommates.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pay Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={paymode}
                onChange={(e) => setPaymode(e.target.value as PayMode)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                {Object.values(PayMode).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Additional notes"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Split Between (Optional - Select people to split this item)
              </label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {roommates.map((roommate) => (
                    <label
                      key={roommate.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                        splitBetween.includes(roommate.name)
                          ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={splitBetween.includes(roommate.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSplitBetween([...splitBetween, roommate.name]);
                          } else {
                            setSplitBetween(splitBetween.filter(name => name !== roommate.name));
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="font-medium">{roommate.name}</span>
                    </label>
                  ))}
                </div>
                {splitBetween.length > 0 && amount && !isNaN(parseFloat(amount)) && (
                  <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="text-sm text-indigo-700">
                      <span className="font-medium">Split Details:</span> ₹{parseFloat(amount).toFixed(2)} ÷ {splitBetween.length} = 
                      <span className="font-bold text-indigo-900 ml-1">
                        ₹{(parseFloat(amount) / splitBetween.length).toFixed(2)} per person
                      </span>
                    </div>
                    <div className="text-xs text-indigo-600 mt-1">
                      Split between: {splitBetween.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <Plus size={20} />
            Add Purchase
          </button>
        </form>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Filter size={20} className="text-indigo-600" />
            Filters
          </h3>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <X size={14} />
                Clear Filters
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            {/* Search Filter */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Search size={16} className="text-gray-400" />
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by item, buyer, payer, amount..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Start Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                Start Date
              </label>
              <input
                type="date"
                value={startDateInput}
                onChange={handleStartDateChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                End Date
              </label>
              <input
                type="date"
                value={endDateInput}
                onChange={handleEndDateChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Filter Type */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Items</option>
                <option value="split">Split Items Only</option>
                <option value="non-split">Non-Split Items Only</option>
              </select>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              Showing {filteredPurchases.length} of {purchases.length} purchase(s)
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Total Items</div>
          <div className="text-2xl font-bold text-blue-900">{filteredPurchases.length}</div>
          {hasActiveFilters && (
            <div className="text-xs text-blue-500 mt-1">of {purchases.length} total</div>
          )}
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-200">
          <div className="text-sm text-green-600 font-medium">Total Amount</div>
          <div className="text-2xl font-bold text-green-900">₹{totalAmount.toFixed(2)}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
          <div className="text-sm text-purple-600 font-medium">Settlements</div>
          <div className="text-2xl font-bold text-purple-900">{settlements.length}</div>
        </div>
      </div>

      {/* Purchases List */}
      {filteredPurchases.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            All Purchases
            {hasActiveFilters && (
              <span className="text-sm text-gray-500 font-normal ml-2">
                ({filteredPurchases.length} of {purchases.length})
              </span>
            )}
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {filteredPurchases.map((purchase) => (
              <div
                key={purchase.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-gray-900">{purchase.itemName}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-indigo-600 font-semibold">₹{purchase.amount.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Bought by:</span> {purchase.buyer}
                    {purchase.buyer !== purchase.payer && (
                      <>
                        {' • '}
                        <span className="font-medium">Paid by:</span> {purchase.payer}
                      </>
                    )}
                    {' • '}
                    <span className="font-medium">Date:</span> {purchase.date}
                    {' • '}
                    <span className="font-medium">Pay Mode:</span> {purchase.paymode}
                  </div>
                  {purchase.splitBetween && purchase.splitBetween.length > 0 && (
                    <div className="mt-2 p-2 bg-indigo-50 rounded border border-indigo-200">
                      <div className="text-sm text-indigo-700">
                        <span className="font-medium">Split:</span> ₹{purchase.perPersonAmount?.toFixed(2) || (purchase.amount / purchase.splitBetween.length).toFixed(2)} per person
                        {' • '}
                        <span className="font-medium">Between:</span> {purchase.splitBetween.join(', ')}
                      </div>
                    </div>
                  )}
                  {purchase.note && (
                    <div className="text-xs text-gray-500 mt-1">Note: {purchase.note}</div>
                  )}
                </div>
                <button
                  onClick={() => onDeletePurchase(purchase.id)}
                  className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete purchase"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settlement Instructions */}
      {settlements.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calculator size={20} className="text-indigo-600" />
            Settlement Instructions
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {settlements.map((settlement, idx) => (
              <div
                key={idx}
                className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{settlement.from}</span>
                    <ArrowRight size={16} className="text-indigo-600" />
                    <span className="font-bold text-gray-900">{settlement.to}</span>
                  </div>
                  <span className="font-mono font-bold text-rose-600 text-lg">
                    ₹{settlement.amount.toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Items:</span> {settlement.items.join(', ')}
                </div>
                <div className="mt-2 text-xs text-gray-500 italic">
                  {settlement.from} needs to pay {settlement.to} ₹{settlement.amount.toFixed(2)} for: {settlement.items.join(', ')}
                </div>
                {/* Show split details if applicable */}
                {(() => {
                  const relatedPurchases = purchases.filter(p => 
                    settlement.items.includes(p.itemName) && 
                    p.splitBetween && 
                    p.splitBetween.includes(settlement.from)
                  );
                  if (relatedPurchases.length > 0) {
                    const splitInfo = relatedPurchases.map(p => {
                      const perPerson = p.perPersonAmount || (p.amount / (p.splitBetween?.length || 1));
                      return `${p.itemName} (₹${perPerson.toFixed(2)} each)`;
                    });
                    return (
                      <div className="mt-1 text-xs text-indigo-600">
                        Split details: {splitInfo.join(', ')}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredPurchases.length === 0 && (
        <div className="bg-gray-50 p-12 rounded-xl border-2 border-dashed border-gray-300 text-center">
          <ShoppingBag size={48} className="mx-auto text-gray-400 mb-4" />
          {purchases.length === 0 ? (
            <>
              <p className="text-gray-600 font-medium">No purchases added yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Add your first item purchase above to get started
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-600 font-medium">No purchases match the current filters</p>
              <p className="text-sm text-gray-500 mt-2">
                Try adjusting your search or date filters
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  Clear Filters
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemSplitCalculator;

