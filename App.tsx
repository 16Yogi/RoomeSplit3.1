import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, PieChart, Users, Receipt, CreditCard, Sparkles, Download, CheckCircle2, RotateCcw, Eraser, Save, Menu, Upload, FileJson, Settings, X, ArrowRight, TrendingUp, TrendingDown, Filter, Search, Calendar } from 'lucide-react';
import { Expense, ExpenseType, Roommate, SharedPurchase } from './types';
import SettlementMatrix from './components/SettlementMatrix';
import ExpenseList from './components/ExpenseList';
import SummaryStats from './components/SummaryStats';
import BillingHistory from './components/BillingHistory';
import Sidebar from './components/Sidebar';
import ItemSplitCalculator from './components/ItemSplitCalculator';
import { GoogleGenAI } from "@google/genai";
import * as XLSX from 'xlsx';
import { generateJSONData, exportToJSONFile, importFromJSONFile } from './utils/dataStorage';
import { roommatesAPI, expensesAPI, fixedCostsAPI, paidRoommatesAPI, dataAPI, sharedPurchasesAPI } from './utils/api';
import { formatDateToDDMMYYYY, formatDateToYYYYMMDD, isDateInRange } from './utils/dateUtils';

const App: React.FC = () => {
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sharedPurchases, setSharedPurchases] = useState<SharedPurchase[]>([]);
  const [fixedRent, setFixedRent] = useState<number>(0);
  const [electricityBill, setElectricityBill] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const [localRent, setLocalRent] = useState<number>(fixedRent);
  const [localElectricity, setLocalElectricity] = useState<number>(electricityBill);
  const [isSavingFixed, setIsSavingFixed] = useState(false);

  const [paidRoommateIds, setPaidRoommateIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('paidRoommateIds');
    return saved ? JSON.parse(saved) : [];
  });

  const [aiInsight, setAiInsight] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // Check if we're on desktop (lg breakpoint = 1024px)
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });
  const [selectedRoommateForHistory, setSelectedRoommateForHistory] = useState<string | null>(null);
  const [historyFilterSearch, setHistoryFilterSearch] = useState<string>('');
  const [historyFilterStartDate, setHistoryFilterStartDate] = useState<string>('');
  const [historyFilterEndDate, setHistoryFilterEndDate] = useState<string>('');
  const [showHistoryFilters, setShowHistoryFilters] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await dataAPI.getAll();
        setRoommates(data.roommates || []);
        setExpenses(data.expenses || []);
        setSharedPurchases(data.sharedPurchases || []);
        setFixedRent(data.fixedCosts?.rent || 0);
        setElectricityBill(data.fixedCosts?.electricity || 0);
        setPaidRoommateIds(data.paidRoommateIds || []);
        setLocalRent(data.fixedCosts?.rent || 0);
        setLocalElectricity(data.fixedCosts?.electricity || 0);
      } catch (error) {
        console.error('Failed to load data from API, using localStorage fallback:', error);
        // Fallback to localStorage
        const savedRoommates = localStorage.getItem('roommates');
        const savedExpenses = localStorage.getItem('expenses');
        const savedRent = localStorage.getItem('fixedRent');
        const savedElectricity = localStorage.getItem('electricityBill');
        const savedPaidIds = localStorage.getItem('paidRoommateIds');
        
        if (savedRoommates) setRoommates(JSON.parse(savedRoommates));
        if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
        if (savedRent) setFixedRent(Number(savedRent));
        if (savedElectricity) setElectricityBill(Number(savedElectricity));
        if (savedPaidIds) setPaidRoommateIds(JSON.parse(savedPaidIds));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Handle window resize to show sidebar on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setLocalRent(fixedRent);
    setLocalElectricity(electricityBill);
  }, [fixedRent, electricityBill]);

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    try {
      const newExpense = await expensesAPI.add(expense);
      setExpenses(prev => [newExpense, ...prev]);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add expense');
      console.error(error);
    }
  };

  const deleteExpense = async (id: string) => {
    if (window.confirm("Delete this transaction?")) {
      try {
        await expensesAPI.delete(id);
        setExpenses(prev => prev.filter(e => e.id !== id));
      } catch (error) {
        alert('Failed to delete expense');
        console.error(error);
      }
    }
  };

  const addSharedPurchase = async (purchase: Omit<SharedPurchase, 'id'>) => {
    try {
      const newPurchase = await sharedPurchasesAPI.add(purchase);
      setSharedPurchases(prev => [newPurchase, ...prev]);
    } catch (error) {
      console.error('Failed to add shared purchase:', error);
      alert('Failed to add purchase. Please try again.');
    }
  };

  const deleteSharedPurchase = async (id: string) => {
    try {
      await sharedPurchasesAPI.delete(id);
      setSharedPurchases(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete shared purchase:', error);
      alert('Failed to delete purchase. Please try again.');
    }
  };

  const addRoommate = async (name: string) => {
    if (!name.trim()) return;
    
    try {
      const newRoommate = await roommatesAPI.add(name);
      setRoommates(prev => [...prev, newRoommate]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add roommate';
      alert(errorMessage);
      console.error(error);
    }
  };

  const removeRoommate = async (id: string) => {
    if (window.confirm("Remove this roommate? This will affect settlement calculations.")) {
      try {
        await roommatesAPI.delete(id);
        setRoommates(prev => prev.filter(r => r.id !== id));
        setPaidRoommateIds(prev => prev.filter(paidId => paidId !== id));
      } catch (error) {
        alert('Failed to delete roommate');
        console.error(error);
      }
    }
  };

  const handleSaveFixedCosts = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFixed(true);
    
    try {
      await fixedCostsAPI.update(localRent, localElectricity);
      setFixedRent(localRent);
      setElectricityBill(localElectricity);
      setTimeout(() => {
        setIsSavingFixed(false);
      }, 600);
    } catch (error) {
      alert('Failed to save fixed costs');
      console.error(error);
      setIsSavingFixed(false);
    }
  };

  const handleExport = () => {
    try {
      const wb = XLSX.utils.book_new();
      const expenseData = expenses.map(e => ({
        Date: e.date,
        Spender: e.name,
        Recipient: e.to || '',
        Category: e.type,
        Amount: e.amount,
        PaymentMode: e.paymode,
        Note: e.note || ''
      }));
      const wsExpenses = XLSX.utils.json_to_sheet(expenseData);
      XLSX.utils.book_append_sheet(wb, wsExpenses, "All Transactions");
      XLSX.writeFile(wb, `RoomExpenses_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) { alert("Export failed"); }
  };

  const handleExportJSON = async () => {
    try {
      const jsonData = await dataAPI.getAll();
      exportToJSONFile(jsonData);
      alert('JSON file exported successfully!');
    } catch (error) {
      try {
        const jsonData = generateJSONData(
          roommates,
          expenses,
          fixedRent,
          electricityBill,
          paidRoommateIds
        );
        exportToJSONFile(jsonData);
        alert('JSON file exported successfully!');
      } catch (fallbackError) {
        alert('Failed to export JSON file. Please try again.');
        console.error(fallbackError);
      }
    }
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('Please select a valid JSON file');
      return;
    }

    try {
      const importedData = await importFromJSONFile(file);
      
      if (window.confirm(
        `Import data from ${importedData.exportDate || 'unknown date'}?\n\n` +
        `This will replace:\n` +
        `- ${importedData.roommates.length} roommates\n` +
        `- ${importedData.expenses.length} expenses\n` +
        `- Fixed costs: Rent ₹${importedData.fixedCosts.rent}, Electricity ₹${importedData.fixedCosts.electricity}\n\n` +
        `Current data will be replaced. Continue?`
      )) {
        await dataAPI.import(importedData);
        setRoommates(importedData.roommates);
        setExpenses(importedData.expenses);
        setFixedRent(importedData.fixedCosts.rent);
        setElectricityBill(importedData.fixedCosts.electricity);
        setLocalRent(importedData.fixedCosts.rent);
        setLocalElectricity(importedData.fixedCosts.electricity);
        setPaidRoommateIds(importedData.paidRoommateIds || []);
        alert('Data imported successfully!');
      }
    } catch (error) {
      alert(`Failed to import JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(error);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearAllData = async () => {
    if (window.confirm(
      "This will reset fixed costs (rent & electricity) and paid statuses.\n\n" +
      "✓ Billing history will be preserved\n" +
      "✓ Roommates will stay\n" +
      "✗ Fixed costs will be cleared\n" +
      "✗ Paid statuses will be reset\n\n" +
      "Continue?"
    )) {
      try {
        await fixedCostsAPI.update(0, 0);
        await paidRoommatesAPI.update([]);
        setFixedRent(0);
        setElectricityBill(0);
        setLocalRent(0);
        setLocalElectricity(0);
        setPaidRoommateIds([]);
        alert('Data reset successfully! Billing history has been preserved.');
      } catch (error) {
        alert('Failed to reset data');
        console.error(error);
      }
    }
  };

  // Calculate payment history for a specific roommate
  const calculateRoommateHistory = (roommateName: string) => {
    const m = roommates.length;
    
    // 1. General Spending Map (For equal split expenses only)
    const generalSpendingMap = new Map<string, number>();
    
    // 2. Total Paid Map (For display - everything the user paid out of pocket)
    const totalPaidMap = new Map<string, number>();
    
    // 3. Payments (Settlements)
    const paymentsMap = new Map<string, number>();
    
    // Initialize maps
    roommates.forEach(r => {
      generalSpendingMap.set(r.name, 0);
      totalPaidMap.set(r.name, 0);
    });

    // --- Helper to identify expenses that correspond to Shared Purchases ---
    // Only include purchases that are actually split (have splitBetween)
    const getLikelyItemSplitKeys = (purchaseList: SharedPurchase[]) => {
      const keys = new Set<string>();
      purchaseList.forEach(p => {
        // Only include purchases that are actually split among roommates
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

    // --- Helper to identify personal expenses ---
    // Personal expenses are those with "Item:" in note but NOT in shared purchases (itemSplitKeys)
    const isPersonalExpense = (e: Expense) => {
      if (!e.note || !e.note.toLowerCase().includes('item:')) return false;
      // If it has "Item:" but is NOT a duplicate of a shared purchase, it's personal
      return !isExpenseDuplicate(e, itemSplitKeys);
    };

    // --- Process Regular Expenses ---
    expenses.forEach(e => {
      if (e.type !== ExpenseType.SETTLEMENT) {
        // Track TOTAL paid for display stats
        totalPaidMap.set(e.name, (totalPaidMap.get(e.name) || 0) + e.amount);

        // Track GENERAL spending (only if not a specific shared item AND not personal)
        // Personal expenses should NOT be divided among roommates
        if (!isExpenseDuplicate(e, itemSplitKeys) && !isPersonalExpense(e)) {
          generalSpendingMap.set(e.name, (generalSpendingMap.get(e.name) || 0) + e.amount);
        }
      } else {
        // Handle Settlement
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

    // --- Process Shared Purchases (Specific Debts) ---
    const sharedPurchaseDebts = new Map<string, number>();
    
    sharedPurchases.forEach(purchase => {
      // Add shared purchase amount to totalPaidMap for the payer
      // This ensures "Total Paid" includes both expenses and shared purchases
      
      // Check if this purchase has a corresponding expense (to avoid double counting)
      // Match by payer name, amount, and item name from note
      const hasMatchingExpense = expenses.some(e => {
        if (e.name !== purchase.payer || e.type === ExpenseType.SETTLEMENT) return false;
        if (!e.note?.toLowerCase().includes('item:')) return false;
        
        const match = e.note.match(/Item:\s*(.+?)(?:\s*-|$)/i);
        if (!match) return false;
        const itemNameFromNote = match[1].trim().toLowerCase();
        const purchaseItemName = purchase.itemName.toLowerCase();
        
        // Match if item name and amount are the same
        return itemNameFromNote === purchaseItemName && 
               Math.abs(e.amount - purchase.amount) < 0.01;
      });
      
      // If purchase has splitBetween, there's usually no expense, so add it
      // If purchase has no splitBetween but no matching expense, add it
      // If purchase has matching expense, don't add (already counted in expenses loop)
      if (!hasMatchingExpense) {
        totalPaidMap.set(purchase.payer, (totalPaidMap.get(purchase.payer) || 0) + purchase.amount);
      }
      
      // Add shared purchases with splitBetween to generalSpendingMap for settlement calculation
      // These are split equally among all roommates, so they need to be in generalSpendingMap
      if (purchase.splitBetween && purchase.splitBetween.length > 0) {
        // If no matching expense, add the purchase to generalSpendingMap
        // This is needed for equal split calculation (baseDebt = (jSpent/m) - (iSpent/m))
        // Items in generalSpendingMap are split equally among ALL roommates, so don't add to sharedPurchaseDebts
        if (!hasMatchingExpense) {
          generalSpendingMap.set(purchase.payer, (generalSpendingMap.get(purchase.payer) || 0) + purchase.amount);
        }
        // Note: We do NOT add to sharedPurchaseDebts here because items with splitBetween
        // are handled by the general split calculation (baseDebt) when added to generalSpendingMap
      } else {
        // Legacy direct debt (Buyer owes Payer)
        if (purchase.buyer !== purchase.payer) {
          const debtKey = `${purchase.buyer}-${purchase.payer}`;
          sharedPurchaseDebts.set(debtKey, (sharedPurchaseDebts.get(debtKey) || 0) + purchase.amount);
        }
      }
    });

    // Calculate total expenses paid by this roommate (Use TotalPaidMap)
    const totalPaid = totalPaidMap.get(roommateName) || 0;

    // Calculate total due (what they owe to others) with details
    let totalDue = 0;
    const dueBreakdown: Array<{ to: string; amount: number; details: string[] }> = [];
    
    roommates.forEach(other => {
      if (other.name !== roommateName) {
        // 1. General Split Debt (Equal Split)
        const jSpent = generalSpendingMap.get(other.name) || 0;
        const iSpent = generalSpendingMap.get(roommateName) || 0;
        const baseDebt = (jSpent / m) - (iSpent / m);
        
        // 2. Specific Shared Debt (Split Items)
        const sharedDebtKey = `${roommateName}-${other.name}`;
        const sharedDebt = sharedPurchaseDebts.get(sharedDebtKey) || 0;
        
        // 3. Payments
        const iPaidJ = paymentsMap.get(`${roommateName}-${other.name}`) || 0;
        const jPaidI = paymentsMap.get(`${other.name}-${roommateName}`) || 0;

        const debt = baseDebt - iPaidJ + jPaidI + sharedDebt;
        
        if (debt > 0.01) {
          totalDue += debt;
          
          // Collect details about what this debt is for
          const details: string[] = [];
          
          // Regular expenses share details
          if (baseDebt > 0.01) {
            const otherExpenses = expenses.filter(e => 
              e.name === other.name && 
              e.type !== ExpenseType.SETTLEMENT &&
              !isExpenseDuplicate(e, itemSplitKeys) && // Filter out shared items from general list
              !isPersonalExpense(e) // Filter out personal expenses
            );
            
            if (otherExpenses.length > 0) {
              const expensesByType = new Map<string, { totalAmount: number; items: string[] }>();
              otherExpenses.forEach(e => {
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
                const itemsText = data.items.length > 0 ? ` (${data.items.join(', ')})` : '';
                details.push(`${expenseType}${itemsText}: ₹${sharePerPerson.toFixed(2)} (from ₹${data.totalAmount.toFixed(2)})`);
              });
            }
          }
          
          // Shared purchase details
          if (sharedDebt > 0.01) {
            // Find purchases where 'other' paid and 'roommateName' owes
            const relevantPurchases = sharedPurchases.filter(p => {
              if (p.payer !== other.name) return false;
              if (p.splitBetween && p.splitBetween.length > 0) {
                return p.splitBetween.includes(roommateName) && roommateName !== other.name;
              }
              return p.buyer === roommateName && roommateName !== other.name;
            });

            relevantPurchases.forEach(p => {
               let amountOwed = 0;
               if (p.splitBetween && p.splitBetween.length > 0) {
                 amountOwed = p.perPersonAmount ?? (p.amount / p.splitBetween.length);
               } else {
                 amountOwed = p.amount;
               }
               details.push(`Item Split: ${p.itemName} (₹${amountOwed.toFixed(2)})`);
            });
          }
          
          // Adjustments from settlements
          if (iPaidJ > 0.01) {
            details.push(`Already paid: ₹${iPaidJ.toFixed(2)}`);
          }
          if (jPaidI > 0.01) {
            details.push(`Received: ₹${jPaidI.toFixed(2)}`);
          }
          
          dueBreakdown.push({ to: other.name, amount: debt, details });
        }
      }
    });

    // Calculate total owed to them (what others owe them) with details
    let totalOwed = 0;
    const owedBreakdown: Array<{ from: string; amount: number; details: string[] }> = [];
    
    roommates.forEach(other => {
      if (other.name !== roommateName) {
        // 1. General Split Debt
        const jSpent = generalSpendingMap.get(roommateName) || 0;
        const iSpent = generalSpendingMap.get(other.name) || 0;
        const baseDebt = (jSpent / m) - (iSpent / m);
        
        // 2. Specific Shared Debt
        const sharedDebtKey = `${other.name}-${roommateName}`;
        const sharedDebt = sharedPurchaseDebts.get(sharedDebtKey) || 0;
        
        // 3. Payments
        const iPaidJ = paymentsMap.get(`${other.name}-${roommateName}`) || 0;
        const jPaidI = paymentsMap.get(`${roommateName}-${other.name}`) || 0;

        const debt = baseDebt - iPaidJ + jPaidI + sharedDebt;
        
        if (debt > 0.01) {
          totalOwed += debt;
          
          const details: string[] = [];
          
          // Regular expenses share details
          if (baseDebt > 0.01) {
            const myExpenses = expenses.filter(e => 
              e.name === roommateName && 
              e.type !== ExpenseType.SETTLEMENT &&
              !isExpenseDuplicate(e, itemSplitKeys) &&
              !isPersonalExpense(e) // Filter out personal expenses
            );
            
            if (myExpenses.length > 0) {
              const expensesByType = new Map<string, { totalAmount: number; items: string[] }>();
              myExpenses.forEach(e => {
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
                const itemsText = data.items.length > 0 ? ` (${data.items.join(', ')})` : '';
                details.push(`${expenseType}${itemsText}: ₹${sharePerPerson.toFixed(2)} (from ₹${data.totalAmount.toFixed(2)})`);
              });
            }
          }
          
          // Shared purchase debts
          if (sharedDebt > 0.01) {
             // Find purchases where 'roommateName' paid and 'other' owes
            const relevantPurchases = sharedPurchases.filter(p => {
              if (p.payer !== roommateName) return false;
              if (p.splitBetween && p.splitBetween.length > 0) {
                return p.splitBetween.includes(other.name) && other.name !== roommateName;
              }
              return p.buyer === other.name && other.name !== roommateName;
            });

            relevantPurchases.forEach(p => {
               let amountOwed = 0;
               if (p.splitBetween && p.splitBetween.length > 0) {
                 amountOwed = p.perPersonAmount ?? (p.amount / p.splitBetween.length);
               } else {
                 amountOwed = p.amount;
               }
               details.push(`Item Split: ${p.itemName} (₹${amountOwed.toFixed(2)})`);
            });
          }
          
          // Adjustments from settlements
          if (iPaidJ > 0.01) {
            details.push(`Already received: ₹${iPaidJ.toFixed(2)}`);
          }
          if (jPaidI > 0.01) {
            details.push(`Paid to them: ₹${jPaidI.toFixed(2)}`);
          }
          
          owedBreakdown.push({ from: other.name, amount: debt, details });
        }
      }
    });

    // Get expenses made by this roommate
    const userExpenses = expenses.filter(e => e.name === roommateName && e.type !== ExpenseType.SETTLEMENT);
    const userSettlements = expenses.filter(e => e.name === roommateName && e.type === ExpenseType.SETTLEMENT);
    // Get settlements received by this roommate (where they are the recipient/to)
    const receivedSettlements = expenses.filter(e => {
      if (e.type !== ExpenseType.SETTLEMENT) return false;
      const to = e.to || (e.note?.match(/Settlement payment to (.+)/)?.[1]);
      return to === roommateName;
    });
    const userSharedPurchases = sharedPurchases.filter(p => p.buyer === roommateName || p.payer === roommateName);
    
    // Separate personal expenses (expenses with "Item:" but not in shared purchases)
    const personalExpenses = userExpenses.filter(e => isPersonalExpense(e));
    const sharedExpenses = userExpenses.filter(e => !isPersonalExpense(e));

    // Calculate personal expenses total
    const personalExpensesTotal = personalExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    
    // Calculate room/shared expenses total (from expenses + shared purchases with splitBetween)
    const roomExpensesFromSharedPurchases = userSharedPurchases
      .filter(p => p.splitBetween && p.splitBetween.length > 0 && p.payer === roommateName)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const roomExpensesFromExpenses = sharedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const roomExpensesTotal = roomExpensesFromSharedPurchases + roomExpensesFromExpenses;

    return {
      totalPaid,
      totalDue,
      totalOwed,
      dueBreakdown,
      owedBreakdown,
      expenses: sharedExpenses,
      personalExpenses: personalExpenses,
      personalExpensesTotal,
      roomExpensesTotal,
      settlements: userSettlements,
      receivedSettlements: receivedSettlements,
      sharedPurchases: userSharedPurchases
    };
  };

  const getAiInsights = async () => {
    if (!process.env.API_KEY) return;
    setIsGeneratingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Analyze these room expenses:
        Fixed Costs: Rent ₹${fixedRent}, Electricity ₹${electricityBill}
        Variable Expenses: ${expenses.map(e => `${e.name} spent ₹${e.amount} on ${e.type}`).join(', ')}
        Roommates: ${roommates.map(r => r.name).join(', ')}
        
        Provide a short (max 2-3 sentences), friendly financial advice or summary for the roommates.
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAiInsight(response.text || "No insights available.");
    } catch (err) {
      console.error(err);
      setAiInsight("Unable to fetch AI insights at this time.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleNavigate = (section: string) => {
    setActiveSection(section);
    // Scroll to top when navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onNavigate={handleNavigate}
        activeSection={activeSection}
      />
      
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between lg:pl-72">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <CreditCard size={24} />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">RoomieSplit</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={getAiInsights}
              disabled={isGeneratingAi}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              <Sparkles size={16} className={isGeneratingAi ? 'animate-pulse' : ''} />
              {isGeneratingAi ? 'Analyzing...' : 'Smart Insights'}
            </button>
            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1"></div>
            <button 
              onClick={handleExport}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-all text-sm font-medium"
            >
              <Download size={18} />
              Export
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 lg:pl-72">
        {/* Dashboard Page */}
        {activeSection === 'home' && (
          <div className="space-y-8">
            {aiInsight && (
              <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Sparkles size={48} />
                </div>
                <p className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Sparkles size={16} /> AI Insight
                </p>
                <p className="text-lg font-light leading-relaxed">{aiInsight}</p>
              </div>
            )}
            <SummaryStats expenses={expenses} fixedCosts={fixedRent + electricityBill} roommatesCount={roommates.length} sharedPurchases={sharedPurchases} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4 text-indigo-600">
                  <Users size={20} />
                  <h2 className="font-bold text-gray-800">Quick Roommates</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {roommates.map(roommate => (
                    <button
                      key={roommate.id}
                      onClick={() => setSelectedRoommateForHistory(roommate.name)}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors cursor-pointer"
                    >
                      {roommate.name}
                    </button>
                  ))}
                </div>
              </section>
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4 text-emerald-600">
                  <Receipt size={20} />
                  <h2 className="font-bold text-gray-800">Fixed Costs</h2>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Rent:</span>
                    <span className="font-bold text-gray-900">₹{fixedRent.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Electricity:</span>
                    <span className="font-bold text-gray-900">₹{electricityBill.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-800">Total:</span>
                      <span className="font-bold text-emerald-600">₹{(fixedRent + electricityBill).toFixed(2)}</span>
                    </div>
                  </div>
                  {roommates.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Per Person ({roommates.length} roommates):</span>
                        <span className="font-bold text-indigo-600">₹{((fixedRent + electricityBill) / roommates.length).toFixed(2)}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        Rent: ₹{(fixedRent / roommates.length).toFixed(2)} • Electricity: ₹{(electricityBill / roommates.length).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* Roommates Page */}
        {activeSection === 'roommates' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4 text-indigo-600">
                <Users size={20} />
                <h2 className="font-bold text-gray-800 text-xl">Manage Roommates</h2>
              </div>
              <div className="space-y-3 mb-5">
                <div className="flex gap-2">
                  <input
                    id="new-roommate-name"
                    type="text"
                    placeholder="Full Name"
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addRoommate(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const nameInput = document.getElementById('new-roommate-name') as HTMLInputElement;
                      addRoommate(nameInput.value);
                      nameInput.value = '';
                    }}
                    className="px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {roommates.map(roommate => (
                  <div key={roommate.id} className="group flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-sm font-medium text-gray-700 hover:bg-white hover:border-indigo-200 transition-all shadow-sm">
                    {roommate.name}
                    <button onClick={() => removeRoommate(roommate.id)} className="text-gray-300 group-hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4 text-emerald-600">
                <Receipt size={20} />
                <h2 className="font-bold text-gray-800 text-xl">Fixed Monthly Costs</h2>
              </div>
              <form onSubmit={handleSaveFixedCosts} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Room Rent</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono">₹</span>
                    <input
                      type="number"
                      value={localRent || ''}
                      onChange={(e) => setLocalRent(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono font-bold"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Electricity Bill</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono">₹</span>
                    <input
                      type="number"
                      value={localElectricity || ''}
                      onChange={(e) => setLocalElectricity(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono font-bold"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className={`w-full py-3 flex items-center justify-center gap-2 rounded-xl font-bold transition-all shadow-lg ${
                    isSavingFixed 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'
                  }`}
                >
                  {isSavingFixed ? <CheckCircle2 size={18} className="animate-bounce" /> : <Save size={18} />}
                  {isSavingFixed ? 'BILLS SUBMITTED!' : 'SUBMIT BILLS'}
                </button>
              </form>
            </section>
          </div>
        )}

        {/* Expenses Page */}
        {activeSection === 'expenses' && (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4 text-emerald-600">
                  <Receipt size={20} />
                  <h2 className="font-bold text-gray-800 text-xl">Quick Stats</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₹{expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Number of Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
                  </div>
                </div>
              </section>
            </div>
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Receipt size={20} />
                  <h2 className="font-bold text-gray-800 text-xl">All Transactions</h2>
                </div>
              </div>
              <ExpenseList expenses={expenses} onDelete={deleteExpense} />
            </section>
          </div>
        )}

        {/* Billing History Page */}
        {activeSection === 'billing-history' && (
          <div className="max-w-6xl mx-auto space-y-8">
            <BillingHistory 
              expenses={expenses} 
              onDelete={deleteExpense} 
              sharedPurchases={sharedPurchases}
              onDeletePurchase={deleteSharedPurchase}
            />
          </div>
        )}

        {/* Item Split Calculator Page */}
        {activeSection === 'item-split' && (
          <div className="max-w-6xl mx-auto space-y-8">
            <ItemSplitCalculator
              roommates={roommates}
              purchases={sharedPurchases}
              onAddPurchase={addSharedPurchase}
              onDeletePurchase={deleteSharedPurchase}
              onAddExpense={addExpense}
            />
          </div>
        )}

        {/* Settlement Page */}
        {activeSection === 'settlement' && (
          <div className="max-w-6xl mx-auto space-y-8">
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-2 text-indigo-600">
                  <PieChart size={20} />
                  <h2 className="font-bold text-gray-800 text-xl">Settlement Matrix</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Calculated Live</div>
                  <button onClick={async () => {
                    try {
                      await paidRoommatesAPI.update([]);
                      setPaidRoommateIds([]);
                    } catch (error) {
                      console.error('Failed to clear paid status:', error);
                    }
                  }} className="text-xs font-bold text-rose-600 flex items-center gap-1 hover:underline">
                    <RotateCcw size={12} /> CLEAR STATUS
                  </button>
                </div>
              </div>
              <SettlementMatrix 
                roommates={roommates} 
                expenses={expenses}
                sharedPurchases={sharedPurchases}
                paidRoommateIds={paidRoommateIds}
                onTogglePaid={async (id) => {
                  const updated = paidRoommateIds.includes(id) 
                    ? paidRoommateIds.filter(pid => pid !== id) 
                    : [...paidRoommateIds, id];
                  try {
                    await paidRoommatesAPI.update(updated);
                    setPaidRoommateIds(updated);
                  } catch (error) {
                    console.error('Failed to update paid roommates:', error);
                  }
                }}
                onAddExpense={addExpense}
                fixedCosts={fixedRent + electricityBill}
              />
            </section>
          </div>
        )}

        {/* Settings Page */}
        {activeSection === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6 text-gray-600">
                <Settings size={20} />
                <h2 className="font-bold text-gray-800 text-xl">Settings</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Data Management</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={handleExportJSON}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-md"
                    >
                      <FileJson size={18} />
                      Export All Data to JSON
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportJSON}
                      className="hidden"
                      id="json-import-input"
                    />
                    <label
                      htmlFor="json-import-input"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors font-medium cursor-pointer border border-emerald-200"
                    >
                      <Upload size={18} />
                      Import Data from JSON
                    </label>
                    <button 
                      onClick={handleExport}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors font-medium"
                    >
                      <Download size={18} />
                      Export to Excel
                    </button>
                    <button 
                      onClick={clearAllData}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 transition-colors font-medium"
                    >
                      <Eraser size={18} />
                      Reset Fixed Costs & Statuses (Keep History)
                    </button>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-gray-800 mb-3">AI Insights</h3>
                  <button 
                    onClick={getAiInsights}
                    disabled={isGeneratingAi}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                  >
                    <Sparkles size={18} className={isGeneratingAi ? 'animate-pulse' : ''} />
                    {isGeneratingAi ? 'Generating Insights...' : 'Generate AI Insights'}
                  </button>
                </div>
                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-gray-800 mb-2">App Information</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Version:</span> 1.0.0</p>
                    <p><span className="font-medium">Total Roommates:</span> {roommates.length}</p>
                    <p><span className="font-medium">Total Expenses:</span> {expenses.length}</p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-gray-800 mb-2">Auto-Save Status</h3>
                  <div className="text-xs text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                    <p className="font-medium mb-1">✓ Auto-Save Active</p>
                    <p className="text-gray-600">All form data is automatically saved to JSON format. Click "Export All Data to JSON" to download the latest version.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Payment History Modal */}
        {selectedRoommateForHistory && (() => {
          const history = calculateRoommateHistory(selectedRoommateForHistory);
          return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedRoommateForHistory(null)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedRoommateForHistory}'s Payment History</h2>
                      <p className="text-indigo-100 text-sm mt-1">Complete financial overview</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {(historyFilterSearch || historyFilterStartDate || historyFilterEndDate) && (
                        <button
                          onClick={() => {
                            setHistoryFilterSearch('');
                            setHistoryFilterStartDate('');
                            setHistoryFilterEndDate('');
                          }}
                          className="text-xs text-white/90 hover:text-white font-medium flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors"
                        >
                          <X size={14} />
                          Clear Filters
                        </button>
                      )}
                      <button
                        onClick={() => setShowHistoryFilters(!showHistoryFilters)}
                        className="text-xs text-white/90 hover:text-white font-medium flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors"
                      >
                        <Filter size={14} />
                        {showHistoryFilters ? 'Hide' : 'Show'} Filters
                      </button>
                      <button
                        onClick={() => setSelectedRoommateForHistory(null)}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                      >
                        <X size={24} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filters Section */}
                {showHistoryFilters && (
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                          <Search size={16} className="text-gray-400" />
                          Search
                        </label>
                        <input
                          type="text"
                          value={historyFilterSearch}
                          onChange={(e) => setHistoryFilterSearch(e.target.value)}
                          placeholder="Search by amount, item, type..."
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
                          value={historyFilterStartDate ? formatDateToYYYYMMDD(historyFilterStartDate) : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value) {
                              setHistoryFilterStartDate(formatDateToDDMMYYYY(value));
                            } else {
                              setHistoryFilterStartDate('');
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
                          value={historyFilterEndDate ? formatDateToYYYYMMDD(historyFilterEndDate) : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value) {
                              setHistoryFilterEndDate(formatDateToDDMMYYYY(value));
                            } else {
                              setHistoryFilterEndDate('');
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={20} className="text-blue-600" />
                        <span className="text-sm font-semibold text-blue-600">Total Paid</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-900">₹{history.totalPaid.toFixed(2)}</div>
                      <div className="text-xs text-blue-600 mt-1">All expenses paid</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown size={20} className="text-red-600" />
                        <span className="text-sm font-semibold text-red-600">Total Due</span>
                      </div>
                      <div className="text-2xl font-bold text-red-900">₹{history.totalDue.toFixed(2)}</div>
                      <div className="text-xs text-red-600 mt-1">Amount to pay</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={20} className="text-green-600" />
                        <span className="text-sm font-semibold text-green-600">Total Owed</span>
                      </div>
                      <div className="text-2xl font-bold text-green-900">₹{history.totalOwed.toFixed(2)}</div>
                      <div className="text-xs text-green-600 mt-1">Amount to receive</div>
                    </div>
                  </div>

                  {/* Expense Breakdown: Personal vs Room */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <Receipt size={18} className="text-indigo-600" />
                      Expense Breakdown
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Room Expenses */}
                      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-indigo-700">Room Expenses</span>
                        </div>
                        <div className="text-2xl font-bold text-indigo-900 mb-2">₹{history.roomExpensesTotal.toFixed(2)}</div>
                        <div className="text-xs text-indigo-600">Shared with roommates</div>
                        <div className="mt-2 pt-2 border-t border-indigo-200">
                          <div className="text-xs text-gray-600 space-y-1">
                            {history.sharedPurchases
                              .filter(p => p.splitBetween && p.splitBetween.length > 0 && p.payer === selectedRoommateForHistory)
                              .map((purchase, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <span className="text-indigo-500">•</span>
                                  <span className="text-gray-700">{purchase.itemName}: ₹{purchase.amount.toFixed(2)}</span>
                                </div>
                              ))}
                            {history.expenses.length > 0 && history.expenses.map((expense, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="text-indigo-500">•</span>
                                <span className="text-gray-700">{expense.type}: ₹{expense.amount.toFixed(2)}</span>
                              </div>
                            ))}
                            {history.sharedPurchases.filter(p => p.splitBetween && p.splitBetween.length > 0 && p.payer === selectedRoommateForHistory).length === 0 && history.expenses.length === 0 && (
                              <div className="text-gray-500 italic">No room expenses</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Personal Expenses */}
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-blue-700">Personal Expenses</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-900 mb-2">₹{(history.personalExpensesTotal || 0).toFixed(2)}</div>
                        <div className="text-xs text-blue-600">Not split among roommates</div>
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <div className="text-xs text-gray-600 space-y-1">
                            {history.personalExpenses && history.personalExpenses.length > 0 ? (
                              history.personalExpenses.map((expense, idx) => {
                                const itemMatch = expense.note?.match(/Item:\s*(.+?)(?:\s*-|$)/i);
                                const itemName = itemMatch ? itemMatch[1].trim() : (expense.note || expense.type);
                                return (
                                  <div key={idx} className="flex items-start gap-2">
                                    <span className="text-blue-500">•</span>
                                    <span className="text-gray-700">{itemName}: ₹{expense.amount.toFixed(2)}</span>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-gray-500 italic">No personal expenses</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Due Breakdown */}
                  {history.dueBreakdown.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <ArrowRight size={18} className="text-red-600" />
                        Amounts to Pay
                      </h3>
                      <div className="space-y-3">
                        {history.dueBreakdown.map((item, idx) => (
                          <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-800">
                                To <span className="text-red-700">{item.to}</span>
                              </span>
                              <span className="font-bold text-red-700 text-lg">₹{item.amount.toFixed(2)}</span>
                            </div>
                            {item.details && item.details.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-red-200">
                                <div className="text-xs font-semibold text-gray-700 mb-1">This amount includes:</div>
                                <div className="text-xs text-gray-600 space-y-1">
                                  {item.details.map((detail, detailIdx) => {
                                    // Check if detail contains expense type (format: "Type: ₹amount (from ₹total)")
                                    const isExpenseType = detail.includes(': ₹') && detail.includes('(from ₹');
                                    return (
                                      <div key={detailIdx} className="flex items-start gap-2">
                                        <span className="text-red-500">•</span>
                                        {isExpenseType ? (
                                          <span>
                                            <span className="font-medium text-gray-800">{detail.split(':')[0]}</span>
                                            <span className="text-gray-600">{detail.split(':')[1]}</span>
                                          </span>
                                        ) : (
                                          <span>{detail}</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Owed Breakdown */}
                  {history.owedBreakdown.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <ArrowRight size={18} className="text-green-600 rotate-180" />
                        Amounts to Receive
                      </h3>
                      <div className="space-y-3">
                        {history.owedBreakdown.map((item, idx) => (
                          <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-800">
                                From <span className="text-green-700">{item.from}</span>
                              </span>
                              <span className="font-bold text-green-700 text-lg">₹{item.amount.toFixed(2)}</span>
                            </div>
                            {item.details && item.details.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-green-200">
                                <div className="text-xs font-semibold text-gray-700 mb-1">This amount includes:</div>
                                <div className="text-xs text-gray-600 space-y-1">
                                  {item.details.map((detail, detailIdx) => {
                                    // Check if detail contains expense type (format: "Type: ₹amount (from ₹total)")
                                    const isExpenseType = detail.includes(': ₹') && detail.includes('(from ₹');
                                    return (
                                      <div key={detailIdx} className="flex items-start gap-2">
                                        <span className="text-green-500">•</span>
                                        {isExpenseType ? (
                                          <span>
                                            <span className="font-medium text-gray-800">{detail.split(':')[0]}</span>
                                            <span className="text-gray-600">{detail.split(':')[1]}</span>
                                          </span>
                                        ) : (
                                          <span>{detail}</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Personal Expenses List */}
                  {history.personalExpenses && history.personalExpenses.length > 0 && (() => {
                    const filteredPersonalExpenses = history.personalExpenses.filter((expense) => {
                      // Date filter
                      const expenseDate = formatDateToDDMMYYYY(expense.date);
                      if (!isDateInRange(expenseDate, historyFilterStartDate || null, historyFilterEndDate || null)) {
                        return false;
                      }

                      // Search filter
                      if (historyFilterSearch) {
                        const query = historyFilterSearch.toLowerCase();
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

                    return (
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <Users size={18} className="text-blue-600" />
                          Personal Expenses ({filteredPersonalExpenses.length}{historyFilterSearch || historyFilterStartDate || historyFilterEndDate ? ` of ${history.personalExpenses.length}` : ''})
                          <span className="text-xs font-normal text-gray-500 ml-2">(Not split among roommates)</span>
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                          {filteredPersonalExpenses.length > 0 ? (
                            filteredPersonalExpenses.map((expense) => {
                          const itemMatch = expense.note?.match(/Item:\s*(.+?)(?:\s*-|$)/i);
                          const itemName = itemMatch ? itemMatch[1].trim() : null;
                          return (
                            <div key={expense.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                                    {itemName || expense.type}
                                  </span>
                                  <span className="text-sm font-bold text-gray-900">₹{expense.amount.toFixed(2)}</span>
                                </div>
                                <div className="text-xs text-gray-500">{expense.date} • {expense.paymode}</div>
                                {expense.note && <div className="text-xs text-gray-400 italic mt-1">{expense.note}</div>}
                              </div>
                            </div>
                          );
                            })
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No personal expenses match the current filters
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Shared Expenses List */}
                  {history.expenses.length > 0 && (() => {
                    const filteredExpenses = history.expenses.filter((expense) => {
                      // Date filter
                      const expenseDate = formatDateToDDMMYYYY(expense.date);
                      if (!isDateInRange(expenseDate, historyFilterStartDate || null, historyFilterEndDate || null)) {
                        return false;
                      }

                      // Search filter
                      if (historyFilterSearch) {
                        const query = historyFilterSearch.toLowerCase();
                        const matchesType = expense.type.toLowerCase().includes(query);
                        const matchesAmount = expense.amount.toString().includes(query);
                        const matchesNote = expense.note?.toLowerCase().includes(query) || false;
                        
                        if (!matchesType && !matchesAmount && !matchesNote) {
                          return false;
                        }
                      }

                      return true;
                    });

                    return (
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <Receipt size={18} className="text-indigo-600" />
                          Shared Expenses ({filteredExpenses.length}{historyFilterSearch || historyFilterStartDate || historyFilterEndDate ? ` of ${history.expenses.length}` : ''})
                          <span className="text-xs font-normal text-gray-500 ml-2">(Split among roommates)</span>
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                          {filteredExpenses.length > 0 ? (
                            filteredExpenses.map((expense) => (
                          <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                                  {expense.type}
                                </span>
                                <span className="text-sm font-bold text-gray-900">₹{expense.amount.toFixed(2)}</span>
                              </div>
                              <div className="text-xs text-gray-500">{expense.date} • {expense.paymode}</div>
                              {expense.note && <div className="text-xs text-gray-400 italic mt-1">{expense.note}</div>}
                            </div>
                            </div>
                          ))
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No shared expenses match the current filters
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Settlements List */}
                  {(history.settlements.length > 0 || (history.receivedSettlements && history.receivedSettlements.length > 0)) && (() => {
                    const filteredSettlements = history.settlements.filter((settlement) => {
                      const settlementDate = formatDateToDDMMYYYY(settlement.date);
                      if (!isDateInRange(settlementDate, historyFilterStartDate || null, historyFilterEndDate || null)) {
                        return false;
                      }
                      if (historyFilterSearch) {
                        const query = historyFilterSearch.toLowerCase();
                        const matchesTo = settlement.to?.toLowerCase().includes(query) || false;
                        const matchesAmount = settlement.amount.toString().includes(query);
                        const matchesNote = settlement.note?.toLowerCase().includes(query) || false;
                        if (!matchesTo && !matchesAmount && !matchesNote) return false;
                      }
                      return true;
                    });

                    const filteredReceivedSettlements = history.receivedSettlements?.filter((settlement) => {
                      const settlementDate = formatDateToDDMMYYYY(settlement.date);
                      if (!isDateInRange(settlementDate, historyFilterStartDate || null, historyFilterEndDate || null)) {
                        return false;
                      }
                      if (historyFilterSearch) {
                        const query = historyFilterSearch.toLowerCase();
                        const matchesFrom = settlement.name?.toLowerCase().includes(query) || false;
                        const matchesAmount = settlement.amount.toString().includes(query);
                        const matchesNote = settlement.note?.toLowerCase().includes(query) || false;
                        if (!matchesFrom && !matchesAmount && !matchesNote) return false;
                      }
                      return true;
                    }) || [];

                    const totalFiltered = filteredSettlements.length + filteredReceivedSettlements.length;
                    const totalOriginal = history.settlements.length + (history.receivedSettlements?.length || 0);

                    return (
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <CreditCard size={18} className="text-purple-600" />
                          Settlements ({totalFiltered}{historyFilterSearch || historyFilterStartDate || historyFilterEndDate ? ` of ${totalOriginal}` : ''})
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                          {totalFiltered > 0 ? (
                            <>
                              {/* Settlements Made (Payments by this person) */}
                              {filteredSettlements.map((settlement) => (
                          <div key={settlement.id} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-800">
                                Payment to {settlement.to || 'Unknown'}
                              </div>
                              <div className="text-xs text-gray-500">{settlement.date} • {settlement.paymode}</div>
                              {settlement.note && <div className="text-xs text-gray-400 italic mt-1">{settlement.note}</div>}
                            </div>
                            <span className="font-bold text-purple-700">₹{settlement.amount.toFixed(2)}</span>
                              </div>
                              ))}
                              {/* Settlements Received (Payments to this person) */}
                              {filteredReceivedSettlements.map((settlement) => (
                          <div key={settlement.id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-800">
                                Payment from {settlement.name}
                              </div>
                              <div className="text-xs text-gray-500">{settlement.date} • {settlement.paymode}</div>
                              {settlement.note && <div className="text-xs text-gray-400 italic mt-1">{settlement.note}</div>}
                            </div>
                            <span className="font-bold text-green-700">₹{settlement.amount.toFixed(2)}</span>
                              </div>
                              ))}
                            </>
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No settlements match the current filters
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Shared Purchases */}
                  {history.sharedPurchases.length > 0 && (() => {
                    const filteredPurchases = history.sharedPurchases.filter((purchase) => {
                      const purchaseDate = formatDateToDDMMYYYY(purchase.date);
                      if (!isDateInRange(purchaseDate, historyFilterStartDate || null, historyFilterEndDate || null)) {
                        return false;
                      }
                      if (historyFilterSearch) {
                        const query = historyFilterSearch.toLowerCase();
                        const matchesItem = purchase.itemName.toLowerCase().includes(query);
                        const matchesAmount = purchase.amount.toString().includes(query);
                        const matchesBuyer = purchase.buyer.toLowerCase().includes(query);
                        const matchesPayer = purchase.payer.toLowerCase().includes(query);
                        const matchesNote = purchase.note?.toLowerCase().includes(query) || false;
                        if (!matchesItem && !matchesAmount && !matchesBuyer && !matchesPayer && !matchesNote) return false;
                      }
                      return true;
                    });

                    return (
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <Users size={18} className="text-orange-600" />
                          Shared Purchases ({filteredPurchases.length}{historyFilterSearch || historyFilterStartDate || historyFilterEndDate ? ` of ${history.sharedPurchases.length}` : ''})
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                          {filteredPurchases.length > 0 ? (
                            filteredPurchases.map((purchase) => (
                          <div key={purchase.id} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-800">{purchase.itemName}</div>
                              <div className="text-xs text-gray-500">
                                {purchase.buyer === selectedRoommateForHistory ? 'Bought' : 'Paid'} by {purchase.buyer === selectedRoommateForHistory ? 'you' : purchase.buyer}
                                {purchase.buyer !== purchase.payer && (
                                  <> • Paid by {purchase.payer === selectedRoommateForHistory ? 'you' : purchase.payer}</>
                                )}
                                {' • '}{purchase.date} • {purchase.paymode}
                              </div>
                              {purchase.note && <div className="text-xs text-gray-400 italic mt-1">{purchase.note}</div>}
                            </div>
                            <span className="font-bold text-orange-700">₹{purchase.amount.toFixed(2)}</span>
                          </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No shared purchases match the current filters
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Empty State */}
                  {(!history.personalExpenses || history.personalExpenses.length === 0) && history.expenses.length === 0 && history.settlements.length === 0 && (!history.receivedSettlements || history.receivedSettlements.length === 0) && history.sharedPurchases.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users size={48} className="mx-auto text-gray-300 mb-4" />
                      <p>No payment history found for {selectedRoommateForHistory}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
};

export default App;