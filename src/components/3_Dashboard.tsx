import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SupabaseAuthService } from '../services/supabaseAuthService';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    console.log('🔴 [Dashboard] Sign out initiated');
    setIsSigningOut(true);
    
    // Clear localStorage immediately
    console.log('🔴 [Dashboard] Clearing localStorage...');
    localStorage.removeItem('user');
    console.log('🔴 [Dashboard] localStorage cleared');
    
    // Navigate immediately (don't wait for signOut)
    console.log('🔴 [Dashboard] Navigating to landing page...');
    navigate('/', { replace: true });
    console.log('🔴 [Dashboard] Navigation called');
    
    // Try to sign out from Supabase in the background (don't block on it)
    try {
      console.log('🔴 [Dashboard] Calling SupabaseAuthService.signOut()...');
      // Use Promise.race with timeout to prevent hanging
      const signOutPromise = SupabaseAuthService.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timeout')), 3000)
      );
      
      await Promise.race([signOutPromise, timeoutPromise]);
      console.log('🔴 [Dashboard] SupabaseAuthService.signOut() completed successfully');
    } catch (error) {
      console.error('❌ [Dashboard] Sign out error (non-blocking):', error);
      // Don't throw - we've already navigated and cleared localStorage
    } finally {
      console.log('🔴 [Dashboard] Setting isSigningOut to false');
      setIsSigningOut(false);
    }
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const uploadReady = true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">Splitify</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/notifications")}
                className="text-secondary-600 hover:text-secondary-900 flex items-center space-x-1"
                title="View my debts"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="text-sm">My Debts</span>
              </button>
              <span className="text-secondary-600">Welcome, {user.name || user.username || user.email}!</span>
              <button 
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-secondary-900 mb-4">
            Welcome to Splitify! 🎉
          </h1>
          <p className="text-xl text-secondary-600 mb-8">
            Your authentication is working perfectly!
          </p>
          
          <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-secondary-900 mb-4">
              Next Steps
            </h2>
            <div className="space-y-4 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-secondary-700">Supabase connection is configured</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-secondary-700">User session is active</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  uploadReady ? "bg-green-100" : "bg-blue-100"
                }`}>
                  {uploadReady ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                </div>
                <span className="text-secondary-700">
                  {uploadReady ? "Receipt upload UI added" : "Ready to add receipt upload functionality"}
                </span>
              </div>

              <button
                onClick={() => navigate("/upload")}
                className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Upload now
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="text-secondary-700">Ready to add bill splitting features</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
