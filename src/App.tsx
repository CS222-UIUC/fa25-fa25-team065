import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { getOrCreateUserByAuth } from './lib/supabase';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import Dashboard from './components/Dashboard';
import ReceiptUploadUI from './components/ReceiptUploadUI';
import LineItemsSelectPage from './components/LineItemsSelectPage';
import ThankYouPage from './components/ThankYouPage';

function AppContent() {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const email = session.user.email ?? null;
          const userId = await getOrCreateUserByAuth(session.user.id, email);
          
          // Fetch user data from users table
          const { data: userData, error } = await supabase
            .from('users')
            .select('id, email, username')
            .eq('id', userId)
            .single();

          if (error) {
            console.error('Error fetching user data:', error);
            return;
          }

          // Store user data in localStorage
          if (userData) {
            localStorage.setItem('user', JSON.stringify({
              id: userData.id,
              email: userData.email,
              username: userData.username
            }));
          }

          // Redirect to dashboard
          navigate('/dashboard');
        } catch (error) {
          console.error('Error handling SIGNED_IN event:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        // Clear user data from localStorage
        localStorage.removeItem('user');
        // Navigate to home page if not already there
        if (window.location.pathname !== '/') {
          navigate('/');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<ReceiptUploadUI />} />
        <Route path="/receipts/:receiptId/select-items" element={<LineItemsSelectPage />} />
        <Route path="/thank-you" element={<ThankYouPage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
