# RoomieSplit Backend Server

Node.js Express server for managing RoomieSplit expense data in `data-template.json`.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3001`

## API Endpoints

### Data Management
- `GET /api/data` - Get all data
- `POST /api/import` - Import complete data structure

### Roommates
- `GET /api/roommates` - Get all roommates
- `POST /api/roommates` - Add a new roommate
  - Body: `{ "name": "John Doe" }`
- `DELETE /api/roommates/:id` - Delete a roommate

### Expenses
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Add a new expense
  - Body: `{ "name": "John", "type": "Grocery", "amount": 50.00, "date": "2024-01-15", "paymode": "UPI", "note": "Weekly groceries" }`
- `DELETE /api/expenses/:id` - Delete an expense

### Fixed Costs
- `PUT /api/fixed-costs` - Update fixed costs
  - Body: `{ "rent": 1200, "electricity": 150 }`

### Paid Roommates
- `PUT /api/paid-roommates` - Update paid roommate IDs
  - Body: `{ "paidRoommateIds": ["1", "2"] }`

## Data Storage

All data is stored in `data-template.json` in the project root. The file is automatically updated whenever data changes through the API.

## Notes

- The server uses CORS to allow requests from the frontend
- All data is persisted to `data-template.json` immediately
- Metadata (totals, last updated) is automatically calculated

