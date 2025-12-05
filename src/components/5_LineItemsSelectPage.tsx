import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type LineItem = {
  id: string;
  item_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
};

type Participant = {
  id: string; // receipt_participants.id
  user_id: string;
  username: string | null;
  email: string;
  color: string;
};

const currency = (n: number | null | undefined) =>
  typeof n === 'number' && !Number.isNaN(n) ? `$${n.toFixed(2)}` : '-';

const DEFAULT_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-orange-100 text-orange-800',
  'bg-pink-100 text-pink-800',
  'bg-indigo-100 text-indigo-800',
];

const LineItemsSelectPage: React.FC = () => {
  console.log('🔵 [LineItemsSelectPage] Component rendered/mounted');
  const { receiptId } = useParams<{ receiptId: string }>();
  console.log('🔵 [LineItemsSelectPage] receiptId from params:', receiptId);
  const navigate = useNavigate();
  const [items, setItems] = useState<LineItem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Set<string>>>({}); // itemId -> Set of participantIds
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newParticipantInput, setNewParticipantInput] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string | null; email: string; name: string | null }>>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load current user for adding self as participant
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}') as { id: string; email: string; username?: string };

  // Add participant by user ID
  const addParticipantByUserId = useCallback(async (userId: string, currentParticipants: Participant[] = participants) => {
    if (!receiptId) return;

    try {
      // Get user details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, email')
        .eq('id', userId)
        .single();

      if (userError || !userData) throw userError || new Error('User not found');

      // Check if already a participant
      if (currentParticipants.some(p => p.user_id === userId)) {
        setError('User is already a participant');
        return;
      }

      // Add to receipt_participants
      const color = DEFAULT_COLORS[currentParticipants.length % DEFAULT_COLORS.length];
      const { data: participantData, error: participantError } = await supabase
        .from('receipt_participants')
        .insert({
          receipt_id: receiptId,
          user_id: userId,
          color: color,
        })
        .select('id')
        .single();

      if (participantError || !participantData) throw participantError || new Error('Failed to add participant');

      // Add to local state
      const newParticipant: Participant = {
        id: participantData.id,
        user_id: userId,
        username: userData.username,
        email: userData.email,
        color: color,
      };
      setParticipants([...currentParticipants, newParticipant]);
      setNewParticipantInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add participant');
    }
  }, [receiptId, participants]);

  // Load items, participants, and assignments
  useEffect(() => {
    const fetchData = async () => {
      if (!receiptId) {
        setError('Missing receipt id');
        setLoading(false);
        return;
      }

      try {
        // Load line items
        const { data: itemsData, error: itemsError } = await supabase
          .from('line_items')
          .select('id, item_name, quantity, unit_price, total_price')
          .eq('receipt_id', receiptId)
          .order('item_name', { ascending: true });
        
        if (itemsError) throw itemsError;
        const loadedItems = itemsData || [];
        setItems(loadedItems);

        // Load participants
        const { data: participantsData, error: participantsError } = await supabase
          .from('receipt_participants')
          .select('id, user_id, color')
          .eq('receipt_id', receiptId);
        
        if (participantsError) throw participantsError;

        // Load user details for participants
        if (participantsData && participantsData.length > 0) {
          const userIds = participantsData.map(p => p.user_id);
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, username, email')
            .in('id', userIds);
          
          if (usersError) throw usersError;

          const participantsWithDetails: Participant[] = participantsData.map((p, index) => {
            const user = usersData?.find(u => u.id === p.user_id);
            return {
              id: p.id,
              user_id: p.user_id,
              username: user?.username || null,
              email: user?.email || '',
              color: p.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
            };
          });
          setParticipants(participantsWithDetails);

          // Load existing assignments
          // Get all line items for this receipt first
          const itemIds = loadedItems.map(item => item.id);
          if (itemIds.length > 0) {
            const participantUserIds = participantsWithDetails.map(p => p.user_id);
            const { data: assignmentsData, error: assignmentsError } = await supabase
              .from('line_item_assignments')
              .select('line_item_id, user_id')
              .in('line_item_id', itemIds)
              .in('user_id', participantUserIds);
            
            if (assignmentsError) throw assignmentsError;

            // Build assignments map: itemId -> Set of participantIds (not user_ids)
            const assignmentsMap: Record<string, Set<string>> = {};
            if (assignmentsData) {
              assignmentsData.forEach((a: { line_item_id: string; user_id: string }) => {
                // Find the participant with this user_id
                const participant = participantsWithDetails.find(p => p.user_id === a.user_id);
                if (participant) {
                  if (!assignmentsMap[a.line_item_id]) {
                    assignmentsMap[a.line_item_id] = new Set();
                  }
                  assignmentsMap[a.line_item_id].add(participant.id); // Use participant.id for internal tracking
                }
              });
            }
            setAssignments(assignmentsMap);
          }
        } else {
          // No participants yet - add current user as default
          if (currentUser.id) {
            // Add current user as default participant
            try {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, username, email')
                .eq('id', currentUser.id)
                .single();

              if (!userError && userData) {
                const color = DEFAULT_COLORS[0];
                const { data: participantData, error: participantError } = await supabase
                  .from('receipt_participants')
                  .insert({
                    receipt_id: receiptId,
                    user_id: currentUser.id,
                    color: color,
                  })
                  .select('id')
                  .single();

                if (!participantError && participantData) {
                  const newParticipant: Participant = {
                    id: participantData.id,
                    user_id: currentUser.id,
                    username: userData.username,
                    email: userData.email,
                    color: color,
                  };
                  setParticipants([newParticipant]);
                }
              }
            } catch (e) {
              // Silently fail - user can add themselves manually
              console.error('Failed to add current user as participant:', e);
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptId, currentUser.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Debug dropdown state changes
  useEffect(() => {
    console.log('🔵 [Dropdown] State changed - showDropdown:', showDropdown, 'searchResults.length:', searchResults.length);
    if (searchResults.length > 0) {
      console.log('🔵 [Dropdown] Search results available:', searchResults.map(u => u.name || u.username || u.email));
    }
  }, [showDropdown, searchResults]);

  // Search users by name as they type
  const searchUsers = useCallback(async (query: string) => {
    console.log('🔵 [Search] searchUsers called with query:', query);
    
    if (!query.trim() || query.length < 2) {
      console.log('🔵 [Search] Query too short, clearing results');
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      const searchTerm = query.trim();
      console.log('🔵 [Search] Sending search request for term:', searchTerm);
      console.log('🔵 [Search] Current participants:', participants.length);
      
      // Search by name (case-insensitive) - name is the primary search field
      // Also search username and email as fallback
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, email, name')
        .or(`name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);

      console.log('🔵 [Search] Search request returned');
      console.log('🔵 [Search] Response data:', usersData);
      console.log('🔵 [Search] Response error:', usersError);
      console.log('🔵 [Search] Number of users found:', usersData?.length || 0);

      if (usersError) {
        console.error('❌ [Search] Error searching users:', usersError);
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      // Filter out users who are already participants
      const filteredUsers = (usersData || []).filter(
        user => !participants.some(p => p.user_id === user.id)
      );

      console.log('🔵 [Search] After filtering participants:', filteredUsers.length, 'users');
      console.log('🔵 [Search] Filtered users:', filteredUsers.map(u => ({ name: u.name, username: u.username, email: u.email })));

      setSearchResults(filteredUsers);
      setShowDropdown(filteredUsers.length > 0);
      console.log('🔵 [Search] Search completed. Dropdown will show:', filteredUsers.length > 0);
    } catch (e) {
      console.error('❌ [Search] Error in searchUsers:', e);
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [participants]);

  // Handle input change with debounced search
  const handleInputChange = (value: string) => {
    console.log('🔵 [Input] handleInputChange called with value:', value);
    setNewParticipantInput(value);
    setError('');

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      console.log('🔵 [Input] Clearing previous timeout');
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    console.log('🔵 [Input] Setting timeout for search (300ms delay)');
    searchTimeoutRef.current = setTimeout(() => {
      console.log('🔵 [Input] Timeout fired, calling searchUsers');
      searchUsers(value);
    }, 300);
  };

  // Add participant by email or username
  const addParticipant = async () => {
    if (!newParticipantInput.trim()) {
      setError('Please enter an email or username');
      return;
    }

    if (!receiptId) {
      setError('Missing receipt id');
      return;
    }

    setAddingParticipant(true);
    setError('');

    try {
      // Try to find user by email or username
      const input = newParticipantInput.trim().toLowerCase();
      const isEmail = input.includes('@');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, email')
        .eq(isEmail ? 'email' : 'username', isEmail ? input : input)
        .single();

      if (userError || !userData) {
        setError(`User not found with ${isEmail ? 'email' : 'username'}: ${newParticipantInput}`);
        setAddingParticipant(false);
        return;
      }

      // Check if already a participant
      if (participants.some(p => p.user_id === userData.id)) {
        setError('User is already a participant');
        setAddingParticipant(false);
        return;
      }

      await addParticipantByUserId(userData.id, participants);
      setNewParticipantInput('');
      setShowDropdown(false);
      setSearchResults([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add participant');
    } finally {
      setAddingParticipant(false);
    }
  };

  // Handle selecting a user from dropdown
  const handleSelectUser = async (user: { id: string; username: string | null; email: string; name: string | null }) => {
    setAddingParticipant(true);
    setError('');
    setShowDropdown(false);
    setNewParticipantInput('');

    try {
      await addParticipantByUserId(user.id, participants);
      setSearchResults([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add participant');
    } finally {
      setAddingParticipant(false);
    }
  };

  // Remove participant
  const removeParticipant = async (participantId: string) => {
    if (participants.length <= 1) {
      setError('At least one participant is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('receipt_participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;

      // Remove from local state and assignments
      setParticipants(participants.filter(p => p.id !== participantId));
      const newAssignments = { ...assignments };
      Object.keys(newAssignments).forEach(itemId => {
        newAssignments[itemId].delete(participantId);
        if (newAssignments[itemId].size === 0) {
          delete newAssignments[itemId];
        }
      });
      setAssignments(newAssignments);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove participant');
    }
  };

  // Toggle item assignment to participant
  const toggleAssignment = (itemId: string, participantId: string) => {
    const newAssignments = { ...assignments };
    if (!newAssignments[itemId]) {
      newAssignments[itemId] = new Set();
    }
    
    if (newAssignments[itemId].has(participantId)) {
      newAssignments[itemId].delete(participantId);
      if (newAssignments[itemId].size === 0) {
        delete newAssignments[itemId];
      }
    } else {
      newAssignments[itemId].add(participantId);
    }
    
    setAssignments(newAssignments);
  };

  // Calculate splits
  const splits = useMemo(() => {
    const result: Record<string, number> = {};
    participants.forEach(p => {
      result[p.id] = 0;
    });

    items.forEach(item => {
      const assignedParticipantIds = assignments[item.id] || new Set();
      if (assignedParticipantIds.size > 0) {
        const splitAmount = (item.total_price || 0) / assignedParticipantIds.size;
        assignedParticipantIds.forEach(participantId => {
          result[participantId] = (result[participantId] || 0) + splitAmount;
        });
      }
    });

    return result;
  }, [items, participants, assignments]);

  const grandTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  }, [items]);

  // Save assignments
  const handleSave = async () => {
    if (!receiptId) {
      setError('Missing receipt id');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Delete all existing assignments for this receipt's items
      const itemIds = items.map(item => item.id);
      if (itemIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('line_item_assignments')
          .delete()
          .in('line_item_id', itemIds);

        if (deleteError) throw deleteError;
      }

      // Insert new assignments
      // Convert participantIds to user_ids
      const assignmentsToInsert: Array<{ line_item_id: string; user_id: string }> = [];
      Object.entries(assignments).forEach(([itemId, participantIds]) => {
        participantIds.forEach(participantId => {
          // Find participant by id to get user_id
          const participant = participants.find(p => p.id === participantId);
          if (participant) {
            assignmentsToInsert.push({
              line_item_id: itemId,
              user_id: participant.user_id, // Use user_id for database
            });
          }
        });
      });

      if (assignmentsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('line_item_assignments')
          .insert(assignmentsToInsert);

        if (insertError) throw insertError;
      }

      // Calculate and save splits
      console.log('🔵 [Splits] Starting split calculation...');
      
      // Get the receipt to find the payer (who uploaded the receipt)
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .select('id, user_id')
        .eq('id', receiptId)
        .single();

      if (receiptError || !receiptData) {
        console.error('❌ [Splits] Failed to get receipt:', receiptError);
        throw receiptError || new Error('Failed to get receipt data');
      }

      const payerId = receiptData.user_id;
      console.log('🔵 [Splits] Payer ID (who uploaded receipt):', payerId);

      // Calculate splits: For each item, split cost among assigned participants
      // Track what each participant owes
      const participantOwedAmounts: Record<string, number> = {}; // user_id -> total amount owed

      items.forEach(item => {
        const itemPrice = item.total_price || 0;
        if (itemPrice <= 0) return;

        // Get assigned participants for this item
        const assignedParticipantIds = assignments[item.id] || new Set();
        if (assignedParticipantIds.size === 0) return;

        // Calculate split amount per person
        const splitAmount = itemPrice / assignedParticipantIds.size;
        console.log(`🔵 [Splits] Item "${item.item_name}": $${itemPrice.toFixed(2)} split among ${assignedParticipantIds.size} people = $${splitAmount.toFixed(2)} each`);

        // Add to each participant's total owed
        assignedParticipantIds.forEach(participantId => {
          const participant = participants.find(p => p.id === participantId);
          if (participant && participant.user_id !== payerId) {
            // Only track what non-payers owe (payer doesn't owe themselves)
            participantOwedAmounts[participant.user_id] = 
              (participantOwedAmounts[participant.user_id] || 0) + splitAmount;
          }
        });
      });

      console.log('🔵 [Splits] Participant owed amounts:', participantOwedAmounts);

      // Delete existing splits for this receipt (to allow re-saving)
      const { error: deleteSplitsError } = await supabase
        .from('splits')
        .delete()
        .eq('receipt_id', receiptId);

      if (deleteSplitsError) {
        console.error('❌ [Splits] Failed to delete existing splits:', deleteSplitsError);
        // Don't throw - continue to create new splits
      }

      // Create splits records: one per participant who owes money
      const splitsToInsert: Array<{
        receipt_id: string;
        payer_id: string;
        participant_id: string;
        amount_owed: number;
        split_type: string;
      }> = [];

      Object.entries(participantOwedAmounts).forEach(([participantUserId, amount]) => {
        if (amount > 0) {
          splitsToInsert.push({
            receipt_id: receiptId,
            payer_id: payerId,
            participant_id: participantUserId,
            amount_owed: Math.round(amount * 100) / 100, // Round to 2 decimal places
            split_type: 'item_based',
          });
        }
      });

      if (splitsToInsert.length > 0) {
        console.log('🔵 [Splits] Inserting splits:', splitsToInsert);
        const { error: splitsError } = await supabase
          .from('splits')
          .insert(splitsToInsert);

        if (splitsError) {
          console.error('❌ [Splits] Failed to insert splits:', splitsError);
          throw splitsError;
        }
        console.log('✅ [Splits] Successfully saved', splitsToInsert.length, 'split records');
      } else {
        console.log('🔵 [Splits] No splits to save (all items assigned to payer only)');
      }

      // Navigate back or show success
      navigate('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => navigate('/dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
            >
              Back
            </button>
            <h1 className="text-lg font-semibold tracking-tight">Split Receipt</h1>
          </div>
          <div className="text-sm text-slate-600">
            Total: {currency(grandTotal)}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-slate-600">Loading items…</div>
        ) : error ? (
          <div className="mb-4 text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Items list with participant assignments */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200">
                  <span className="text-slate-700 text-sm font-medium">Line Items</span>
                </div>
                {items.length === 0 ? (
                  <div className="px-6 py-12 text-center text-slate-500">
                    No items found for this receipt.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {items.map(it => {
                      const itemAssignments = assignments[it.id] || new Set();
                      const assignedCount = itemAssignments.size;
                      const splitAmount = assignedCount > 0 ? (it.total_price || 0) / assignedCount : 0;

                      return (
                        <li key={it.id} className="px-4 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="text-slate-800 font-medium mb-1">{it.item_name || 'Item'}</div>
                              <div className="text-xs text-slate-500 mb-3">
                                {it.quantity != null ? `Qty: ${it.quantity} · ` : ''}
                                {it.unit_price != null ? `Unit: ${currency(it.unit_price)} · ` : ''}
                                Total: {currency(it.total_price)}
                              </div>

                              {/* Participant checkboxes */}
                              {participants.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {participants.map(p => (
                                    <label
                                      key={p.id}
                                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition ${
                                        itemAssignments.has(p.id)
                                          ? p.color
                                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={itemAssignments.has(p.id)}
                                        onChange={() => toggleAssignment(it.id, p.id)}
                                        className="h-3 w-3 rounded border-slate-300 cursor-pointer"
                                      />
                                      {p.username || p.email}
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-slate-400">Add participants to assign items</div>
                              )}

                              {assignedCount > 0 && (
                                <div className="text-xs text-slate-600 mt-2">
                                  Split {assignedCount} way{assignedCount !== 1 ? 's' : ''}: {currency(splitAmount)} each
                                </div>
                              )}
                            </div>
                            <div className="text-sm font-medium text-slate-800 whitespace-nowrap">
                              {currency(it.total_price)}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Right: Participants and totals */}
            <div className="space-y-4">
              {/* Participants section */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h3 className="font-medium text-slate-800">People</h3>
                </div>
                <div className="p-4 space-y-3 overflow-visible">
                  {participants.map(person => (
                    <div key={person.id} className="flex items-center justify-between">
                      <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${person.color}`}>
                        {person.username || person.email}
                      </span>
                      {participants.length > 1 && (
                        <button
                          onClick={() => removeParticipant(person.id)}
                          className="p-1 hover:bg-red-50 rounded text-red-600"
                          title="Remove participant"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2 border-t border-slate-200 relative">
                    <div className="flex-1 relative z-10">
                      <input
                        type="text"
                        value={newParticipantInput}
                        onChange={(e) => {
                          console.log('🔴🔴🔴 INPUT CHANGED! Value:', e.target.value);
                          handleInputChange(e.target.value);
                        }}
                        onClick={() => console.log('🔴🔴🔴 INPUT CLICKED!')}
                        onKeyPress={(e) => e.key === 'Enter' && !addingParticipant && addParticipant()}
                        onFocus={() => {
                          console.log('🔵 [Input] Input focused. searchResults.length:', searchResults.length);
                          if (searchResults.length > 0) {
                            console.log('🔵 [Input] Showing dropdown because results exist');
                            setShowDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          console.log('🔵 [Input] Input blurred');
                          // Delay to allow click on dropdown item
                          setTimeout(() => {
                            console.log('🔵 [Input] Hiding dropdown after blur delay');
                            setShowDropdown(false);
                          }, 200);
                        }}
                        placeholder="Search by name..."
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {/* Dropdown with search results */}
                      {showDropdown && searchResults.length > 0 && (
                        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-300 rounded-md shadow-xl max-h-60 overflow-auto">
                          {searchResults.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onMouseDown={(e) => {
                                // Prevent blur from firing before click
                                e.preventDefault();
                                handleSelectUser(user);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-slate-100 last:border-b-0"
                            >
                              <div className="font-medium text-slate-800">
                                {user.name || user.username || user.email || 'Unknown user'}
                              </div>
                              {(user.email || user.username) && (
                                <div className="text-xs text-slate-500">
                                  {user.email}
                                  {user.username && user.email && ' • '}
                                  {user.username && !user.name && user.username}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={addParticipant}
                      disabled={!newParticipantInput.trim() || addingParticipant}
                      className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      {addingParticipant ? '...' : '+'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Split breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h3 className="font-medium text-slate-800">Split Breakdown</h3>
                </div>
                <div className="p-4 space-y-3">
                  {participants.map(person => (
                    <div key={person.id} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{person.username || person.email}</span>
                      <span className="font-semibold text-slate-800">
                        {currency(splits[person.id] || 0)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3 border-t-2 border-slate-300 flex items-center justify-between">
                    <span className="font-medium text-slate-800">Total</span>
                    <span className="text-lg font-bold text-slate-900">
                      {currency(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={handleSave}
                  disabled={saving || participants.length === 0}
                  className="w-full px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Split'}
                </button>
                <button
                  onClick={handleBack}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LineItemsSelectPage;


