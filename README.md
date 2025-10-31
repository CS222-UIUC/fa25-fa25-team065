# Splitify Frontend

A modern React frontend for Splitify - a smart bill splitting and budgeting application for college students.

## Features

- **Welcome Landing Page**: Beautiful, responsive landing page showcasing Splitify's features
- **Login System**: Clean login form with username and password fields
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)

## Project Structure

```
src/
├── components/
│   ├── LandingPage.tsx    # Welcome landing page
│   └── LoginPage.tsx      # Login form component
├── App.tsx                # Main app component with routing
├── index.tsx              # App entry point
└── index.css              # Global styles with Tailwind CSS
```

## Technologies Used

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe JavaScript
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Create React App** - Development toolchain

## Demo

The login form accepts any non-empty username and password combination for demonstration purposes. In a production environment, this would integrate with your authentication backend.

## Next Steps

This frontend provides the foundation for the Splitify application. Future development would include:

- Dashboard page after successful login
- Receipt upload functionality
- Bill splitting interface
- Budget management features
- Integration with backend APIs

supabase: 
REACT_APP_SUPABASE_URL = https://cotvriuzmnpyipmraoro.supabase.co
REACT_APP_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvdHZyaXV6bW5weWlwbXJhb3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NzgxODcsImV4cCI6MjA3NzQ1NDE4N30.cnTRN1xl7H-3ePTMq2msJbtrGTfWaEOdGom-PpxZk_A