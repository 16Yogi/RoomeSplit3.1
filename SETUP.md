# RoomieSplit Setup Guide

## Backend Setup (Node.js)

1. **Navigate to server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the backend server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

   The server will run on `http://localhost:3001`

## Frontend Setup

1. **Install frontend dependencies (if not already done):**
   ```bash
   npm install
   ```

2. **Start the frontend development server:**
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:3000`

## How It Works

- **Backend Server**: Stores all form data in `data-template.json`
- **Frontend**: Makes API calls to the backend to save/load data
- **Auto-Save**: All form submissions automatically save to the JSON file via the API

## API Endpoints

- `GET /api/data` - Get all data
- `GET /api/roommates` - Get all roommates
- `POST /api/roommates` - Add roommate
- `DELETE /api/roommates/:id` - Delete roommate
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Add expense
- `DELETE /api/expenses/:id` - Delete expense
- `PUT /api/fixed-costs` - Update fixed costs
- `PUT /api/paid-roommates` - Update paid roommates
- `POST /api/import` - Import complete data

## Data Storage

All data is automatically saved to `data-template.json` in the project root whenever:
- A roommate is added
- An expense is submitted
- Fixed costs are updated
- Paid roommate status changes

The JSON file structure:
```json
{
  "version": "1.0.0",
  "exportDate": "...",
  "roommates": [...],
  "expenses": [...],
  "fixedCosts": {
    "rent": 0,
    "electricity": 0
  },
  "paidRoommateIds": [],
  "metadata": {...}
}
```

