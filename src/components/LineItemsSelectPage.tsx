import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase/client';

type LineItem = {
  id: string;
  item_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
};

const currency = (n: number | null | undefined) =>
  typeof n === 'number' && !Number.isNaN(n) ? `$${n.toFixed(2)}` : '-';

const LineItemsSelectPage: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchItems = async () => {
      if (!receiptId) {
        setError('Missing receipt id');
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('line_items')
          .select('id, item_name, quantity, unit_price, total_price')
          .eq('receipt_id', receiptId)
          .order('item_name', { ascending: true });
        if (error) throw error;
        setItems(data || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load items');
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [receiptId]);

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    for (const it of items) next[it.id] = checked;
    setSelected(next);
  };

  const toggleOne = (id: string) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  const selectedTotal = useMemo(() => {
    let sum = 0;
    for (const it of items) {
      if (selected[it.id]) sum += it.total_price || 0;
    }
    return sum;
  }, [items, selected]);

  const handleBack = () => navigate('/dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
            >
              Back
            </button>
            <h1 className="text-lg font-semibold tracking-tight">Select Items</h1>
          </div>
          <div className="text-sm text-slate-600">
            Selected {selectedCount} · Total {currency(selectedTotal)}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-slate-600">Loading items…</div>
        ) : error ? (
          <div className="text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="text-slate-600">No items found for this receipt.</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-slate-700 text-sm">Line Items</span>
              <div className="flex items-center gap-3 text-sm">
                <button
                  onClick={() => toggleAll(true)}
                  className="px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-50"
                >
                  Select all
                </button>
                <button
                  onClick={() => toggleAll(false)}
                  className="px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            </div>
            <ul className="divide-y divide-slate-200">
              {items.map(it => (
                <li key={it.id} className="px-4 py-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!selected[it.id]}
                    onChange={() => toggleOne(it.id)}
                    className="h-4 w-4 text-blue-600 rounded border-slate-300"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-800 text-sm truncate">{it.item_name || 'Item'}</div>
                    <div className="text-xs text-slate-500">
                      {it.quantity != null ? `Qty: ${it.quantity} · ` : ''}
                      {it.unit_price != null ? `Unit: ${currency(it.unit_price)} · ` : ''}
                      Total: {currency(it.total_price)}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-800">
                    {currency(it.total_price)}
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Selected {selectedCount} · {currency(selectedTotal)}
              </div>
              <button
                className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  const chosenIds = Object.entries(selected)
                    .filter(([, v]) => v)
                    .map(([k]) => k);
                  // eslint-disable-next-line no-alert
                  alert(`Selected items: ${chosenIds.length}`);
                }}
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LineItemsSelectPage;


