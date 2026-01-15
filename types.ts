
export enum ExpenseType {
  VEGETABLE = 'Vegetable',
  MART = 'Mart',
  GROCERY = 'Grocery',
  RENT = 'Rent',
  ELECTRICITY = 'Electricity',
  SETTLEMENT = 'Settlement',
  OTHER = 'Other'
}

export enum PayMode {
  CASH = 'Cash',
  UPI = 'UPI',
  CARD = 'Card',
  NET_BANKING = 'Net Banking'
}

export interface Expense {
  id: string;
  name: string;
  to?: string; 
  type: ExpenseType;
  date: string;
  amount: number;
  paymode: PayMode;
  note?: string;
}

export interface Roommate {
  id: string;
  name: string;
}

export interface SharedPurchase {
  id: string;
  itemName: string;
  amount: number;
  buyer: string; // Who bought the item
  payer: string; // Who paid for the item
  date: string;
  paymode: PayMode;
  note?: string;
  splitBetween?: string[]; // Array of roommate names who will split this item
  perPersonAmount?: number; // Amount per person when split
}
