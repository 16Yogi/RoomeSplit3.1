// Use relative URL for production (nginx proxy) or absolute URL from env
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

// Helper function for API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
};

// Roommates API
export const roommatesAPI = {
  getAll: () => apiCall('/roommates'),
  add: (name: string) => apiCall('/roommates', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
  delete: (id: string) => apiCall(`/roommates/${id}`, {
    method: 'DELETE',
  }),
};

// Expenses API
export const expensesAPI = {
  getAll: () => apiCall('/expenses'),
  add: (expense: any) => apiCall('/expenses', {
    method: 'POST',
    body: JSON.stringify(expense),
  }),
  delete: (id: string) => apiCall(`/expenses/${id}`, {
    method: 'DELETE',
  }),
};

// Fixed Costs API
export const fixedCostsAPI = {
  update: (rent: number, electricity: number) => apiCall('/fixed-costs', {
    method: 'PUT',
    body: JSON.stringify({ rent, electricity }),
  }),
};

// Paid Roommates API
export const paidRoommatesAPI = {
  update: (paidRoommateIds: string[]) => apiCall('/paid-roommates', {
    method: 'PUT',
    body: JSON.stringify({ paidRoommateIds }),
  }),
};

// Data API
export const dataAPI = {
  getAll: () => apiCall('/data'),
  import: (data: any) => apiCall('/import', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Shared Purchases API
export const sharedPurchasesAPI = {
  getAll: () => apiCall('/shared-purchases'),
  add: (purchase: any) => apiCall('/shared-purchases', {
    method: 'POST',
    body: JSON.stringify(purchase),
  }),
  delete: (id: string) => apiCall(`/shared-purchases/${id}`, {
    method: 'DELETE',
  }),
};

