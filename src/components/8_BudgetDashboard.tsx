import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Expense = {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  month: string;
  created_at?: string;
};

type Prediction = {
  [category: string]: number;
};

type Recommendation = {
  type: "warning" | "success" | "tip";
  message: string;
  action: string;
};

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://splitify-ml-backend.onrender.com/api";
const AVAILABLE_CATEGORIES = [
  "Groceries",
  "Transportation",
  "Entertainment",
  "Dining Out",
  "Utilities",
  "Shopping",
  "Healthcare",
  "Subscriptions",
];

export default function BudgetDashboard() {
  const navigate = useNavigate();
  const [budget, setBudget] = useState(2000);
  const [currentMonth, setCurrentMonth] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(""); // Month for new expense
  const [predictions, setPredictions] = useState<Prediction | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [predictionError, setPredictionError] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    const getUserId = () => {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.id) {
        console.log("📊 [Budget] User ID from localStorage:", user.id);
        setUserId(user.id);
      } else {
        console.error("❌ [Budget] No user ID found");
        navigate("/login");
      }
    };
    getUserId();
  }, [navigate]);

  // Initialize current month
  useEffect(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setCurrentMonth(monthStr);
    setSelectedMonth(monthStr); // Default to current month
  }, []);

  // Load expenses from Supabase
  useEffect(() => {
    if (!userId) return;

    const loadExpenses = async () => {
      setIsLoadingExpenses(true);
      console.log("📊 [Budget] Loading expenses for user:", userId);
      
      try {
        const { data, error } = await supabase
          .from("expenses")
          .select("*")
          .eq("user_id", userId)
          .order("month", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) {
          console.error("❌ [Budget] Error loading expenses:", error);
          throw error;
        }

        console.log("✅ [Budget] Loaded expenses:", data?.length || 0);
        setExpenses(data || []);
      } catch (error) {
        console.error("❌ [Budget] Failed to load expenses:", error);
      } finally {
        setIsLoadingExpenses(false);
      }
    };

    loadExpenses();
  }, [userId]);

  // Calculate totals for current month
  const currentMonthExpenses = expenses.filter((e) => e.month === currentMonth);
  const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget - totalSpent;

  // Group expenses by category for current month
  const categoryTotals = currentMonthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const addExpense = async () => {
    if (!newCategory || !newAmount || !userId || !selectedMonth) {
      console.warn("⚠️ [Budget] Missing required fields");
      return;
    }
    
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setIsSavingExpense(true);
    console.log("💾 [Budget] Saving expense:", { category: newCategory, amount, month: selectedMonth });

    try {
      const newExpense = {
        user_id: userId,
        category: newCategory.trim(),
        amount: amount,
        month: selectedMonth, // Use selected month instead of current month
      };

      const { data, error } = await supabase
        .from("expenses")
        .insert([newExpense])
        .select()
        .single();

      if (error) {
        console.error("❌ [Budget] Error saving expense:", error);
        throw error;
      }

      console.log("✅ [Budget] Expense saved:", data);
      
      // Add to local state
      if (data) {
        setExpenses([data, ...expenses]);
      }

      // Clear form
      setNewCategory("");
      setNewAmount("");
      setShowCustomCategory(false);
      
      // Clear predictions so user knows to refresh
      if (predictions) {
        setPredictions(null);
      }
    } catch (error) {
      console.error("❌ [Budget] Failed to save expense:", error);
      alert("Failed to add expense. Please try again.");
    } finally {
      setIsSavingExpense(false);
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;

    console.log("🗑️ [Budget] Deleting expense:", expenseId);

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId)
        .eq("user_id", userId); // Security: ensure user owns this expense

      if (error) {
        console.error("❌ [Budget] Error deleting expense:", error);
        throw error;
      }

      console.log("✅ [Budget] Expense deleted");
      
      // Remove from local state
      setExpenses(expenses.filter((e) => e.id !== expenseId));
      
      // Clear predictions
      if (predictions) {
        setPredictions(null);
      }
    } catch (error) {
      console.error("❌ [Budget] Failed to delete expense:", error);
      alert("Failed to delete expense. Please try again.");
    }
  };

  const getPredictions = async () => {
    setIsLoadingPrediction(true);
    setPredictionError("");
    console.log("🤖 [Budget] Requesting AI predictions...");

    try {
      // Prepare history data grouped by month
      const monthlyData: Record<string, Record<string, number>> = {};

      expenses.forEach((expense) => {
        if (!monthlyData[expense.month]) {
          monthlyData[expense.month] = {};
        }
        monthlyData[expense.month][expense.category] =
          (monthlyData[expense.month][expense.category] || 0) + expense.amount;
      });

      // Get all unique categories across all months
      const allCategories = new Set<string>();
      Object.values(monthlyData).forEach((categories) => {
        Object.keys(categories).forEach((cat) => allCategories.add(cat));
      });

      // Convert to API format - ensure all months have all categories (fill missing with 0)
      // This prevents NaN values in the backend DataFrame
      const history = Object.entries(monthlyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, categories]) => {
          const normalized: Record<string, number | string> = { month };
          // Ensure every category exists in every month, defaulting to 0 if missing
          allCategories.forEach((cat) => {
            normalized[cat] = categories[cat] || 0;
          });
          return normalized;
        });

      console.log("📤 [Budget] Sending history to API:", history.length, "months");
      console.log("📤 [Budget] Categories normalized:", Array.from(allCategories).sort());

      // Call prediction API
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ history }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get predictions");
      }

      const result = await response.json();
      console.log("✅ [Budget] Prediction result:", result);

      // Extract predictions (excluding 'total')
      const { total, ...categoryPredictions } = result.predictions;
      setPredictions(categoryPredictions);

      // Get recommendations
      console.log("🤖 [Budget] Requesting recommendations...");
      const recResponse = await fetch(`${API_BASE_URL}/recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          predictions: categoryPredictions,
          current_budget: budget,
        }),
      });

      if (recResponse.ok) {
        const recResult = await recResponse.json();
        console.log("✅ [Budget] Recommendations:", recResult.recommendations?.length || 0);
        setRecommendations(recResult.recommendations || []);
      }
    } catch (error) {
      console.error("❌ [Budget] Prediction error:", error);
      setPredictionError(
        error instanceof Error ? error.message : "Failed to get predictions"
      );
    } finally {
      setIsLoadingPrediction(false);
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "warning":
        return (
          <svg
            className="w-5 h-5 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      case "success":
        return (
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  const hasEnoughHistory = new Set(expenses.map((e) => e.month)).size >= 3;
  const predictedTotal = predictions
    ? Object.values(predictions).reduce((sum, val) => sum + val, 0)
    : 0;

  if (isLoadingExpenses) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-primary-600 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-secondary-600">Loading your expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary-600 tracking-tight">
            AI-Powered Budget Dashboard
          </h1>
          <button
            className="px-3 py-1.5 text-sm rounded-md border border-secondary-300 hover:bg-secondary-100 text-secondary-700"
            onClick={() => navigate("/notifications")}
          >
            Back to Home
          </button>
        </div>
      </header>

      {/* Page body */}
      <main className="max-w-7xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        {/* Left: Budget summary + Controls */}
        <section className="lg:col-span-2 space-y-6">
          {/* Budget summary card */}
          <div className="rounded-2xl border border-secondary-200 bg-white p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-secondary-800">
                Current Month Overview
              </h2>
              <div className="text-sm text-secondary-500">{currentMonth}</div>
            </div>
            <div className="grid grid-cols-3 text-center gap-4">
              <div>
                <p className="text-sm text-secondary-500">Total Budget</p>
                <p className="text-2xl font-bold text-primary-600">
                  ${budget.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-secondary-500">Spent</p>
                <p className="text-2xl font-bold text-red-500">
                  ${totalSpent.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-secondary-500">Remaining</p>
                <p
                  className={`text-2xl font-bold ${
                    remaining < 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  ${remaining.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="h-2 w-full bg-secondary-200 rounded mt-4">
              <div
                className={`h-2 rounded transition-all ${
                  remaining < 0 ? "bg-red-500" : "bg-primary-600"
                }`}
                style={{
                  width: `${Math.min((totalSpent / budget) * 100, 100)}%`,
                }}
              ></div>
            </div>
          </div>

          {/* AI Predictions Card */}
          <div className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
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
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-secondary-800">
                  AI Budget Predictions
                </h2>
                <p className="text-sm text-secondary-600">
                  {hasEnoughHistory
                    ? "Based on your spending patterns"
                    : "Add expenses for 3+ different months"}
                </p>
              </div>
            </div>

            {!hasEnoughHistory && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  📊 You have {new Set(expenses.map((e) => e.month)).size} month(s) of data. Add expenses for at least 3 different months to unlock AI predictions!
                </p>
              </div>
            )}

            {predictions ? (
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-secondary-200">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-secondary-800">
                      Next Month's Predictions
                    </h3>
                    <span className="text-2xl font-bold text-primary-600">
                      ${predictedTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(predictions)
                      .sort((a, b) => b[1] - a[1])
                      .map(([category, amount]) => (
                        <div
                          key={category}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-secondary-700">{category}</span>
                          <span className="font-medium text-secondary-900">
                            ${amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Comparison with current month */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-3 border border-secondary-200">
                    <p className="text-secondary-500 mb-1">Current Spending</p>
                    <p className="text-lg font-bold text-secondary-900">
                      ${totalSpent.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-secondary-200">
                    <p className="text-secondary-500 mb-1">Predicted Change</p>
                    <p
                      className={`text-lg font-bold ${
                        predictedTotal > totalSpent
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {predictedTotal > totalSpent ? "+" : ""}
                      {((predictedTotal - totalSpent) / (totalSpent || 1) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPredictions(null)}
                  className="w-full text-sm text-primary-600 hover:text-primary-700"
                >
                  Update Predictions
                </button>
              </div>
            ) : (
              <button
                onClick={getPredictions}
                disabled={!hasEnoughHistory || isLoadingPrediction}
                className="w-full rounded-md bg-primary-600 text-white px-4 py-3 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoadingPrediction ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Get AI Predictions
                  </>
                )}
              </button>
            )}

            {predictionError && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{predictionError}</p>
              </div>
            )}
          </div>

          {/* Add expense form */}
          <div className="rounded-2xl border border-secondary-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-secondary-800 mb-4">
              Add Expense
            </h2>
            <div className="space-y-4">
              {/* Month selector */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Month
                </label>
                <select
                  className="w-full rounded-md border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  disabled={isSavingExpense}
                >
                  <option value="">Select Month</option>
                  {/* Generate last 6 months + current + next 3 months */}
                  {(() => {
                    const months = [];
                    const now = new Date();
                    for (let i = -6; i <= 3; i++) {
                      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
                      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                      const displayName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                      months.push(
                        <option key={monthStr} value={monthStr}>
                          {displayName}
                        </option>
                      );
                    }
                    return months;
                  })()}
                </select>
              </div>

              {/* Category and Amount */}
              <div className="flex items-center gap-2">
                <select
                  className="flex-1 rounded-md border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={showCustomCategory ? "custom" : newCategory}
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setShowCustomCategory(true);
                      setNewCategory("");
                    } else {
                      setShowCustomCategory(false);
                      setNewCategory(e.target.value);
                    }
                  }}
                  disabled={isSavingExpense}
                >
                  <option value="">Select Category</option>
                  {AVAILABLE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="custom">+ Custom Category</option>
                </select>
                <input
                  className="w-32 rounded-md border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  type="number"
                  placeholder="Amount"
                  step="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  disabled={isSavingExpense}
                />
              </div>

              {showCustomCategory && (
                <input
                  className="w-full rounded-md border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter custom category name"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  disabled={isSavingExpense}
                />
              )}

              <button
                onClick={addExpense}
                disabled={isSavingExpense}
                className="w-full rounded-md bg-primary-600 text-white px-4 py-2 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
              >
                {isSavingExpense ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Add Expense"
                )}
              </button>
            </div>
          </div>

          {/* Current Month Expenses */}
          <div className="rounded-2xl border border-secondary-200 bg-white">
            <div className="px-4 py-3 border-b border-secondary-200">
              <h3 className="font-medium text-secondary-800">
                Current Month Expenses by Category
              </h3>
            </div>
            {Object.keys(categoryTotals).length > 0 ? (
              <ul className="divide-y divide-secondary-200">
                {Object.entries(categoryTotals)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => (
                    <li
                      key={category}
                      className="px-4 py-3 flex justify-between text-sm"
                    >
                      <span className="text-secondary-700">{category}</span>
                      <span className="font-medium text-secondary-900">
                        ${amount.toFixed(2)}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center text-secondary-500">
                No expenses for this month yet
              </div>
            )}
          </div>

          {/* All Expenses List */}
          <div className="rounded-2xl border border-secondary-200 bg-white">
            <div className="px-4 py-3 border-b border-secondary-200 flex justify-between items-center">
              <h3 className="font-medium text-secondary-800">All Expenses</h3>
              <span className="text-sm text-secondary-500">
                {expenses.length} total
              </span>
            </div>
            {expenses.length > 0 ? (
              <ul className="divide-y divide-secondary-200 max-h-96 overflow-y-auto">
                {expenses.map((expense) => (
                  <li
                    key={expense.id}
                    className="px-4 py-3 flex justify-between items-center text-sm hover:bg-secondary-50"
                  >
                    <div>
                      <p className="text-secondary-900 font-medium">
                        {expense.category}
                      </p>
                      <p className="text-secondary-500 text-xs">
                        {expense.month}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-secondary-900">
                        ${expense.amount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete expense"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center text-secondary-500">
                No expenses yet. Add your first expense above!
              </div>
            )}
          </div>
        </section>

        {/* Right: AI Recommendations + Tips */}
        <aside className="space-y-6">
          {/* AI Recommendations */}
          {recommendations.length > 0 && (
            <div className="rounded-2xl border border-secondary-200 bg-white p-4">
              <h3 className="font-medium text-secondary-800 mb-3 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary-600"
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
                AI Recommendations
              </h3>
              <ul className="space-y-3">
                {recommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      rec.type === "warning"
                        ? "bg-yellow-50 border-yellow-200"
                        : rec.type === "success"
                        ? "bg-green-50 border-green-200"
                        : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex gap-2 items-start">
                      {getRecommendationIcon(rec.type)}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-secondary-900">
                          {rec.message}
                        </p>
                        <p className="text-xs text-secondary-600 mt-1">
                          {rec.action}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* General Tips */}
          <div className="rounded-2xl border border-secondary-200 bg-white p-4">
            <h3 className="font-medium text-secondary-800 mb-2">
              Budgeting Tips
            </h3>
            <ul className="mt-2 text-sm text-secondary-600 space-y-2">
              <li className="flex gap-2">
                <span>💡</span>
                <span>Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings</span>
              </li>
              <li className="flex gap-2">
                <span>📊</span>
                <span>Review your spending patterns weekly</span>
              </li>
              <li className="flex gap-2">
                <span>🎯</span>
                <span>Set specific savings goals each month</span>
              </li>
              <li className="flex gap-2">
                <span>🔔</span>
                <span>Track subscriptions to avoid hidden costs</span>
              </li>
            </ul>
          </div>

          {/* Expense History Stats */}
          <div className="rounded-2xl border border-secondary-200 bg-white p-4">
            <h3 className="font-medium text-secondary-800 mb-2">
              Expense History
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary-600">Total Entries:</span>
                <span className="font-medium">{expenses.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600">Unique Months:</span>
                <span className="font-medium">
                  {new Set(expenses.map((e) => e.month)).size}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600">Categories Used:</span>
                <span className="font-medium">
                  {new Set(expenses.map((e) => e.category)).size}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}