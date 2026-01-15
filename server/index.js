import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, '..', 'data-template.json');

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to read JSON file
const readDataFile = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
    // Return default structure if file doesn't exist
    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      roommates: [],
      expenses: [],
      sharedPurchases: [],
      fixedCosts: {
        rent: 0,
        electricity: 0
      },
      paidRoommateIds: [],
      metadata: {
        totalExpenses: 0,
        totalRoommates: 0,
        lastUpdated: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error reading data file:', error);
    throw error;
  }
};

// Helper function to write JSON file
const writeDataFile = (data) => {
  try {
    // Update metadata
    data.metadata = {
      totalExpenses: data.expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
      totalRoommates: data.roommates.length,
      lastUpdated: new Date().toISOString()
    };
    data.exportDate = new Date().toISOString();
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return data;
  } catch (error) {
    console.error('Error writing data file:', error);
    throw error;
  }
};

// GET - Get all data
app.get('/api/data', (req, res) => {
  try {
    const data = readDataFile();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// GET - Get roommates
app.get('/api/roommates', (req, res) => {
  try {
    const data = readDataFile();
    res.json(data.roommates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read roommates' });
  }
});

// POST - Add roommate
app.post('/api/roommates', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const data = readDataFile();
    
    // Check if roommate already exists
    if (data.roommates.find(r => r.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: 'Roommate already exists' });
    }

    const newRoommate = {
      id: Date.now().toString(),
      name: name.trim()
    };

    data.roommates.push(newRoommate);
    writeDataFile(data);
    
    res.status(201).json(newRoommate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add roommate' });
  }
});

// DELETE - Remove roommate
app.delete('/api/roommates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readDataFile();
    
    const initialLength = data.roommates.length;
    data.roommates = data.roommates.filter(r => r.id !== id);
    
    // Also remove from paidRoommateIds
    data.paidRoommateIds = data.paidRoommateIds.filter(pid => pid !== id);
    
    if (data.roommates.length === initialLength) {
      return res.status(404).json({ error: 'Roommate not found' });
    }

    writeDataFile(data);
    res.json({ message: 'Roommate deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete roommate' });
  }
});

// GET - Get expenses
app.get('/api/expenses', (req, res) => {
  try {
    const data = readDataFile();
    
    // Convert dates from YYYY-MM-DD to DD-MM-YYYY if needed
    const formatDateToDDMMYYYY = (dateString) => {
      if (!dateString) return dateString;
      
      // If already in DD-MM-YYYY format, return as is
      if (dateString.includes('-') && dateString.split('-')[0].length === 2) {
        return dateString;
      }
      
      // Convert from YYYY-MM-DD to DD-MM-YYYY
      try {
        const parts = dateString.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          const [year, month, day] = parts;
          return `${day}-${month}-${year}`;
        }
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        }
      } catch (error) {
        // If parsing fails, return original
      }
      return dateString;
    };
    
    // Convert all expense dates to DD-MM-YYYY format
    const expenses = data.expenses.map(expense => ({
      ...expense,
      date: formatDateToDDMMYYYY(expense.date)
    }));
    
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read expenses' });
  }
});

