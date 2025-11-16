import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import Dashboard from './components/Dashboard';
import ReceiptUploadUI from './components/ReceiptUploadUI';
import LineItemsSelectPage from './components/LineItemsSelectPage';
import BudgetDashboard from './components/BudgetDashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<ReceiptUploadUI />} />
          <Route path="/receipts/:receiptId/select-items" element={<LineItemsSelectPage />} />
          <Route path="/budget" element={<BudgetDashboard />} /> {}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
