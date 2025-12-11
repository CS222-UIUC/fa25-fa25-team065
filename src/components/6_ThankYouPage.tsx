import React from 'react';
import { useNavigate } from 'react-router-dom';

const ThankYouPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Success Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
            <svg 
              className="w-12 h-12 text-green-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>
        </div>

        {/* Main Message */}
        <h1 className="text-4xl font-bold text-secondary-900 mb-4">
          All Set! 🎉
        </h1>
        
        <p className="text-xl text-secondary-600 mb-8">
          Your receipt has been split successfully. Everyone knows what they owe!
        </p>

        {/* Budget Recommendation Card */}
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <svg 
              className="w-8 h-8 text-primary-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
              />
            </svg>
            <h3 className="text-lg font-bold text-primary-900">
              Track Your Spending!
            </h3>
          </div>
          <p className="text-primary-800 mb-4">
            Log this expense in your Budget Dashboard and get AI-powered predictions for next month's spending.
          </p>
          <button
            onClick={() => navigate('/budget')}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
              />
            </svg>
            Go to Budget Dashboard
          </button>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-secondary-900 mb-4">
            What's Next?
          </h2>
          <div className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary-600 text-sm font-bold">1</span>
              </div>
              <p className="text-secondary-700">
                Share the split details with your friends
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary-600 text-sm font-bold">2</span>
              </div>
              <p className="text-secondary-700">
                Collect payments via Venmo, PayPal, or Cash
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary-600 text-sm font-bold">3</span>
              </div>
              <p className="text-secondary-700">
                <strong className="text-primary-600">Recommended:</strong> Log this expense in your Budget Dashboard to track spending and get AI predictions
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary-600 text-sm font-bold">4</span>
              </div>
              <p className="text-secondary-700">
                Upload another receipt anytime!
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/upload')}
            className="btn-primary text-lg px-8 py-3"
          >
            Split Another Receipt
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="btn-secondary text-lg px-8 py-3"
          >
            Back to Home
          </button>
        </div>

        {/* Footer Note */}
        <p className="mt-8 text-sm text-secondary-500">
          Thanks for using Splitify! 💙
        </p>
      </div>
    </div>
  );
};

export default ThankYouPage;