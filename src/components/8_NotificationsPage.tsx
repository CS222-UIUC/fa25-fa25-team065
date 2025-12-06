import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type SplitWithDetails = {
  id: string;
  receipt_id: string;
  payer_id: string;
  participant_id: string;
  amount_owed: number;
  split_type: string;
  receipt?: {
    merchant_name: string | null;
    date_uploaded: string;
    total_amount: number | null;
  } | null;
  payer?: {
    name: string | null;
    username: string | null;
    email: string;
  } | null;
  participant?: {
    name: string | null;
    username: string | null;
    email: string;
  } | null;
};

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [splits, setSplits] = useState<SplitWithDetails[]>([]);
  const [owedToMe, setOwedToMe] = useState<SplitWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalOwedToMe, setTotalOwedToMe] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // ===========================================================
  // 1️⃣ Fetch splits, receipts, users
  // ===========================================================
  const loadSplits = useCallback(async (userId: string) => {
    try {
      setError('');

      // --- Fetch splits ---
      const { data: owesData, error: owesError } = await supabase
        .from('splits')
        .select('*')
        .eq('participant_id', userId);

      const { data: owedData, error: owedError } = await supabase
        .from('splits')
        .select('*')
        .eq('payer_id', userId);

      if (owesError || owedError) {
        throw owesError || owedError;
      }

      // --- Load receipts + users for debts ---
      const receiptIds1 = Array.from(new Set((owesData || []).map(s => s.receipt_id).filter(Boolean)));
      const payerIds = Array.from(new Set((owesData || []).map(s => s.payer_id).filter(Boolean)));

      let receipts1: any[] = [];
      let payers: any[] = [];

      if (receiptIds1.length > 0) {
        const { data } = await supabase
          .from('receipts')
          .select('*')
          .in('id', receiptIds1);
        receipts1 = data || [];
      }

      if (payerIds.length > 0) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .in('id', payerIds);
        payers = data || [];
      }

      const debts = (owesData || []).map(s => ({
        ...s,
        receipt: receipts1.find(r => r.id === s.receipt_id) || null,
        payer: payers.find(u => u.id === s.payer_id) || null
      }));

      // --- Load receipts + users for credits ---
      const receiptIds2 = Array.from(new Set((owedData || []).map(s => s.receipt_id).filter(Boolean)));
      const participantIds = Array.from(new Set((owedData || []).map(s => s.participant_id).filter(Boolean)));

      let receipts2: any[] = [];
      let participants: any[] = [];

      if (receiptIds2.length > 0) {
        const { data } = await supabase
          .from('receipts')
          .select('*')
          .in('id', receiptIds2);
        receipts2 = data || [];
      }

      if (participantIds.length > 0) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .in('id', participantIds);
        participants = data || [];
      }

      const credits = (owedData || []).map(s => ({
        ...s,
        receipt: receipts2.find(r => r.id === s.receipt_id) || null,
        participant: participants.find(u => u.id === s.participant_id) || null
      }));

      // Sort by date
      debts.sort((a, b) => new Date(b.receipt?.date_uploaded || 0).getTime() -
                            new Date(a.receipt?.date_uploaded || 0).getTime());

      credits.sort((a, b) => new Date(b.receipt?.date_uploaded || 0).getTime() -
                              new Date(a.receipt?.date_uploaded || 0).getTime());

      setSplits(debts);
      setOwedToMe(credits);

      setTotalOwed(Math.round(debts.reduce((sum, s) => sum + (s.amount_owed || 0), 0) * 100) / 100);
      setTotalOwedToMe(Math.round(credits.reduce((sum, s) => sum + (s.amount_owed || 0), 0) * 100) / 100);

    } catch (err: any) {
      console.error('Error loading splits:', err);
      setError(err.message || 'Failed to load data');
    }
  }, []);

  // ===========================================================
  // 2️⃣ MAIN DATA LOADER — Only load AFTER Supabase session restored
  // ===========================================================
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError('');

    // Wait for Supabase to restore session (prevents RLS race)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate('/dashboard');
      return;
    }

    // Load user from localStorage
    const stored = localStorage.getItem('user');
    if (!stored) {
      navigate('/dashboard');
      return;
    }

    const user = JSON.parse(stored);
    setCurrentUser(user);

    await loadSplits(user.id);
    setLoading(false);
  }, [navigate, loadSplits]);

  // ===========================================================
  // 3️⃣ Only run ONCE — avoids all race conditions
  // ===========================================================
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // ===========================================================
  // 4️⃣ Re-fetch when Supabase reauths (e.g. returning from tab)
  // ===========================================================
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && currentUser?.id) {
        console.log("Auth restored → refreshing data");
        loadSplits(currentUser.id);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [currentUser, loadSplits]);

  // ===========================================================
  // Helpers
  // ===========================================================
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const getDisplayName = (obj: any) =>
    obj?.name || obj?.username || obj?.email || 'Unknown';

  // ===========================================================
  // Render
  // ===========================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-secondary-600 hover:text-secondary-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-primary-600">Splitify</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-secondary-600">Welcome, {getDisplayName(currentUser)}!</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary-900 mb-2">
            Money Tracker
          </h1>
          <p className="text-xl text-secondary-600">
            Track who owes you and what you owe
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-secondary-600">Loading...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => currentUser?.id && loadSplits(currentUser.id)}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Who owes you */}
            <section>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-secondary-700 mb-1">Who Owes You</h2>
                    <p className="text-sm text-secondary-500">
                      {owedToMe.length} {owedToMe.length === 1 ? 'person' : 'people'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(totalOwedToMe)}
                    </p>
                  </div>
                </div>
              </div>

              {owedToMe.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-8 text-center">
                  <svg
                    className="mx-auto h-10 w-10 text-secondary-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-3 text-sm font-semibold text-secondary-900">You have none!</h3>
                  <p className="mt-1 text-xs text-secondary-600">
                    No one owes you money.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {owedToMe.map(s => (
                    <div key={s.id} className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-base font-semibold text-secondary-900">
                              {s.receipt?.merchant_name || 'Unknown Merchant'}
                            </h3>
                            {s.receipt?.date_uploaded && (
                              <span className="text-xs text-secondary-500">
                                {formatDate(s.receipt.date_uploaded)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-secondary-600">
                            <span className="font-semibold text-secondary-900">
                              {getDisplayName(s.participant)}
                            </span>
                            <span>owes you</span>
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-xl font-bold text-green-600">
                            {formatCurrency(s.amount_owed)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Your debts */}
            <section>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-secondary-700 mb-1">Your Debts</h2>
                    <p className="text-sm text-secondary-500">
                      {splits.length} {splits.length === 1 ? 'debt' : 'debts'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-red-600">
                      {formatCurrency(totalOwed)}
                    </p>
                  </div>
                </div>
              </div>

              {splits.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-8 text-center">
                  <svg
                    className="mx-auto h-10 w-10 text-secondary-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-3 text-sm font-semibold text-secondary-900">You have none!</h3>
                  <p className="mt-1 text-xs text-secondary-600">
                    No debts to pay right now.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {splits.map(s => (
                    <div key={s.id} className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-base font-semibold text-secondary-900">
                              {s.receipt?.merchant_name || 'Unknown Merchant'}
                            </h3>
                            {s.receipt?.date_uploaded && (
                              <span className="text-xs text-secondary-500">
                                {formatDate(s.receipt.date_uploaded)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-secondary-600">
                            <span>You owe</span>
                            <span className="font-semibold text-secondary-900">
                              {getDisplayName(s.payer)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-xl font-bold text-red-600">
                            {formatCurrency(s.amount_owed)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
