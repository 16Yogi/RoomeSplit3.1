# RoomieSplit 3.1

A modern, feature-rich expense management application designed for roommates to track shared expenses, split bills, and calculate settlements efficiently.

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Project](#running-the-project)
- [Project Structure](#project-structure)
- [Authentication](#authentication)
- [Usage](#usage)

## 🎯 About

RoomieSplit is a comprehensive expense tracking application that helps roommates manage shared expenses, track individual contributions, and automatically calculate who owes what to whom. The application features a clean, modern UI with real-time calculations and detailed financial insights.

### Key Capabilities

- **Expense Tracking**: Record and categorize various types of expenses (Grocery, Rent, Electricity, etc.)
- **Roommate Management**: Add and manage roommates
- **Settlement Calculations**: Automatically calculate debts and settlements between roommates
- **Item Split Calculator**: Split specific items among selected roommates
- **Billing History**: View detailed transaction history with filtering options
- **Fixed Costs Management**: Track monthly rent and electricity bills
- **Data Export/Import**: Export data to JSON or Excel formats
- **AI Insights**: Get smart financial insights (optional, requires API key)

## ✨ Features

- 📊 **Dashboard**: Overview of expenses, roommates, and fixed costs
- 💰 **Expense Management**: Add, view, and delete expenses with detailed categorization
- 👥 **Roommate Management**: Add and remove roommates
- 🧮 **Settlement Matrix**: Visual representation of who owes what to whom
- 📅 **Monthly Breakdown**: View expenses and settlements by month
- 🔍 **Advanced Filtering**: Filter expenses by date range, type, and search terms
- 📈 **Payment History**: Detailed payment history for each roommate
- 🔐 **Authentication**: Login system to protect edit/delete operations
- 📤 **Export Options**: Export data to JSON or Excel
- 🎨 **Modern UI**: Responsive design with beautiful, intuitive interface

## 🛠 Tech Stack

### Frontend
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Lucide React** - Icon library
- **Tailwind CSS** - Utility-first CSS framework
- **XLSX** - Excel file generation
- **Recharts** - Chart library (for visualizations)

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **CORS** - Cross-origin resource sharing

## 📦 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** (optional, for cloning the repository)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd RoomeSplit3.1
```

Or download and extract the project folder.

### 2. Install Frontend Dependencies

```bash
npm install
```

This will install all React and frontend dependencies.

### 3. Install Backend Dependencies

```bash
cd server
npm install
cd ..
```

## ⚙️ Configuration

### Environment Variables (Optional)

For AI Insights feature, create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**Note**: The application works without this API key. AI Insights will simply be unavailable.

### Authentication Credentials

Default login credentials are stored in `data-template.json`:

```json
{
  "auth": {
    "username": "admin",
    "password": "admin123"
  }
}
```

You can modify these credentials directly in `data-template.json` if needed.

## ▶️ Running the Project

### Step 1: Start the Backend Server

Open a terminal and navigate to the server directory:

```bash
cd server
npm start
```

The backend server will start on `http://localhost:3001`

**For development with auto-reload:**
```bash
npm run dev
```

### Step 2: Start the Frontend Development Server

Open a **new terminal** (keep the backend server running) and navigate to the project root:

```bash
npm run dev
```

The frontend will start on `http://localhost:3000`

### Step 3: Access the Application

Open your web browser and navigate to:

```
http://localhost:3000
```

## 📁 Project Structure

```
RoomeSplit3.1/
├── components/          # React components
│   ├── BillingHistory.tsx
│   ├── ExpenseList.tsx
│   ├── ItemSplitCalculator.tsx
│   ├── Login.tsx
│   ├── SettlementMatrix.tsx
│   ├── Sidebar.tsx
│   └── SummaryStats.tsx
├── server/              # Backend server
│   ├── index.js         # Express server
│   ├── package.json
│   └── README.md
├── utils/               # Utility functions
│   ├── api.ts          # API client
│   ├── dataStorage.ts  # Data export/import
│   └── dateUtils.ts    # Date formatting utilities
├── App.tsx             # Main application component
├── index.tsx           # Application entry point
├── types.ts            # TypeScript type definitions
├── data-template.json  # Data storage file
├── package.json        # Frontend dependencies
├── vite.config.ts      # Vite configuration
└── tsconfig.json       # TypeScript configuration
```

## 🔐 Authentication

RoomieSplit uses a simple authentication system:

- **Read Access**: All users can view data without logging in
- **Write Access**: Login required for editing, deleting, or updating data

### Default Credentials

- **Username**: `admin`
- **Password**: `admin123`

### How Authentication Works

1. Users can browse and view all data without authentication
2. When attempting to edit/delete/update, a login modal appears
3. After successful login, users can perform write operations
4. Login state persists across page refreshes (stored in localStorage)

## 💻 Usage

### Adding Roommates

1. Navigate to **Roommates** section
2. Enter roommate name in the input field
3. Click the **+** button or press Enter
4. *Note: Login required*

### Adding Expenses

1. Navigate to **Expenses** section
2. Fill in expense details (name, type, amount, date, payment mode)
3. Click **Add Expense**
4. *Note: Login required*

### Managing Fixed Costs

1. Navigate to **Roommates** section
2. Scroll to **Fixed Monthly Costs**
3. Enter Rent and Electricity amounts
4. Click **SUBMIT BILLS**
5. *Note: Login required*

### Viewing Settlements

1. Navigate to **Settlement** section
2. View the settlement matrix showing who owes what
3. Click on a roommate card to see detailed payment breakdown
4. Record payments directly from the settlement view

### Item Split Calculator

1. Navigate to **Item Split** section
2. Fill in item details (name, amount, buyer, payer)
3. Optionally select people to split the item between
4. Click **Add Purchase**
5. *Note: Login required*

### Exporting Data

1. Navigate to **Settings** section
2. Click **Export All Data to JSON** or **Export to Excel**
3. Files will be downloaded automatically

## 🔧 Troubleshooting

### Backend Server Not Starting

- Ensure port 3001 is not already in use
- Check that all dependencies are installed: `cd server && npm install`
- Verify Node.js version: `node --version` (should be v18+)

### Frontend Not Connecting to Backend

- Ensure backend server is running on port 3001
- Check browser console for CORS errors
- Verify proxy configuration in `vite.config.ts`

### Data Not Persisting

- Check that `data-template.json` exists in the project root
- Ensure the file has write permissions
- Check server console for error messages

### Login Not Working

- Verify credentials in `data-template.json`
- Check browser console for errors
- Clear browser localStorage if needed

## 📝 Notes

- All data is stored in `data-template.json` in JSON format
- The backend server must be running for the application to function
- Data is automatically saved when changes are made
- The application uses localStorage as a fallback if the API is unavailable

## 🤝 Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## 📄 License

This project is open source and available for personal use.

---

**Happy Expense Tracking! 💰**
