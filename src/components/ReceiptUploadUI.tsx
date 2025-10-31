import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { createWorker } from 'tesseract.js';

// Pure UI. No Firebase. Dropzone + preview + metadata form + mock submit.
// TailwindCSS required. Default export a single page component.

const Icon = (p:any)=> <svg viewBox="0 0 24 24" width="16" height="16" {...p} />;
const X = (p:any)=> <Icon {...p}><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></Icon>;
const Upload = (p:any)=> <Icon {...p}><path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></Icon>;
const ImageIcon = (p:any)=> <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><circle cx="8.5" cy="10.5" r="1.5" fill="currentColor"/><path d="M21 17l-6-6-6 6" stroke="currentColor" strokeWidth="2" fill="none"/></Icon>;
const FileText = (p:any)=> <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2"/></Icon>;
const Loader2 = (p:any)=> <Icon className={`animate-spin ${p.className||''}`}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" opacity=".25"/><path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="2"/></Icon>;

export type LocalReceipt = {
  id: string;
  file?: File | null;
  previewUrl?: string | null;
  merchant?: string;
  total?: string;
  notes?: string;
  mimeType?: string;
  size?: number;
};

const ACCEPT = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];

const MAX_MB = 10;

export default function ReceiptUploadUI() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0); // mock only

  const [receipt, setReceipt] = useState<LocalReceipt | null>(null);
  const [recent, setRecent] = useState<Array<{ id: string; merchant_name: string | null; receipt_url: string | null; date_uploaded: string }>>([]);
  const [recentError, setRecentError] = useState<string>("");

  // Fetch recent uploads for the current user
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
    setReceipt({
      id: crypto.randomUUID(),
      file: f,
      previewUrl: url,
      mimeType: f.type,
      size: f.size,
      merchant: "",
      total: "",
      notes: "",
    });
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
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  async function extractTextFromFile(file: File): Promise<string> {
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(file);
    await worker.terminate();
    return data.text || '';
  }

  function parseOcrText(text: string): {
    merchantFromOcr: string | null;
    totalFromOcr: number | null;
    items: Array<{ item_name: string; total_price: number | null }>;
  } {
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    const merchantFromOcr = lines[0] || null;

    let totalFromOcr: number | null = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      const m = lines[i].match(/\$?\s*(\d+[\.,]\d{2})\b/);
      if (m) {
        totalFromOcr = parseFloat(m[1].replace(',', '.'));
        break;
      }
    }

    const items: Array<{ item_name: string; total_price: number | null }> = [];
    for (const line of lines) {
      // Heuristic: split on last price-like token
      const m = line.match(/(.*?)[\s\-:]*\$?\s*(\d+[\.,]\d{2})\s*$/);
      if (m) {
        const name = m[1].trim();
        const price = parseFloat(m[2].replace(',', '.'));
        if (name && !Number.isNaN(price)) {
          items.push({ item_name: name, total_price: price });
        }
      }
    }

    return { merchantFromOcr, totalFromOcr, items };
  }

  // Submit: upload file to Supabase Storage and insert row in receipts table
  const submit = async () => {
    if (!receipt?.file) {
      setError("Pick a file first");
      return;
    }

    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      setError("You must be logged in");
      return;
    }
    const user = JSON.parse(rawUser) as { id: string; email: string; username: string | null };

    try {
      setIsSubmitting(true);
      setError("");
      setProgress(0);

      // 1) Upload file to Storage bucket 'receipts' at <user_id>/<receipt_id>.<ext>
      const ext = (receipt.file.name.split('.').pop() || 'bin').toLowerCase();
      const storagePath = `${user.id}/${receipt.id}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(storagePath, receipt.file, {
          contentType: receipt.mimeType || 'application/octet-stream',
          upsert: false,
        });
      if (uploadErr) {
        setIsSubmitting(false);
        setError(`Upload failed: ${uploadErr.message}`);
        return;
      }

      setProgress(50);

      // 2) Get a public URL (bucket must be public). For private, switch to signed URLs.
      const { data: pub } = supabase.storage.from('receipts').getPublicUrl(storagePath);
      const receiptUrl = pub?.publicUrl || null;

      setProgress(60);

      // 3) OCR: extract text, then parse merchant/total and line items
      const ocrText = await extractTextFromFile(receipt.file);
      const { merchantFromOcr, totalFromOcr, items } = parseOcrText(ocrText);

      const merchantToSave = (receipt.merchant && receipt.merchant.trim()) ? receipt.merchant : merchantFromOcr;
      const totalToSave = (receipt.total && receipt.total.trim()) ? parseFloat(receipt.total) : totalFromOcr;

      setProgress(75);

      // 4) Insert receipt row and return id
      const { data: insertedReceipt, error: insertErr } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          merchant_name: merchantToSave || null,
          total_amount: (totalToSave ?? null),
          tax_amount: null,
          tip_amount: null,
          receipt_url: receiptUrl,
          parsed: !!(merchantToSave || totalToSave),
        })
        .select('id')
        .single();
      if (insertErr || !insertedReceipt) {
        setIsSubmitting(false);
        setError(`Save failed: ${insertErr?.message || 'no id returned'}`);
        return;
      }

      setProgress(85);

      // 5) Insert parsed line items (best-effort, ignore if none)
      const simplified = items
        .filter(it => it.item_name && it.total_price != null)
        .slice(0, 50) // avoid runaway
        .map(it => ({
          receipt_id: insertedReceipt.id,
          item_name: it.item_name,
          quantity: null,
          unit_price: null,
          total_price: it.total_price,
          assigned_split_id: null,
        }));

      if (simplified.length > 0) {
        const { error: liErr } = await supabase.from('line_items').insert(simplified);
        if (liErr) {
          // Non-fatal: keep receipt saved even if items fail
          // eslint-disable-next-line no-console
          console.warn('line_items insert error', liErr);
        }
      }

      setProgress(100);
      setIsSubmitting(false);
      // Redirect to selection page for this receipt
      navigate(`/receipts/${insertedReceipt.id}/select-items`);
    } catch (e) {
      setIsSubmitting(false);
      setError(e instanceof Error ? e.message : 'Unexpected error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Receipts</h1>
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
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Dropzone + file info */}
          <section className="lg:col-span-2">
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
                  Drag and drop receipt image or PDF
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

              {receipt && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Preview */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        {receipt.mimeType?.startsWith("image/") ? (
                          <ImageIcon className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                        <span className="truncate max-w-[18rem]">
                          {receipt.file?.name}
                        </span>
                      </div>
                      <button
                        onClick={reset}
                        className="p-1 rounded hover:bg-slate-100"
                        aria-label="Clear file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4">
                      {receipt.previewUrl ? (
                        <img
                          src={receipt.previewUrl}
                          alt="preview"
                          className="w-full max-h-[360px] object-contain rounded-md border"
                        />
                      ) : (
                        <div className="h-60 grid place-items-center border rounded-md text-slate-500 text-sm">
                          PDF selected. No preview.
                        </div>
                      )}

                      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-slate-500">Type</dt>
                          <dd className="text-slate-800">{receipt.mimeType}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Size</dt>
                          <dd className="text-slate-800">
                            {formatBytes(receipt.size || 0)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Metadata form */}
                  <div className="rounded-xl border border-slate-200 bg-white">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <h3 className="text-sm font-medium text-slate-700">
                        Details
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">
                          Merchant
                        </label>
                        <input
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Target"
                          value={receipt.merchant || ""}
                          onChange={(e) =>
                            setReceipt((r) => r && { ...r, merchant: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">
                          Total
                        </label>
                        <input
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          inputMode="decimal"
                          placeholder="e.g., 45.67"
                          value={receipt.total || ""}
                          onChange={(e) =>
                            setReceipt((r) => r && { ...r, total: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">
                          Notes
                        </label>
                        <textarea
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="Any context"
                          value={receipt.notes || ""}
                          onChange={(e) =>
                            setReceipt((r) => r && { ...r, notes: e.target.value })
                          }
                        />
                      </div>

                      {/* Progress (mock) */}
                      {isSubmitting && (
                        <div>
                          <div className="h-2 w-full bg-slate-200 rounded">
                            <div
                              className="h-2 bg-blue-600 rounded"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{progress}%</p>
                        </div>
                      )}

                      {error && (
                        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                          {error}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={reset}
                          className="px-4 py-2 rounded-md border border-slate-300 text-sm hover:bg-slate-50"
                          disabled={isSubmitting}
                        >
                          Reset
                        </button>
                        <button
                          onClick={submit}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Uploading
                            </>
                          ) : (
                            <>Upload</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Right: Tips / recent actual list */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="font-medium text-slate-800">Tips</h3>
              <ul className="mt-2 text-sm text-slate-600 list-disc pl-5 space-y-1">
                <li>Good lighting improves OCR later.</li>
                <li>Crop out backgrounds if possible.</li>
                <li>Use PDF when exporting from email.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white">
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="font-medium text-slate-800">Recent uploads</h3>
              </div>
              {recentError ? (
                <div className="px-4 py-3 text-sm text-red-700">{recentError}</div>
              ) : recent.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-600">No uploads yet.</div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {recent.map((r) => {
                    const nameFromUrl = r.receipt_url ? r.receipt_url.split('/').pop() || 'receipt' : 'receipt';
                    const isPdf = (nameFromUrl || '').toLowerCase().endsWith('.pdf');
                    const when = new Date(r.date_uploaded);
                    return (
                      <li key={r.id} className="px-4 py-3 text-sm flex items-center gap-3">
                        <div className="p-2 rounded bg-slate-100">
                          {isPdf ? (
                            <FileText className="w-4 h-4" />
                          ) : (
                            <ImageIcon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-slate-800">{r.merchant_name || nameFromUrl}</p>
                          <p className="text-xs text-slate-500">{when.toLocaleString()}</p>
                        </div>
                        <button
                          className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
                          onClick={() => navigate(`/receipts/${r.id}/select-items`)}
                        >
                          View
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"]; 
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