// POST - Add expense
app.post('/api/expenses', (req, res) => {
  try {
    const expense = req.body;
    
    if (!expense.name || !expense.amount) {
      return res.status(400).json({ error: 'Name and amount are required' });
    }

    if (expense.type === 'Settlement' && !expense.to) {
      return res.status(400).json({ error: 'Recipient is required for settlement' });
    }

    if (expense.type === 'Settlement' && expense.name === expense.to) {
      return res.status(400).json({ error: 'Spender and recipient cannot be the same' });
    }

    const data = readDataFile();
    
    // Format date to DD-MM-YYYY
    const formatDateToDDMMYYYY = (dateString) => {
      if (!dateString) {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        return `${day}-${month}-${year}`;
      }
      
      // If already in DD-MM-YYYY format, return as is
      if (dateString.includes('-') && dateString.split('-')[0].length === 2) {
        return dateString;
      }
      
      // Convert from YYYY-MM-DD to DD-MM-YYYY
      try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        }
      } catch (error) {
        // If parsing fails, return original
      }
      return dateString;
    };
    
    const newExpense = {
      ...expense,
      id: Date.now().toString(),
      amount: parseFloat(expense.amount),
      date: formatDateToDDMMYYYY(expense.date)
    };

    data.expenses.unshift(newExpense); // Add to beginning
    writeDataFile(data);
    
    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

// DELETE - Remove expense
app.delete('/api/expenses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readDataFile();
    
    const initialLength = data.expenses.length;
    data.expenses = data.expenses.filter(e => e.id !== id);
    
    if (data.expenses.length === initialLength) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    writeDataFile(data);
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// PUT - Update fixed costs
app.put('/api/fixed-costs', (req, res) => {
  try {
    const { rent, electricity } = req.body;
    
    if (typeof rent !== 'number' || typeof electricity !== 'number') {
      return res.status(400).json({ error: 'Rent and electricity must be numbers' });
    }

    const data = readDataFile();
    data.fixedCosts = {
      rent: rent || 0,
      electricity: electricity || 0
    };
    
    writeDataFile(data);
    res.json(data.fixedCosts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update fixed costs' });
  }
});

// PUT - Update paid roommate IDs
app.put('/api/paid-roommates', (req, res) => {
  try {
    const { paidRoommateIds } = req.body;
    
    if (!Array.isArray(paidRoommateIds)) {
      return res.status(400).json({ error: 'paidRoommateIds must be an array' });
    }

    const data = readDataFile();
    data.paidRoommateIds = paidRoommateIds;
    
    writeDataFile(data);
    res.json(data.paidRoommateIds);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update paid roommates' });
  }
});

// POST - Import complete data
app.post('/api/import', (req, res) => {
  try {
    const importedData = req.body;
    
    // Validate structure
    if (!importedData.roommates || !Array.isArray(importedData.roommates)) {
      return res.status(400).json({ error: 'Invalid data: roommates array is missing' });
    }
    if (!importedData.expenses || !Array.isArray(importedData.expenses)) {
      return res.status(400).json({ error: 'Invalid data: expenses array is missing' });
    }
    if (!importedData.fixedCosts || typeof importedData.fixedCosts.rent !== 'number') {
      return res.status(400).json({ error: 'Invalid data: fixed costs are missing or invalid' });
    }

    writeDataFile(importedData);
    res.json({ message: 'Data imported successfully', data: importedData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import data' });
  }
});

// GET - Get shared purchases
app.get('/api/shared-purchases', (req, res) => {
  try {
    const data = readDataFile();
    res.json(data.sharedPurchases || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read shared purchases' });
  }
});

// POST - Add shared purchase
app.post('/api/shared-purchases', (req, res) => {
  try {
    const purchase = req.body;
    
    // Validate required fields
    if (!purchase.itemName || purchase.itemName.trim() === '') {
      return res.status(400).json({ error: 'Item name is required' });
    }
    if (!purchase.amount || isNaN(parseFloat(purchase.amount))) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    if (!purchase.buyer || purchase.buyer.trim() === '') {
      return res.status(400).json({ error: 'Buyer is required' });
    }
    if (!purchase.payer || purchase.payer.trim() === '') {
      return res.status(400).json({ error: 'Payer is required' });
    }

    // Allow buyer and payer to be the same - no validation needed

    const data = readDataFile();
    if (!data.sharedPurchases) {
      data.sharedPurchases = [];
    }
    
    // Format date to DD-MM-YYYY
    const formatDateToDDMMYYYY = (dateString) => {
      if (!dateString) {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        return `${day}-${month}-${year}`;
      }
      
      // If already in DD-MM-YYYY format, return as is
      if (dateString.includes('-') && dateString.split('-')[0].length === 2) {
        return dateString;
      }
      
      // Convert from YYYY-MM-DD to DD-MM-YYYY
      try {
        const parts = dateString.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          const [year, month, day] = parts;
          return `${day}-${month}-${year}`;
        }
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        }
      } catch (error) {
        // If parsing fails, return original
      }
      return dateString;
    };
    
    const newPurchase = {
      ...purchase,
      id: Date.now().toString(),
      amount: parseFloat(purchase.amount),
      date: formatDateToDDMMYYYY(purchase.date)
    };

    data.sharedPurchases.unshift(newPurchase); // Add to beginning
    writeDataFile(data);
    
    res.status(201).json(newPurchase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add shared purchase' });
  }
});

// DELETE - Delete shared purchase
app.delete('/api/shared-purchases/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readDataFile();
    
    if (!data.sharedPurchases) {
      return res.status(404).json({ error: 'Shared purchase not found' });
    }

    const index = data.sharedPurchases.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Shared purchase not found' });
    }

    data.sharedPurchases.splice(index, 1);
    writeDataFile(data);
    res.json({ message: 'Shared purchase deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete shared purchase' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Data file: ${DATA_FILE}`);
});

