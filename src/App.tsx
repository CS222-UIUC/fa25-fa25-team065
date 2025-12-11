import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { getOrCreateUserByAuth } from './lib/supabase';
import LandingPage from './components/1_LandingPage';
import LoginPage from './components/2_LoginPage';
import RegisterPage from './components/7_RegisterPage';
import ReceiptUploadUI from './components/4_ReceiptUploadUI';
import LineItemsSelectPage from './components/5_LineItemsSelectPage';
import ThankYouPage from './components/6_ThankYouPage';
import NotificationsPage from './components/8_NotificationsPage';
import BudgetDashboard from './components/8_BudgetDashboard';

function AppContent() {
  const navigate = useNavigate();

  // Helper function to restore user data from session
  const restoreUserFromSession = async (session: any) => {
    if (!session?.user) return;
    
    try {
      const email = session.user.email ?? null;
      // Extract name from Google OAuth user metadata
      // Google provides name in user_metadata.full_name or user_metadata.name
      const name = session.user.user_metadata?.full_name || 
                  session.user.user_metadata?.name || 
                  null;
      console.log('🔵 [App] Extracted email:', email, 'name:', name);
      
      const userId = await getOrCreateUserByAuth(session.user.id, email, name);
      console.log('🔵 [App] User ID:', userId);
      
      // Fetch user data from users table
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, email, username, name')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ [App] Error fetching user data:', error);
        return;
      }

      // Store user data in localStorage
      if (userData) {
        console.log('🔵 [App] Storing user data in localStorage:', userData);
        localStorage.setItem('user', JSON.stringify({
          id: userData.id,
          email: userData.email,
          username: userData.username,
          name: userData.name
        }));
      }
    } catch (error) {
      console.error('❌ [App] Error restoring user from session:', error);
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if localStorage has user data
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          console.log('🔵 [App] Session exists but localStorage is empty, restoring...');
          await restoreUserFromSession(session);
        }
      }
    };
    checkExistingSession();
  }, []);

  useEffect(() => {
    console.log('🔵 [App] Setting up auth state listener...');
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔵 [App] Auth state change event:', event, 'Session:', session ? 'exists' : 'null');
      
      // Handle both SIGNED_IN and INITIAL_SESSION events
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        console.log('🔵 [App] SIGNED_IN/INITIAL_SESSION event detected');
        await restoreUserFromSession(session);
        
        // Only navigate on SIGNED_IN (not INITIAL_SESSION to avoid redirect loops)
        if (event === 'SIGNED_IN') {
          console.log('🔵 [App] Navigating to notifications page...');
          navigate('/notifications');
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('🔴 [App] SIGNED_OUT event detected');
        // Clear user data from localStorage
        console.log('🔴 [App] Clearing localStorage...');
        localStorage.removeItem('user');
        console.log('🔴 [App] localStorage cleared');
        // Navigate to home page if not already there
        const currentPath = window.location.pathname;
        console.log('🔴 [App] Current path:', currentPath);
        if (currentPath !== '/') {
          console.log('🔴 [App] Navigating to landing page...');
          navigate('/', { replace: true });
          console.log('🔴 [App] Navigation called');
        } else {
          console.log('🔴 [App] Already on landing page, no navigation needed');
        }
      }
    });

    return () => {
      console.log('🔵 [App] Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/upload" element={<ReceiptUploadUI />} />
        <Route path="/receipts/:receiptId/select-items" element={<LineItemsSelectPage />} />
        <Route path="/thank-you" element={<ThankYouPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/budget" element={<BudgetDashboard />} />
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
