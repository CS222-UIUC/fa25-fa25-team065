import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">Splitify</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleGetStarted}
                className="btn-primary"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-secondary-900 mb-6">
            Smart Bill Splitting & 
            <span className="text-primary-600"> Budgeting</span> for Students
          </h1>
          
          <p className="text-xl text-secondary-600 mb-8 max-w-2xl mx-auto">
            Upload receipts, split bills fairly, and get personalized budget recommendations. 
            Make managing money simple and stress-free.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button 
              onClick={handleGetStarted}
              className="btn-primary text-lg px-8 py-3"
            >
              Start Splitting Bills
            </button>
            <button className="btn-secondary text-lg px-8 py-3">
              Learn More
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-secondary-200">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">Smart Receipt Scanning</h3>
              <p className="text-secondary-600">
                Upload receipts and let AI extract line items automatically with OCR technology.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-secondary-200">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">Fair Bill Splitting</h3>
              <p className="text-secondary-600">
                Assign items to different people and automatically calculate fair splits including tax and tip.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-secondary-200">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">AI Budgeting</h3>
              <p className="text-secondary-600">
                Get personalized monthly budget recommendations based on your spending habits and goals.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-secondary-500">
            <p>&copy; 2024 Splitify. Built for college students by college students.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
