import React, { useRef, useState } from "react";
import { OCRService } from "../services/ocrService";
import { ReceiptParser } from "../services/receiptParser";
import { SplitCalculator, formatCurrency } from "../utils/calculations";

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
// MAIN COMPONENT
// ============================================================================
export default function ReceiptUploadUI() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const [receipt, setReceipt] = useState<LocalReceipt | null>(null);
  const [people, setPeople] = useState<Person[]>([
    { id: "1", name: "You", color: DEFAULT_COLORS[0] },
  ]);
  const [newPersonName, setNewPersonName] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);

  // ============================================================================
  // OCR & FILE PROCESSING (Uses imported services)
  // ============================================================================
  const processImage = async (file: File) => {
    setIsProcessing(true);
    setOcrProgress(0);
    setError("");

    try {
      // Use OCRService to extract text
      const extractedText = await OCRService.extractText(file, setOcrProgress);
      
      // Use ReceiptParser to parse the text
      const parsedItems = ReceiptParser.parseText(extractedText);

      setReceipt(prev => prev ? {
        ...prev,
        extractedText,
        items: parsedItems.length > 0 ? parsedItems : [ReceiptParser.createEmptyItem()]
      } : null);

    } catch (err) {
      console.error('OCR Error:', err);
      setError('Failed to extract text. You can still add items manually.');
      setReceipt(prev => prev ? {
        ...prev,
        items: [ReceiptParser.createEmptyItem()]
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

    // Start OCR processing for images
    if (isImage) {
      processImage(f);
    } else {
      // For PDFs, create empty item for manual entry
      setReceipt(prev => prev ? {
        ...prev,
        items: [ReceiptParser.createEmptyItem()]
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

  const removePerson = (id: string) => {
    if (people.length === 1) return;
    setPeople(people.filter(p => p.id !== id));
    setReceipt(prev => prev ? {
      ...prev,
      items: prev.items?.map(item => ({
        ...item,
        assignedTo: item.assignedTo.filter(pid => pid !== id)
      }))
    } : null);
  };

  // ============================================================================
  // ITEM MANAGEMENT
  // ============================================================================
  const addItem = () => {
    const newItem = ReceiptParser.createEmptyItem();
    setReceipt(prev => prev ? {
      ...prev,
      items: [...(prev.items || []), newItem]
    } : null);
  };

  const updateItem = (id: string, updates: Partial<ReceiptItem>) => {
    setReceipt(prev => prev ? {
      ...prev,
      items: prev.items?.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    } : null);
  };

  const deleteItem = (id: string) => {
    setReceipt(prev => prev ? {
      ...prev,
      items: prev.items?.filter(item => item.id !== id)
    } : null);
  };

  const togglePersonForItem = (itemId: string, personId: string) => {
    setReceipt(prev => prev ? {
      ...prev,
      items: prev.items?.map(item => {
        if (item.id === itemId) {
          const assigned = item.assignedTo.includes(personId)
            ? item.assignedTo.filter(id => id !== personId)
            : [...item.assignedTo, personId];
          return { ...item, assignedTo: assigned.length > 0 ? assigned : item.assignedTo };
        }
        return item;
      })
    } : null);
  };

  // ============================================================================
  // CALCULATIONS (Uses imported SplitCalculator)
  // ============================================================================
  const splits = receipt?.items ? SplitCalculator.calculateSplits(receipt.items, people) : {};
  const grandTotal = receipt?.items ? SplitCalculator.calculateTotal(receipt.items) : 0;

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Receipt Upload & Split</h1>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
              onClick={() => (window.location.href = "/dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Page body */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {!receipt?.items ? (
          // UPLOAD SECTION
          <div className="max-w-3xl mx-auto">
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={
                "relative rounded-2xl border-2 border-dashed p-12 transition " +
                (dragActive
                  ? "border-blue-500 bg-blue-50/40"
                  : "border-slate-300 hover:border-slate-400 bg-white")
              }
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-4 rounded-full bg-slate-100">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xl text-slate-800 font-medium mb-2">
                    Upload your receipt
                  </p>
                  <p className="text-sm text-slate-500">
                    We'll automatically extract items and prices using OCR
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    PNG, JPG, WEBP, or PDF. Max {MAX_MB} MB
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT.join(",")}
                  onChange={onBrowse}
                  className="hidden"
                />
                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={isProcessing}
                  className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Upload className="w-5 h-5" />
                  Choose File
                </button>
              </div>

              {isProcessing && (
                <div className="mt-8">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-sm text-slate-600">Extracting text from receipt...</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 text-center mt-1">{ocrProgress}%</p>
                </div>
              )}

              {error && (
                <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
            </div>
          </div>
        ) : (
          // ITEMS AND SPLITTING SECTION
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Items list */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800">Receipt Items</h2>
                  <button
                    onClick={addItem}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                <div className="divide-y divide-slate-200">
                  {receipt.items.map((item) => (
                    <div key={item.id} className="px-6 py-4">
                      <div className="flex items-start gap-3">
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

                {receipt.items.length === 0 && (
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
                  onClick={() => window.location.href = "/thank-you"}
                  className="w-full px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                >
                  Save & Share
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
        )}
      </main>
    </div>
  );
}