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