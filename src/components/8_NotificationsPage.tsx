import React, { useEffect, useState } from 'react';
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
};

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [splits, setSplits] = useState<SplitWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [totalOwed, setTotalOwed] = useState<number>(0);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!user?.id) {
      navigate('/dashboard');
      return;
    }

    loadSplits();
  }, [user.id, navigate]);

  const loadSplits = async () => {
    try {
      setLoading(true);
      setError('');

      // First, get all splits where current user is a participant
      console.log('🔵 [Notifications] Loading splits for user:', user.id);
      const { data: splitsData, error: splitsError } = await supabase
        .from('splits')
        .select('id, receipt_id, payer_id, participant_id, amount_owed, split_type')
        .eq('participant_id', user.id);

      if (splitsError) {
        console.error('❌ [Notifications] Error loading splits:', splitsError);
        throw splitsError;
      }

      console.log('🔵 [Notifications] Splits found:', splitsData?.length || 0);
      
      if (!splitsData || splitsData.length === 0) {
        console.log('🔵 [Notifications] No splits found - user has no debts');
        setSplits([]);
        setTotalOwed(0);
        setLoading(false);
        return;
      }

      // Get unique receipt IDs and payer IDs
      const receiptIds = Array.from(new Set(splitsData.map((s: any) => s.receipt_id)));
      const payerIds = Array.from(new Set(splitsData.map((s: any) => s.payer_id)));

      // Fetch receipt details
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('receipts')
        .select('id, merchant_name, date_uploaded, total_amount')
        .in('id', receiptIds);

      if (receiptsError) {
        console.error('Error fetching receipts:', receiptsError);
      }

      // Fetch payer details
      const { data: payersData, error: payersError } = await supabase
        .from('users')
        .select('id, name, username, email')
        .in('id', payerIds);

      if (payersError) {
        console.error('Error fetching payers:', payersError);
      }

      // Combine the data
      const splitsWithDetails: SplitWithDetails[] = splitsData.map((split: any) => {
        const receipt = receiptsData?.find((r: any) => r.id === split.receipt_id);
        const payer = payersData?.find((p: any) => p.id === split.payer_id);

        return {
          ...split,
          receipt: receipt || null,
          payer: payer || null,
        };
      });

      // Sort by receipt date (newest first)
      splitsWithDetails.sort((a, b) => {
        const dateA = a.receipt?.date_uploaded ? new Date(a.receipt.date_uploaded).getTime() : 0;
        const dateB = b.receipt?.date_uploaded ? new Date(b.receipt.date_uploaded).getTime() : 0;
        return dateB - dateA;
      });

      setSplits(splitsWithDetails);

      // Calculate total owed
      const total = splitsWithDetails.reduce((sum, split) => sum + (split.amount_owed || 0), 0);
      setTotalOwed(Math.round(total * 100) / 100);
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
              <span className="text-secondary-600">Welcome, {user.name || user.username || user.email}!</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary-900 mb-2">
            My Debts
          </h1>
          <p className="text-xl text-secondary-600">
            Track what you owe to others
          </p>
        </div>

        {/* Total Owed Summary */}
        {!loading && (
          <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-secondary-700 mb-1">Total Amount Owed</h2>
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
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-secondary-600">Loading your debts...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadSplits}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Splits List */}
        {!loading && !error && (
          <>
            {splits.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-secondary-400"
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
                <h3 className="mt-4 text-lg font-semibold text-secondary-900">You have none!</h3>
                <p className="mt-2 text-secondary-600">
                  No debts to pay right now.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {splits.map((split) => (
                  <div
                    key={split.id}
                    className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-secondary-900">
                            {split.receipt?.merchant_name || 'Unknown Merchant'}
                          </h3>
                          {split.receipt?.date_uploaded && (
                            <span className="text-sm text-secondary-500">
                              {formatDate(split.receipt.date_uploaded)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-secondary-600">
                          <span>You owe</span>
                          <span className="font-semibold text-secondary-900">
                            {getPayerName(split.payer)}
                          </span>
                          <span>for this receipt</span>
                        </div>
                        {split.receipt?.total_amount && (
                          <p className="text-sm text-secondary-500 mt-1">
                            Receipt total: {formatCurrency(split.receipt.total_amount)}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(split.amount_owed)}
                        </p>
                        <p className="text-xs text-secondary-500 mt-1">
                          {split.split_type === 'item_based' ? 'Item-based split' : 'Equal split'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
