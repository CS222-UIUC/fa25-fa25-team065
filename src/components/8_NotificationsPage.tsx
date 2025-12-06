import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [splits, setSplits] = useState<SplitWithDetails[]>([]); // What user owes
  const [owedToMe, setOwedToMe] = useState<SplitWithDetails[]>([]); // Who owes user
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [totalOwed, setTotalOwed] = useState<number>(0);
  const [totalOwedToMe, setTotalOwedToMe] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<{ id: string; name?: string; username?: string; email?: string } | null>(null);

  // Load user from localStorage once on mount
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (user?.id) {
          setCurrentUser(user);
        } else {
          navigate('/dashboard');
        }
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
        navigate('/dashboard');
      }
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Reload data every time this route becomes active (fixes React Router caching issue)
  // This ensures data refreshes when navigating back to this page even if component doesn't remount
  useEffect(() => {
    if (currentUser?.id && location.pathname === '/notifications') {
      console.log('🔁 Route active → loading/refreshing splits');
      loadSplits(currentUser.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, currentUser?.id]);

  const loadSplits = async (userId: string) => {
    try {
      setLoading(true);
      setError('');

      console.log('🔵 [Notifications] Loading splits for user:', userId);

      // Load splits where user owes (participant_id = userId)
      const { data: splitsData, error: splitsError } = await supabase
        .from('splits')
        .select('id, receipt_id, payer_id, participant_id, amount_owed, split_type')
        .eq('participant_id', userId);

      // Load splits where user is owed (payer_id = userId)
      const { data: owedToMeData, error: owedToMeError } = await supabase
        .from('splits')
        .select('id, receipt_id, payer_id, participant_id, amount_owed, split_type')
        .eq('payer_id', userId);

      if (splitsError) {
        console.error('❌ [Notifications] Error loading splits:', splitsError);
        throw splitsError;
      }

      if (owedToMeError) {
        console.error('❌ [Notifications] Error loading owed to me:', owedToMeError);
        throw owedToMeError;
      }

      console.log('🔵 [Notifications] Splits found (user owes):', splitsData?.length || 0);
      console.log('🔵 [Notifications] Splits found (owed to user):', owedToMeData?.length || 0);

      // Process splits where user owes
      let splitsWithDetails: SplitWithDetails[] = [];
      if (splitsData && splitsData.length > 0) {
        const receiptIds = Array.from(new Set(splitsData.map((s: any) => s.receipt_id)));
        const payerIds = Array.from(new Set(splitsData.map((s: any) => s.payer_id)));

        // Only query if we have IDs to query
        if (receiptIds.length > 0 && payerIds.length > 0) {
          const { data: receiptsData } = await supabase
            .from('receipts')
            .select('id, merchant_name, date_uploaded, total_amount')
            .in('id', receiptIds);

          const { data: payersData } = await supabase
            .from('users')
            .select('id, name, username, email')
            .in('id', payerIds);

          splitsWithDetails = splitsData.map((split: any) => {
            const receipt = receiptsData?.find((r: any) => r.id === split.receipt_id);
            const payer = payersData?.find((p: any) => p.id === split.payer_id);
            return { ...split, receipt: receipt || null, payer: payer || null };
          });

          splitsWithDetails.sort((a, b) => {
            const dateA = a.receipt?.date_uploaded ? new Date(a.receipt.date_uploaded).getTime() : 0;
            const dateB = b.receipt?.date_uploaded ? new Date(b.receipt.date_uploaded).getTime() : 0;
            return dateB - dateA;
          });
        }
      }

      // Process splits where user is owed
      let owedToMeWithDetails: SplitWithDetails[] = [];
      if (owedToMeData && owedToMeData.length > 0) {
        const receiptIds = Array.from(new Set(owedToMeData.map((s: any) => s.receipt_id)));
        const participantIds = Array.from(new Set(owedToMeData.map((s: any) => s.participant_id)));

        // Only query if we have IDs to query
        if (receiptIds.length > 0 && participantIds.length > 0) {
          const { data: receiptsData } = await supabase
            .from('receipts')
            .select('id, merchant_name, date_uploaded, total_amount')
            .in('id', receiptIds);

          const { data: participantsData } = await supabase
            .from('users')
            .select('id, name, username, email')
            .in('id', participantIds);

          owedToMeWithDetails = owedToMeData.map((split: any) => {
            const receipt = receiptsData?.find((r: any) => r.id === split.receipt_id);
            const participant = participantsData?.find((p: any) => p.id === split.participant_id);
            return { ...split, receipt: receipt || null, participant: participant || null };
          });

          owedToMeWithDetails.sort((a, b) => {
            const dateA = a.receipt?.date_uploaded ? new Date(a.receipt.date_uploaded).getTime() : 0;
            const dateB = b.receipt?.date_uploaded ? new Date(b.receipt.date_uploaded).getTime() : 0;
            return dateB - dateA;
          });
        }
      }

      setSplits(splitsWithDetails);
      setOwedToMe(owedToMeWithDetails);

      // Calculate totals
      const totalOwedAmount = splitsWithDetails.reduce((sum, split) => sum + (split.amount_owed || 0), 0);
      const totalOwedToMeAmount = owedToMeWithDetails.reduce((sum, split) => sum + (split.amount_owed || 0), 0);
      setTotalOwed(Math.round(totalOwedAmount * 100) / 100);
      setTotalOwedToMe(Math.round(totalOwedToMeAmount * 100) / 100);
    } catch (e) {
      console.error('Error loading splits:', e);
      setError(e instanceof Error ? e.message : 'Failed to load your debts');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const getPayerName = (payer: SplitWithDetails['payer']) => {
    if (!payer) return 'Unknown';
    return payer.name || payer.username || payer.email || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Navigation Bar */}
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
              <span className="text-secondary-600">Welcome, {currentUser?.name || currentUser?.username || currentUser?.email}!</span>
            </div>
          </div>
        </div>
      </nav>

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

        {/* Two Column Layout */}
        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Who Owes You */}
            <div>
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
                  {owedToMe.map((split) => (
                    <div
                      key={split.id}
                      className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-base font-semibold text-secondary-900">
                              {split.receipt?.merchant_name || 'Unknown Merchant'}
                            </h3>
                            {split.receipt?.date_uploaded && (
                              <span className="text-xs text-secondary-500">
                                {formatDate(split.receipt.date_uploaded)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-secondary-600">
                            <span className="font-semibold text-secondary-900">
                              {split.participant?.name || split.participant?.username || split.participant?.email || 'Unknown'}
                            </span>
                            <span>owes you</span>
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-xl font-bold text-green-600">
                            {formatCurrency(split.amount_owed)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Your Debts */}
            <div>
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
                  {splits.map((split) => (
                    <div
                      key={split.id}
                      className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-base font-semibold text-secondary-900">
                              {split.receipt?.merchant_name || 'Unknown Merchant'}
                            </h3>
                            {split.receipt?.date_uploaded && (
                              <span className="text-xs text-secondary-500">
                                {formatDate(split.receipt.date_uploaded)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-secondary-600">
                            <span>You owe</span>
                            <span className="font-semibold text-secondary-900">
                              {getPayerName(split.payer)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-xl font-bold text-red-600">
                            {formatCurrency(split.amount_owed)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
