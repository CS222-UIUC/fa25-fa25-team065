import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { createWorker } from 'tesseract.js';

// ============================================================================
// ICONS
// ============================================================================
const Icon = (p: any) => <svg viewBox="0 0 24 24" width="16" height="16" {...p} />;
const X = (p: any) => <Icon {...p}><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></Icon>;
const Upload = (p: any) => <Icon {...p}><path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Icon>;
const ImageIcon = (p: any) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" /><circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" /><path d="M21 17l-6-6-6 6" stroke="currentColor" strokeWidth="2" fill="none" /></Icon>;
const FileText = (p: any) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" /></Icon>;
const Loader2 = (p: any) => <Icon className={`animate-spin ${p.className || ''}`}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" opacity=".25" /><path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="2" /></Icon>;
const Pencil = (p: any) => <Icon {...p}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="2" fill="none" /></Icon>;
const Trash = (p: any) => <Icon {...p}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" fill="none" /></Icon>;
const Plus = (p: any) => <Icon {...p}><path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></Icon>;

// ============================================================================
// TYPES
// ============================================================================
export type ReceiptItem = {
  id: string;
  name: string;
  price: number;
  assignedTo: string[];
};

export type Person = {
  id: string;
  name: string;
  color: string;
};

export type LocalReceipt = {
  id: string;
  file?: File | null;
  previewUrl?: string | null;
  merchant?: string;
  total?: string;
  notes?: string;
  mimeType?: string;
  size?: number;
  items?: ReceiptItem[];
  extractedText?: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================
const ACCEPT = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
const MAX_MB = 10;
const DEFAULT_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-purple-100 text-purple-800",
  "bg-orange-100 text-orange-800",
  "bg-pink-100 text-pink-800",
  "bg-indigo-100 text-indigo-800",
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

const formatBytes = (bytes: number): string => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

// OCR Function
// OCR Function
async function extractTextFromFile(file: File, onProgress?: (progress: number) => void): Promise<string> {
  const worker = await createWorker('eng', 1, {
    logger: m => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });
  
  const { data } = await worker.recognize(file);
  await worker.terminate();
  return data.text || '';
}

// Parse OCR text into items
function parseOcrText(text: string): ReceiptItem[] {
  const items: ReceiptItem[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  const pricePattern = /\$?\s*(\d+[\.,]\d{2})\b/;
  const skipWords = ['total', 'subtotal', 'tax', 'thank you', 'receipt', 'payment', 'change', 'cash', 'credit', 'debit'];
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (skipWords.some(word => lowerLine.includes(word))) continue;
    
    const match = line.match(/(.*?)[\s\-:]*\$?\s*(\d+[\.,]\d{2})\s*$/);
    if (match) {
      const name = match[1].trim().replace(/^\d+\s*x?\s*/i, '');
      const price = parseFloat(match[2].replace(',', '.'));
      
      if (name && name.length > 2 && price > 0 && price < 1000) {
        items.push({
          id: crypto.randomUUID(),
          name: name,
          price: price,
          assignedTo: ["1"]
        });
      }
    }
  }
  
  return items;
}

// Split calculator
function calculateSplits(items: ReceiptItem[], people: Person[]): Record<string, number> {
  const splits: Record<string, number> = {};
  people.forEach(person => splits[person.id] = 0);
  
  items.forEach(item => {
    if (item.assignedTo.length > 0) {
      const splitAmount = item.price / item.assignedTo.length;
      item.assignedTo.forEach(personId => {
        splits[personId] = (splits[personId] || 0) + splitAmount;
      });
    }
  });
  
  return splits;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ReceiptUploadUI() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [receipt, setReceipt] = useState<LocalReceipt | null>(null);
  const [people, setPeople] = useState<Person[]>([
    { id: "1", name: "You", color: DEFAULT_COLORS[0] },
  ]);
  const [newPersonName, setNewPersonName] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [recent, setRecent] = useState<Array<{ id: string; merchant_name: string | null; receipt_url: string | null; date_uploaded: string }>>([]);
  const [recentError, setRecentError] = useState<string>("");

  // Fetch recent uploads
  useEffect(() => {
    const loadRecent = async () => {
      try {
        setRecentError("");
        const rawUser = localStorage.getItem('user');
        if (!rawUser) return;
        const user = JSON.parse(rawUser) as { id: string };
        const { data, error } = await supabase
          .from('receipts')
          .select('id, merchant_name, receipt_url, date_uploaded')
          .eq('user_id', user.id)
          .order('date_uploaded', { ascending: false })
          .limit(10);
        if (error) throw error;
        setRecent(data || []);
      } catch (e) {
        setRecentError(e instanceof Error ? e.message : 'Failed to load recent receipts');
      }
    };
    loadRecent();
  }, []);

  // Calculate splits and total
  const splits = receipt?.items ? calculateSplits(receipt.items, people) : {};
  const grandTotal = receipt?.items ? receipt.items.reduce((sum, item) => sum + item.price, 0) : 0;

  // ============================================================================
  // FILE HANDLING
  // ============================================================================
  const processImage = async (file: File) => {
    setIsProcessing(true);
    setOcrProgress(0);
    setError("");

    try {
      const extractedText = await extractTextFromFile(file, setOcrProgress);
      const parsedItems = parseOcrText(extractedText);

      setReceipt(prev => prev ? {
        ...prev,
        extractedText,
        items: parsedItems.length > 0 ? parsedItems : [{ id: crypto.randomUUID(), name: "New Item", price: 0, assignedTo: ["1"] }]
      } : null);

    } catch (err) {
      console.error('OCR Error:', err);
      setError('Failed to extract text. You can still add items manually.');
      setReceipt(prev => prev ? {
        ...prev,
        items: [{ id: crypto.randomUUID(), name: "New Item", price: 0, assignedTo: ["1"] }]
      } : null);
    } finally {
      setIsProcessing(false);
    }
  };

  const onPick = (f: File) => {
    if (!ACCEPT.includes(f.type)) {
      setError("Only JPG, PNG, WEBP, or PDF");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`Max ${MAX_MB} MB`);
      return;
    }
    setError("");

    const isImage = f.type.startsWith("image/");
    const url = isImage ? URL.createObjectURL(f) : null;
    
    const newReceipt: LocalReceipt = {
      id: crypto.randomUUID(),
      file: f,
      previewUrl: url,
      mimeType: f.type,
      size: f.size,
      merchant: "",
      total: "",
      notes: "",
      items: []
    };
    
    setReceipt(newReceipt);

    if (isImage) {
      processImage(f);
    } else {
      setReceipt(prev => prev ? {
        ...prev,
        items: [{ id: crypto.randomUUID(), name: "New Item", price: 0, assignedTo: ["1"] }]
      } : null);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onPick(f);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => setDragActive(false);

  const onBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onPick(f);
  };

  const reset = () => {
    if (receipt?.previewUrl) URL.revokeObjectURL(receipt.previewUrl);
    setReceipt(null);
    setError("");
    setOcrProgress(0);
    setUploadProgress(0);
    setPeople([{ id: "1", name: "You", color: DEFAULT_COLORS[0] }]);
    setNewPersonName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  // ============================================================================
  // PEOPLE MANAGEMENT
  // ============================================================================
  const addPerson = () => {
    if (!newPersonName.trim()) return;
    const newPerson: Person = {
      id: Date.now().toString(),
      name: newPersonName.trim(),
      color: DEFAULT_COLORS[people.length % DEFAULT_COLORS.length]
    };
    setPeople([...people, newPerson]);
    setNewPersonName("");
  };

  const removePerson = (personId: string) => {
    if (people.length <= 1) return;
    setPeople(people.filter(p => p.id !== personId));
    
    // Remove this person from all item assignments
    if (receipt?.items) {
      setReceipt({
        ...receipt,
        items: receipt.items.map(item => ({
          ...item,
          assignedTo: item.assignedTo.filter(id => id !== personId)
        }))
      });
    }
  };

  // ============================================================================
  // ITEM MANAGEMENT
  // ============================================================================
  const addItem = () => {
    if (!receipt) return;
    const newItem: ReceiptItem = {
      id: crypto.randomUUID(),
      name: "New Item",
      price: 0,
      assignedTo: ["1"]
    };
    setReceipt({
      ...receipt,
      items: [...(receipt.items || []), newItem]
    });
  };

  const updateItem = (itemId: string, updates: Partial<ReceiptItem>) => {
    if (!receipt?.items) return;
    setReceipt({
      ...receipt,
      items: receipt.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    });
  };

  const deleteItem = (itemId: string) => {
    if (!receipt?.items) return;
    setReceipt({
      ...receipt,
      items: receipt.items.filter(item => item.id !== itemId)
    });
  };

  const togglePersonForItem = (itemId: string, personId: string) => {
    if (!receipt?.items) return;
    setReceipt({
      ...receipt,
      items: receipt.items.map(item => {
        if (item.id !== itemId) return item;
        
        const assigned = item.assignedTo.includes(personId);
        return {
          ...item,
          assignedTo: assigned
            ? item.assignedTo.filter(id => id !== personId)
            : [...item.assignedTo, personId]
        };
      })
    });
  };

  // ============================================================================
  // SAVE TO SUPABASE
  // ============================================================================
  const handleSaveAndShare = async () => {
    if (!receipt?.file) {
      setError("No receipt file to save");
      return;
    }

    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      setError("You must be logged in");
      return;
    }
    const user = JSON.parse(rawUser) as { id: string };

    try {
      setIsProcessing(true);
      setError("");
      setUploadProgress(0);

      // Upload file to Supabase Storage
      const ext = (receipt.file.name.split('.').pop() || 'bin').toLowerCase();
      const storagePath = `${user.id}/${receipt.id}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(storagePath, receipt.file, {
          contentType: receipt.mimeType || 'application/octet-stream',
          upsert: false,
        });
      
      if (uploadErr) throw uploadErr;
      setUploadProgress(50);

      // Get public URL
      const { data: pub } = supabase.storage.from('receipts').getPublicUrl(storagePath);
      const receiptUrl = pub?.publicUrl || null;
      setUploadProgress(75);

      // Insert receipt record
      const { data: insertedReceipt, error: insertErr } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          merchant_name: receipt.merchant || null,
          total_amount: grandTotal || null,
          tax_amount: null,
          tip_amount: null,
          receipt_url: receiptUrl,
          parsed: true,
        })
        .select('id')
        .single();
      
      if (insertErr || !insertedReceipt) throw insertErr || new Error('Failed to save receipt');
      setUploadProgress(90);

      // Insert line items with split information
      if (receipt.items && receipt.items.length > 0) {
        const lineItems = receipt.items.map(item => ({
          receipt_id: insertedReceipt.id,
          item_name: item.name,
          quantity: null,
          unit_price: null,
          total_price: item.price,
          assigned_split_id: null, // Could extend to store split data
        }));

        await supabase.from('line_items').insert(lineItems);
      }

      setUploadProgress(100);
      setIsProcessing(false);
      
      // Navigate to thank you page
      navigate('/thank-you');
    } catch (e) {
      setIsProcessing(false);
      setError(e instanceof Error ? e.message : 'Failed to save receipt');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Receipt Splitter</h1>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!receipt ? (
          // Upload zone
          <div className="max-w-3xl mx-auto">
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={
                "relative rounded-2xl border-2 border-dashed p-8 transition " +
                (dragActive
                  ? "border-blue-500 bg-blue-50/40"
                  : "border-slate-300 hover:border-slate-400 bg-white")
              }
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="p-3 rounded-full bg-slate-100">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-slate-800 font-medium">
                  Drag and drop receipt image
                </p>
                <p className="text-sm text-slate-500">
                  PNG, JPG, WEBP, or PDF. Max {MAX_MB} MB
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT.join(",")}
                  onChange={onBrowse}
                  className="hidden"
                />
                <button
                  onClick={() => inputRef.current?.click()}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Upload className="w-4 h-4" />
                  Browse files
                </button>
              </div>

              {error && (
                <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            {/* Recent uploads sidebar */}
            {recent.length > 0 && (
              <div className="mt-6 bg-white rounded-xl border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h3 className="font-medium text-slate-800">Recent Uploads</h3>
                </div>
                <ul className="divide-y divide-slate-200">
                  {recent.slice(0, 5).map((r) => {
                    const when = new Date(r.date_uploaded);
                    return (
                      <li key={r.id} className="px-4 py-3 text-sm flex items-center gap-3">
                        <div className="p-2 rounded bg-slate-100">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-slate-800">{r.merchant_name || 'Receipt'}</p>
                          <p className="text-xs text-slate-500">{when.toLocaleDateString()}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        ) : (
          // Splitting interface
          <div>
            {/* Processing overlay */}
            {isProcessing && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      {ocrProgress > 0 ? `Extracting text... ${ocrProgress}%` : 
                       uploadProgress > 0 ? `Uploading... ${uploadProgress}%` :
                       'Processing...'}
                    </p>
                    <div className="h-2 w-full bg-blue-200 rounded mt-2">
                      <div
                        className="h-2 bg-blue-600 rounded transition-all"
                        style={{ width: `${ocrProgress || uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left: Items list */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-xl border border-slate-200">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-medium text-slate-800">Items</h3>
                    <button
                      onClick={addItem}
                      className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {receipt.items?.map(item => (
                      <div key={item.id} className="p-4">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            {editingItem === item.id ? (
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                                onBlur={() => setEditingItem(null)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditingItem(null)}
                                autoFocus
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-800 font-medium">{item.name}</span>
                                <button
                                  onClick={() => setEditingItem(item.id)}
                                  className="p-1 hover:bg-slate-100 rounded"
                                  title="Edit item name"
                                >
                                  <Pencil className="w-3 h-3 text-slate-400" />
                                </button>
                              </div>
                            )}

                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-slate-500">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.price}
                                  onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                                  className="w-20 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {people.map(person => (
                                  <button
                                    key={person.id}
                                    onClick={() => togglePersonForItem(item.id, person.id)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                                      item.assignedTo.includes(person.id)
                                        ? person.color
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                  >
                                    {person.name}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {item.assignedTo.length > 1 && (
                              <p className="text-xs text-slate-500 mt-1">
                                Split {item.assignedTo.length} ways: ${(item.price / item.assignedTo.length).toFixed(2)} each
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-2 hover:bg-red-50 rounded text-red-600"
                            title="Delete item"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(!receipt.items || receipt.items.length === 0) && (
                    <div className="px-6 py-12 text-center text-slate-500">
                      No items yet. Click "Add Item" to get started.
                    </div>
                  )}
                </div>

                {/* Preview image */}
                {receipt.previewUrl && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="font-medium text-slate-800 mb-3">Original Receipt</h3>
                    <img
                      src={receipt.previewUrl}
                      alt="receipt"
                      className="w-full max-h-96 object-contain rounded-lg border"
                    />
                  </div>
                )}
              </div>

              {/* Right: People and totals */}
              <div className="space-y-4">
                {/* People section */}
                <div className="bg-white rounded-xl border border-slate-200">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <h3 className="font-medium text-slate-800">People</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {people.map(person => (
                      <div key={person.id} className="flex items-center justify-between">
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${person.color}`}>
                          {person.name}
                        </span>
                        {people.length > 1 && (
                          <button
                            onClick={() => removePerson(person.id)}
                            className="p-1 hover:bg-red-50 rounded text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}

                    <div className="flex gap-2 pt-2 border-t border-slate-200">
                      <input
                        type="text"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addPerson()}
                        placeholder="Add person..."
                        className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={addPerson}
                        disabled={!newPersonName.trim()}
                        className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Totals section */}
                <div className="bg-white rounded-xl border border-slate-200">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <h3 className="font-medium text-slate-800">Split Breakdown</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {people.map(person => (
                      <div key={person.id} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{person.name}</span>
                        <span className="font-semibold text-slate-800">
                          {formatCurrency(splits[person.id] || 0)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-3 border-t-2 border-slate-300 flex items-center justify-between">
                      <span className="font-medium text-slate-800">Total</span>
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={reset}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Start Over
                  </button>
                  <button
                    onClick={handleSaveAndShare}
                    disabled={isProcessing}
                    className="w-full px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {isProcessing ? 'Saving...' : 'Save & Share'}
                  </button>
                </div>

                {/* Pro tip */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Pro Tip</h4>
                  <p className="text-xs text-blue-700">
                    Click on person tags to assign items. Items can be split among multiple people!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}