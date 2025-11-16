import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

type Group = {
  id: string;
  name: string;
  members: string[];
};

export default function GroupsPage() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState<Group[]>([
    { id: "1", name: "Roommates 🏠", members: ["you", "alex", "morgan"] },
    { id: "2", name: "Spring Break 🌴", members: ["you", "jess", "sam", "lee"] },
  ]);
  const [newGroupName, setNewGroupName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup = {
      id: crypto.randomUUID(),
      name: newGroupName.trim(),
      members: ["you"],
    };
    setGroups([...groups, newGroup]);
    setNewGroupName("");
  };

  const addMember = () => {
    if (!selectedGroup || !inviteEmail.trim()) return;
    const updated = groups.map((g) =>
      g.id === selectedGroup.id
        ? { ...g, members: [...g.members, inviteEmail.trim()] }
        : g
    );
    setGroups(updated);
    setInviteEmail("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary-600 tracking-tight">
            Groups
          </h1>
          <button
            className="px-3 py-1.5 text-sm rounded-md border border-secondary-300 hover:bg-secondary-100 text-secondary-700"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Page body */}
      <main className="max-w-5xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        {/* Left: Group List */}
        <section className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-secondary-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-secondary-800 mb-4">
              Your Groups
            </h2>

            {/* Add new group */}
            <div className="flex gap-3 mb-4">
              <input
                className="w-full rounded-md border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter group name (e.g., Roommates)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <button
                onClick={addGroup}
                className="rounded-md bg-primary-600 text-white px-4 py-2 hover:bg-primary-700 text-sm"
              >
                Create
              </button>
            </div>

            {/* Group cards */}
            {groups.length === 0 ? (
              <p className="text-secondary-500 text-sm">
                You haven’t created any groups yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {groups.map((g) => (
                  <li
                    key={g.id}
                    className={`border border-secondary-200 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:border-primary-400 transition ${
                      selectedGroup?.id === g.id ? "bg-primary-50" : "bg-white"
                    }`}
                    onClick={() => setSelectedGroup(g)}
                  >
                    <div>
                      <h3 className="font-semibold text-secondary-800">
                        {g.name}
                      </h3>
                      <p className="text-sm text-secondary-600">
                        {g.members.length} members
                      </p>
                    </div>
                    <button
                      className="text-sm px-3 py-1.5 rounded-md bg-secondary-100 hover:bg-secondary-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGroup(g);
                      }}
                    >
                      View
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Selected group details */}
          {selectedGroup && (
            <div className="rounded-2xl border border-secondary-200 bg-white p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-secondary-800">
                  {selectedGroup.name}
                </h2>
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="text-sm text-secondary-500 hover:text-secondary-700"
                >
                  Close
                </button>
              </div>

              <p className="text-sm text-secondary-600 mb-4">
                Members of this group:
              </p>
              <ul className="space-y-1 text-secondary-700 mb-6">
                {selectedGroup.members.map((m, i) => (
                  <li key={i} className="text-sm">
                    • {m}
                  </li>
                ))}
              </ul>

              {/* Invite new member */}
              <div className="grid grid-cols-3 gap-3">
                <input
                  className="col-span-2 rounded-md border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Add member email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <button
                  onClick={addMember}
                  className="rounded-md bg-primary-600 text-white px-4 py-2 hover:bg-primary-700 text-sm"
                >
                  Invite
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Right: Tips or Info */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-secondary-200 bg-white p-4">
            <h3 className="font-medium text-secondary-800">Tips</h3>
            <ul className="mt-2 text-sm text-secondary-600 list-disc pl-5 space-y-1">
              <li>Keep receipts organized by group.</li>
              <li>Invite members before uploading receipts.</li>
              <li>Each group can share expenses automatically.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-secondary-200 bg-white p-4">
            <h3 className="font-medium text-secondary-800 mb-2">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate("/upload")}
                className="w-full text-sm text-left px-3 py-2 rounded-md bg-primary-50 text-primary-700 hover:bg-primary-100"
              >
                ➕ Upload a new receipt
              </button>
              <button
                onClick={() => navigate("/budget")}
                className="w-full text-sm text-left px-3 py-2 rounded-md bg-secondary-50 text-secondary-700 hover:bg-secondary-100"
              >
                💸 View Budget
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}