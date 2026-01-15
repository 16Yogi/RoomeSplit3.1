/**
 * Convert date from YYYY-MM-DD to DD-MM-YYYY format
 */
export const formatDateToDDMMYYYY = (dateString: string): string => {
  if (!dateString) return '';
  
  // If already in DD-MM-YYYY format, return as is
  if (dateString.includes('-') && dateString.split('-')[0].length === 2) {
    return dateString;
  }
  
  // Convert from YYYY-MM-DD to DD-MM-YYYY
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Try parsing as DD-MM-YYYY
      const parts = dateString.split('-');
      if (parts.length === 3 && parts[0].length === 2) {
        return dateString;
      }
      return dateString;
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    return dateString;
  }
};

/**
 * Convert date from DD-MM-YYYY to YYYY-MM-DD format (for date inputs)
 */
export const formatDateToYYYYMMDD = (dateString: string): string => {
  if (!dateString) return '';
  
  // If already in YYYY-MM-DD format, return as is
  if (dateString.includes('-') && dateString.split('-')[0].length === 4) {
    return dateString;
  }
  
  // Convert from DD-MM-YYYY to YYYY-MM-DD
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 2) {
        // DD-MM-YYYY format
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
      } else if (parts[0].length === 4) {
        // Already YYYY-MM-DD
        return dateString;
      }
    }
    return dateString;
  } catch (error) {
    return dateString;
  }
};

/**
 * Parse DD-MM-YYYY date string to Date object
 */
export const parseDDMMYYYY = (dateString: string): Date | null => {
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Check if date is within date range
 */
export const isDateInRange = (dateString: string, startDate: string | null, endDate: string | null): boolean => {
  if (!startDate && !endDate) return true;
  
  const date = parseDDMMYYYY(dateString);
  if (!date) return false;
  
  if (startDate) {
    const start = parseDDMMYYYY(startDate);
    if (start && date < start) return false;
  }
  
  if (endDate) {
    const end = parseDDMMYYYY(endDate);
    if (end) {
      // Set end date to end of day
      end.setHours(23, 59, 59, 999);
      if (date > end) return false;
    }
  }
  
  return true;
};

/**
 * Get month-year string from date (DD-MM-YYYY or YYYY-MM-DD format)
 * Also handles MM-YYYY format for month strings
 * Returns format: "MM-YYYY" or "Month YYYY"
 */
export const getMonthYear = (dateString: string, format: 'numeric' | 'text' = 'numeric'): string => {
  if (!dateString) return '';
  
  try {
    let date: Date | null = null;
    const parts = dateString.split('-');
    
    // Check if it's already in MM-YYYY format (for month strings)
    if (parts.length === 2 && parts[0].length === 2 && parts[1].length === 4) {
      const [month, year] = parts;
      if (format === 'text') {
        date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
      return dateString; // Already in MM-YYYY format
    }
    
    // Check if it's YYYY-MM-DD format (first part is 4 digits)
    if (parts.length === 3 && parts[0].length === 4) {
      const [year, month, day] = parts;
      date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    } 
    // Check if it's DD-MM-YYYY format (first part is 2 digits)
    else if (parts.length === 3 && parts[0].length === 2) {
      const [day, month, year] = parts;
      date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    }
    
    // Validate the date
    if (!date || isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return dateString;
    }
    
    if (format === 'text') {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${year}`;
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return dateString;
  }
};

/**
 * Get all unique month-years from expenses
 */
export const getUniqueMonths = (expenses: { date: string }[]): string[] => {
  const months = new Set<string>();
  expenses.forEach(expense => {
    const monthYear = getMonthYear(expense.date);
    if (monthYear) {
      months.add(monthYear);
    }
  });
  return Array.from(months).sort((a, b) => {
    // Sort by year then month (MM-YYYY format)
    const [monthA, yearA] = a.split('-').map(Number);
    const [monthB, yearB] = b.split('-').map(Number);
    if (yearA !== yearB) return yearB - yearA; // Newest first
    return monthB - monthA; // Newest first
  });
};

/**
 * Filter expenses by month-year
 */
export const filterExpensesByMonth = <T extends { date: string }>(expenses: T[], monthYear: string): T[] => {
  return expenses.filter(expense => getMonthYear(expense.date) === monthYear);
};

