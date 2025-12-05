import React, { useState } from "react";

type Expense = {
  id: string;
  category: string;
  amount: number;
};

export default function BudgetDashboard() {
  const [budget, setBudget] = useState(2000);
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: "1", category: "Groceries", amount: 180 },
    { id: "2", category: "Transportation", amount: 75 },
    { id: "3", category: "Entertainment", amount: 120 },
  ]);
  const [newCategory, setNewCategory] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget - totalSpent;

  const addExpense = () => {
    if (!newCategory || !newAmount) return;
    setExpenses([
      ...expenses,
      {
        id: crypto.randomUUID(),
        category: newCategory.trim(),
        amount: parseFloat(newAmount),
      },
    ]);
    setNewCategory("");
    setNewAmount("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary-600 tracking-tight">
            Budget Dashboard
          </h1>
          <button
            className="px-3 py-1.5 text-sm rounded-md border border-secondary-300 hover:bg-secondary-100 text-secondary-700"
            onClick={() => (window.location.href = "/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Page body */}
      <main className="max-w-5xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        {/* Left: Summary + Add expense */}
        <section className="lg:col-span-2 space-y-6">
          {/* Budget summary card */}
          <div className="rounded-2xl border border-secondary-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-secondary-800 mb-4">
              Overview
            </h2>
            <div className="grid grid-cols-3 text-center">
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
                className={`h-2 rounded ${
                  remaining < 0 ? "bg-red-500" : "bg-primary-600"
                }`}
                style={{
                  width: `${Math.min((totalSpent / budget) * 100, 100)}%`,
                }}
              ></div>
            </div>
          </div>

          {/* Add expense form */}
          <div className="rounded-2xl border border-secondary-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-secondary-800 mb-4">
              Add Expense
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                className="w-full rounded-md border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                type="number"
                placeholder="Amount"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
              <button
                onClick={addExpense}
                className="rounded-md bg-primary-600 text-white px-4 py-2 hover:bg-primary-700 text-sm"
              >
                Add
              </button>
            </div>
          </div>

          {/* Expense list */}
          <div className="rounded-2xl border border-secondary-200 bg-white">
            <div className="px-4 py-3 border-b border-secondary-200">
              <h3 className="font-medium text-secondary-800">Recent Expenses</h3>
            </div>
            <ul className="divide-y divide-secondary-200">
              {expenses.map((e) => (
                <li
                  key={e.id}
                  className="px-4 py-3 flex justify-between text-sm text-secondary-700"
                >
                  <span>{e.category}</span>
                  <span className="font-medium">${e.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Right: Tips / analytics mock */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-secondary-200 bg-white p-4">
            <h3 className="font-medium text-secondary-800">Tips</h3>
            <ul className="mt-2 text-sm text-secondary-600 list-disc pl-5 space-y-1">
              <li>Set aside 20% of your income for savings.</li>
              <li>Track subscriptions and recurring charges.</li>
              <li>Review your spending weekly.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-secondary-200 bg-white p-4">
            <h3 className="font-medium text-secondary-800 mb-2">
              Spending Breakdown
            </h3>
            <ul className="space-y-2 text-sm text-secondary-700">
              {expenses.map((e) => (
                <li key={e.id} className="flex justify-between">
                  <span>{e.category}</span>
                  <span className="text-secondary-500">
                    ${e.amount.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}