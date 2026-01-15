import { Expense, Roommate } from '../types';

export interface RoomieSplitData {
  version: string;
  exportDate: string;
  roommates: Roommate[];
  expenses: Expense[];
  fixedCosts: {
    rent: number;
    electricity: number;
  };
  paidRoommateIds: string[];
  metadata?: {
    totalExpenses: number;
    totalRoommates: number;
    lastUpdated?: string;
  };
}

/**
 * Generate complete JSON data structure from all form data
 */
export const generateJSONData = (
  roommates: Roommate[],
  expenses: Expense[],
  fixedRent: number,
  electricityBill: number,
  paidRoommateIds: string[]
): RoomieSplitData => {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  return {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    roommates,
    expenses,
    fixedCosts: {
      rent: fixedRent,
      electricity: electricityBill,
    },
    paidRoommateIds,
    metadata: {
      totalExpenses,
      totalRoommates: roommates.length,
      lastUpdated: new Date().toISOString(),
    },
  };
};

/**
 * Export data to JSON file (download)
 */
export const exportToJSONFile = (
  data: RoomieSplitData,
  filename?: string
): void => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `roomiesplit_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting JSON:', error);
    throw new Error('Failed to export JSON file');
  }
};

/**
 * Import data from JSON file
 */
export const importFromJSONFile = (
  file: File
): Promise<RoomieSplitData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data: RoomieSplitData = JSON.parse(text);
        
        // Validate data structure
        if (!data.roommates || !Array.isArray(data.roommates)) {
          throw new Error('Invalid data: roommates array is missing');
        }
        if (!data.expenses || !Array.isArray(data.expenses)) {
          throw new Error('Invalid data: expenses array is missing');
        }
        if (typeof data.fixedCosts?.rent !== 'number' || typeof data.fixedCosts?.electricity !== 'number') {
          throw new Error('Invalid data: fixed costs are missing or invalid');
        }
        
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file format'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Validate imported data structure
 */
export const validateImportedData = (data: any): data is RoomieSplitData => {
  return (
    data &&
    Array.isArray(data.roommates) &&
    Array.isArray(data.expenses) &&
    data.fixedCosts &&
    typeof data.fixedCosts.rent === 'number' &&
    typeof data.fixedCosts.electricity === 'number'
  );
};

