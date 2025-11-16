import React from "react";
import { useNavigate } from "react-router-dom";
import { SupabaseAuthService } from "../services/supabaseAuthService";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await SupabaseAuthService.signOut();
      localStorage.removeItem("user");
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Navbar */}
      <header className="sticky top-0 z-10 bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-600 tracking-tight">
            Splitify
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-secondary-600">
              Welcome, {user.username || user.email || "User"} 👋
            </span>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 text-sm rounded-md border border-secondary-300 hover:bg-secondary-100 text-secondary-700 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Page body */}
      <main className="max-w-7xl mx-auto px-4 py-10 space-y-10">
        {/* Hero header */}
        <section className="text-center">
          <h2 className="text-4xl font-bold text-secondary-900 mb-3">
            Welcome to Splitify 🎉
          </h2>
          <p className="text-lg text-secondary-600">
            Manage your expenses, receipts, and groups — all in one place.
          </p>
        </section>

        {/* Action Cards */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Upload Receipts */}
          <div
            onClick={() => navigate("/upload")}
            className="cursor-pointer bg-white rounded-2xl border border-secondary-200 p-6 hover:shadow-md transition hover:-translate-y-1"
          >
            <div className="p-3 rounded-full bg-primary-100 w-fit mb-3">
              <svg
                className="w-6 h-6 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 16v-8m0 0l-3 3m3-3l3 3M4 20h16"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-secondary-900 text-lg">
              Upload Receipts
            </h3>
            <p className="text-sm text-secondary-600 mt-1">
              Drag, drop, or scan receipts to extract totals and merchants
              instantly.
            </p>
          </div>

          {/* Budget Dashboard */}
          <div
            onClick={() => navigate("/budget")}
            className="cursor-pointer bg-white rounded-2xl border border-secondary-200 p-6 hover:shadow-md transition hover:-translate-y-1"
          >
            <div className="p-3 rounded-full bg-green-100 w-fit mb-3">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-2.28 0-4 1.72-4 4s1.72 4 4 4 4-1.72 4-4-1.72-4-4-4z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-secondary-900 text-lg">
              Manage Budget
            </h3>
            <p className="text-sm text-secondary-600 mt-1">
              Visualize your spending patterns and manage your financial goals
              easily.
            </p>
          </div>

          {/* Groups */}
          <div
            onClick={() => navigate("/groups")}
            className="cursor-pointer bg-white rounded-2xl border border-secondary-200 p-6 hover:shadow-md transition hover:-translate-y-1"
          >
            <div className="p-3 rounded-full bg-blue-100 w-fit mb-3">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a4 4 0 00-4-4h-1m-6 6H3v-2a4 4 0 014-4h1m4-5a4 4 0 110-8 4 4 0 010 8z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-secondary-900 text-lg">
              Manage Groups
            </h3>
            <p className="text-sm text-secondary-600 mt-1">
              Create or join shared groups to track and split bills effortlessly.
            </p>
          </div>
        </section>

        {/* Checklist - moved below */}
        <section className="bg-white border border-secondary-200 rounded-2xl shadow-sm p-8 max-w-3xl mx-auto mt-8">
          <h3 className="text-2xl font-semibold text-secondary-900 mb-6 text-center">
            Project Deliverables in Progress
          </h3>
          <ul className="space-y-4">
            {[
              "Supabase authentication configured",
              "User session and profile persistence",
              "Receipt upload & parsing UI complete",
              "Budget tracking dashboard connected",
              "Group creation & expense splitting in progress",
            ].map((item, idx) => (
              <li key={idx} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
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
                <span className="text-secondary-700">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
