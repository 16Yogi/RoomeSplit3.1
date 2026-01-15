
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, PieChart, Users, Receipt, CreditCard, Sparkles, Download, CheckCircle2, RotateCcw, Eraser, Save, Menu, Upload, FileJson, Settings, X, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
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
      // Get latest data from API
      const jsonData = await dataAPI.getAll();
      exportToJSONFile(jsonData);
      alert('JSON file exported successfully!');
    } catch (error) {
      // Fallback to generate from current state
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
        // Import to backend
        await dataAPI.import(importedData);
        
        // Update local state
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
      // Reset file input
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
        // Clear fixed costs
        await fixedCostsAPI.update(0, 0);
        
        // Clear paid roommates
        await paidRoommatesAPI.update([]);
        
        // Update local state (preserve expenses/history)
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
    
    // Calculate spending and payments
    const spendingMap = new Map<string, number>();
    const paymentsMap = new Map<string, number>();
    
    roommates.forEach(r => {
      spendingMap.set(r.name, 0);
    });

    // Process regular expenses
    expenses.forEach(e => {
      if (e.type !== ExpenseType.SETTLEMENT) {
        spendingMap.set(e.name, (spendingMap.get(e.name) || 0) + e.amount);
      } else {
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

    // Process shared purchases
    const sharedPurchaseDebts = new Map<string, number>();
    sharedPurchases.forEach(purchase => {
      if (purchase.buyer !== purchase.payer) {
        const debtKey = `${purchase.buyer}-${purchase.payer}`;
        sharedPurchaseDebts.set(debtKey, (sharedPurchaseDebts.get(debtKey) || 0) + purchase.amount);
      } else {
        // Buyer and payer are same - this is already added as a regular expense
        // Don't add to spendingMap here to avoid double counting
        // The expense was already added in ItemSplitCalculator when buyer === payer
      }
    });

    // Calculate total expenses paid by this roommate
    const totalPaid = spendingMap.get(roommateName) || 0;

    // Calculate total due (what they owe to others) with details
    let totalDue = 0;
    const dueBreakdown: Array<{ to: string; amount: number; details: string[] }> = [];
    roommates.forEach(other => {
      if (other.name !== roommateName) {
        const jSpent = spendingMap.get(other.name) || 0;
        const iSpent = spendingMap.get(roommateName) || 0;
        const baseDebt = (jSpent / m) - (iSpent / m);
        const iPaidJ = paymentsMap.get(`${roommateName}-${other.name}`) || 0;
        const jPaidI = paymentsMap.get(`${other.name}-${roommateName}`) || 0;
        const sharedDebtKey = `${roommateName}-${other.name}`;
        const sharedDebt = sharedPurchaseDebts.get(sharedDebtKey) || 0;
        const debt = baseDebt - iPaidJ + jPaidI + sharedDebt;
        if (debt > 0.01) {
          totalDue += debt;
          
          // Collect details about what this debt is for
          const details: string[] = [];
          
          // Regular expenses share - show specific expenses with item names
          if (baseDebt > 0.01) {
            const otherExpenses = expenses.filter(e => e.name === other.name && e.type !== ExpenseType.SETTLEMENT);
            if (otherExpenses.length > 0) {
              // Group expenses by type and collect item names
              const expensesByType = new Map<string, { totalAmount: number; items: string[] }>();
              otherExpenses.forEach(e => {
                const existing = expensesByType.get(e.type) || { totalAmount: 0, items: [] };
                existing.totalAmount += e.amount;
                
                // Extract item name from note if available
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
              
              // Calculate share for each expense type and show items
              expensesByType.forEach((data, expenseType) => {
                const sharePerPerson = data.totalAmount / m;
                const itemsText = data.items.length > 0 ? ` (${data.items.join(', ')})` : '';
                details.push(`${expenseType}${itemsText}: ₹${sharePerPerson.toFixed(2)} (from ₹${data.totalAmount.toFixed(2)})`);
              });
            }
          }
          
          // Shared purchase debts
          if (sharedDebt > 0.01) {
            const relatedPurchases = sharedPurchases.filter(p => 
              p.buyer === roommateName && p.payer === other.name
            );
            if (relatedPurchases.length > 0) {
              const items = relatedPurchases.map(p => p.itemName).join(', ');
              details.push(`Item Split: ${items} (₹${sharedDebt.toFixed(2)})`);
            }
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
        const jSpent = spendingMap.get(roommateName) || 0;
        const iSpent = spendingMap.get(other.name) || 0;
        const baseDebt = (jSpent / m) - (iSpent / m);
        const iPaidJ = paymentsMap.get(`${other.name}-${roommateName}`) || 0;
        const jPaidI = paymentsMap.get(`${roommateName}-${other.name}`) || 0;
        const sharedDebtKey = `${other.name}-${roommateName}`;
        const sharedDebt = sharedPurchaseDebts.get(sharedDebtKey) || 0;
        const debt = baseDebt - iPaidJ + jPaidI + sharedDebt;
        if (debt > 0.01) {
          totalOwed += debt;
          
          // Collect details about what this amount is for
          const details: string[] = [];
          
          // Regular expenses share - show specific expenses with item names
          if (baseDebt > 0.01) {
            const myExpenses = expenses.filter(e => e.name === roommateName && e.type !== ExpenseType.SETTLEMENT);
            if (myExpenses.length > 0) {
              // Group expenses by type and collect item names
              const expensesByType = new Map<string, { totalAmount: number; items: string[] }>();
              myExpenses.forEach(e => {
                const existing = expensesByType.get(e.type) || { totalAmount: 0, items: [] };
                existing.totalAmount += e.amount;
                
                // Extract item name from note if available
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
              
              // Calculate share for each expense type and show items
              expensesByType.forEach((data, expenseType) => {
                const sharePerPerson = data.totalAmount / m;
                const itemsText = data.items.length > 0 ? ` (${data.items.join(', ')})` : '';
                details.push(`${expenseType}${itemsText}: ₹${sharePerPerson.toFixed(2)} (from ₹${data.totalAmount.toFixed(2)})`);
              });
            }
          }
          
          // Shared purchase debts
          if (sharedDebt > 0.01) {
            const relatedPurchases = sharedPurchases.filter(p => 
              p.buyer === other.name && p.payer === roommateName
            );
            if (relatedPurchases.length > 0) {
              const items = relatedPurchases.map(p => p.itemName).join(', ');
              details.push(`Item Split: ${items} (₹${sharedDebt.toFixed(2)})`);
            }
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
    const userSharedPurchases = sharedPurchases.filter(p => p.buyer === roommateName || p.payer === roommateName);

    return {
      totalPaid,
      totalDue,
      totalOwed,
      dueBreakdown,
      owedBreakdown,
      expenses: userExpenses,
      settlements: userSettlements,
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
            <SummaryStats expenses={expenses} fixedCosts={fixedRent + electricityBill} roommatesCount={roommates.length} />
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
                    <button
                      onClick={() => setSelectedRoommateForHistory(null)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>

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

                  {/* Expenses List */}
                  {history.expenses.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Receipt size={18} className="text-indigo-600" />
                        Expenses Paid ({history.expenses.length})
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {history.expenses.map((expense) => (
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
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Settlements List */}
                  {history.settlements.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <CreditCard size={18} className="text-purple-600" />
                        Settlements ({history.settlements.length})
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {history.settlements.map((settlement) => (
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
                      </div>
                    </div>
                  )}

                  {/* Shared Purchases */}
                  {history.sharedPurchases.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Users size={18} className="text-orange-600" />
                        Shared Purchases ({history.sharedPurchases.length})
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {history.sharedPurchases.map((purchase) => (
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
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {history.expenses.length === 0 && history.settlements.length === 0 && history.sharedPurchases.length === 0 && (
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
