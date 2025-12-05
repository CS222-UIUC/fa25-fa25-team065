import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { createWorker } from 'tesseract.js';
import Tesseract from 'tesseract.js';

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
const Search = (p: any) => <Icon {...p}><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none" /><path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></Icon>;

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

// OCR Function with image preprocessing
async function extractTextFromFile(file: File, onProgress?: (progress: number) => void): Promise<string> {
  const worker = await createWorker('eng', 1, {
    logger: m => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });

  // Configure Tesseract for better receipt recognition
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$.,- ',
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK, // Assume uniform block of text
  });
  
  const { data } = await worker.recognize(file);
  await worker.terminate();
  
  console.log('OCR Raw Text:', data.text); // Debug: see what OCR actually extracted
  return data.text || '';
}

// Parse OCR text into items - more flexible parsing
function parseOcrText(text: string): ReceiptItem[] {
  const items: ReceiptItem[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  console.log('Parsing lines:', lines); // Debug log
  
  const skipWords = ['total', 'subtotal', 'tax', 'thank', 'receipt', 'payment', 'change', 'cash', 'credit', 'debit', 'visa', 'mastercard', 'amex'];
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Skip lines with common non-item words
    if (skipWords.some(word => lowerLine.includes(word))) continue;
    
    // Look for various price patterns
    // Matches: $12.99, 12.99, $12, 12.00, etc.
    const priceMatches = line.match(/\$?\s*(\d+)[.,](\d{2})/g);
    
    if (priceMatches && priceMatches.length > 0) {
      // Get the last price (usually the item price)
      const lastPrice = priceMatches[priceMatches.length - 1];
      const priceStr = lastPrice.replace(/\$|\s/g, '').replace(',', '.');
      const price = parseFloat(priceStr);
      
      if (price > 0 && price < 1000) {
        // Extract item name (everything before the last price)
        const priceIndex = line.lastIndexOf(lastPrice);
        let itemName = line.substring(0, priceIndex).trim();
        
        // Clean up item name
        itemName = itemName
          .replace(/^\d+\s*x?\s*/i, '') // Remove quantity prefix
          .replace(/[@#*]+/g, '') // Remove special chars
          .trim();
        
        if (itemName.length >= 2) {
          console.log('Found item:', itemName, price); // Debug log
          items.push({
            id: crypto.randomUUID(),
            name: itemName,
            price: price,
            assignedTo: ["1"]
          });
        }
      }
    }
  }
  
  console.log('Parsed items:', items); // Debug log
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
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string | null; email: string; name: string | null }>>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

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

  // Cleanup on unmount to prevent stale state updates
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear any pending timeouts
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
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
      console.log('Starting OCR on file:', file.name, file.type);
      const extractedText = await extractTextFromFile(file, setOcrProgress);
    
      console.log('Extracted text length:', extractedText.length);
    
      if (!extractedText || extractedText.trim().length < 10) {
        setError('Could not extract text from image. Try a clearer photo or add items manually.');
        setReceipt(prev => prev ? {
          ...prev,
          extractedText: extractedText,
          items: [{ id: crypto.randomUUID(), name: "New Item", price: 0, assignedTo: ["1"] }]
        } : null);
        setIsProcessing(false);
        return;
      }
    
      const parsedItems = parseOcrText(extractedText);

      if (parsedItems.length === 0) {
        setError('No items found. The image may be unclear - add items manually below.');
      }

      setReceipt(prev => prev ? {
        ...prev,
        extractedText,
        items: parsedItems.length > 0 ? parsedItems : [{ id: crypto.randomUUID(), name: "New Item", price: 0, assignedTo: ["1"] }]
      } : null);

    } catch (err) {
      console.error('OCR Error:', err);
      setError('Failed to extract text. You can add items manually.');
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
    // Reset search state
    setSearchResults([]);
    setShowDropdown(false);
    setIsSearching(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
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
  // USER SEARCH / AUTOCOMPLETE
  // ============================================================================
  // Search users by name as they type
  const searchUsers = useCallback(async (query: string) => {
    const startTime = performance.now();
    console.log('🔵 [Search] searchUsers called with query:', query);
    
    if (!query.trim() || query.length < 2) {
      console.log('🔵 [Search] Query too short, clearing results');
      if (!isMountedRef.current) return;
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    if (!isMountedRef.current) {
      console.log('🔵 [Search] Component unmounted, skipping search');
      return;
    }

    setIsSearching(true);
    const searchTerm = query.trim();
    console.log('🔵 [Search] Sending search request for term:', searchTerm);
    const queryStartTime = performance.now();
    
    try {
      // Search by name, username, or email using OR condition
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, email, name')
        .or(`name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);

      const queryEndTime = performance.now();
      const queryDuration = queryEndTime - queryStartTime;
      console.log(`⏱️ [Search] Query took ${queryDuration.toFixed(2)}ms`);
      console.log('🔵 [Search] Search request returned');
      console.log('🔵 [Search] Response data:', usersData);
      console.log('🔵 [Search] Response error:', usersError);
      console.log('🔵 [Search] Number of users found:', usersData?.length || 0);

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        console.log('🔵 [Search] Component unmounted during search, skipping state update');
        return;
      }

      if (usersError) {
        console.error('❌ [Search] Error searching users:', usersError);
        if (!isMountedRef.current) return;
        setError(`Search failed: ${usersError.message || 'Unable to search users'}`);
        setSearchResults([]);
        setShowDropdown(false);
        setIsSearching(false);
        return;
      }

      // Filter out users who are already in the people list
      const filteredUsers = (usersData || []).filter(
        (user: { id: string; username: string | null; email: string; name: string | null }) => !people.some(p => p.id === user.id)
      );

      console.log('🔵 [Search] After filtering existing people:', filteredUsers.length, 'users');
      console.log('🔵 [Search] Filtered users:', filteredUsers.map((u: { id: string; username: string | null; email: string; name: string | null }) => ({ name: u.name, username: u.username, email: u.email })));

      // Final mount check before updating state
      if (!isMountedRef.current) {
        console.log('🔵 [Search] Component unmounted before state update');
        return;
      }

      setSearchResults(filteredUsers);
      // Always show dropdown if there are results, even if it was closed by blur
      if (filteredUsers.length > 0) {
        setShowDropdown(true);
        console.log('🔵 [Search] Showing dropdown with', filteredUsers.length, 'results');
      } else {
        setShowDropdown(false);
      }
      setIsSearching(false);
      
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      console.log(`⏱️ [Search] Total search function took ${totalDuration.toFixed(2)}ms`);
      console.log('🔵 [Search] Search completed. Dropdown will show:', filteredUsers.length > 0);
    } catch (e) {
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      console.error('❌ [Search] Exception in searchUsers:', e);
      console.log(`⏱️ [Search] Failed after ${totalDuration.toFixed(2)}ms`);
      
      if (!isMountedRef.current) {
        console.log('🔵 [Search] Component unmounted, skipping error state update');
        return;
      }
      
      setError(`Search error: ${e instanceof Error ? e.message : 'Unable to complete search'}`);
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
    }
  }, [people]);

  // Handle input change (no auto-search, only on button click or Enter)
  const handleInputChange = (value: string) => {
    console.log('🔵 [Input] handleInputChange called with value:', value);
    setNewPersonName(value);
    setError('');
    // Clear search results when typing (don't auto-search)
    setSearchResults([]);
    setShowDropdown(false);
  };

  // Handle search button click or Enter key
  const handleSearch = async () => {
    const searchValue = newPersonName.trim();
    if (searchValue.length < 2) {
      setError('Please enter at least 2 characters to search');
      return;
    }
    console.log('🔵 [Search] Triggering search for:', searchValue);
    setError(''); // Clear any previous errors
    setIsSearching(true);
    await searchUsers(searchValue);
  };

  // Handle selecting a user from dropdown
  const handleSelectUser = (user: { id: string; username: string | null; email: string; name: string | null }) => {
    console.log('🔵 [Select] User selected:', user);
    const newPerson: Person = {
      id: user.id,
      name: user.name || user.username || user.email || 'Unknown',
      color: DEFAULT_COLORS[people.length % DEFAULT_COLORS.length]
    };
    setPeople([...people, newPerson]);
    setNewPersonName('');
    setShowDropdown(false);
    setSearchResults([]);
    console.log('🔵 [Select] Person added:', newPerson);
  };


  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []);

  // Reset search state when component mounts or when people list changes
  useEffect(() => {
    // Reset search state when people list changes to ensure fresh search
    setSearchResults([]);
    setShowDropdown(false);
    setIsSearching(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  }, [people.length]); // Reset when people count changes

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
    console.log('🔴🔴🔴 === Starting handleSaveAndShare ===');
    console.log('🔴 Receipt:', receipt);
    console.log('🔴 Receipt file:', receipt?.file);
    console.log('🔴 Receipt items:', receipt?.items);
    
    if (!receipt?.file) {
      console.error('❌ No receipt file to save');
      setError("No receipt file to save");
      alert('No receipt file to save. Please upload a receipt first.');
      return;
    }

    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      console.error('❌ No user found in localStorage');
      setError("You must be logged in");
      alert('You must be logged in to save receipts.');
      return;
    }
    const user = JSON.parse(rawUser) as { id: string };
    console.log('🔴 User from localStorage:', user);

    try {
      setIsProcessing(true);
      setError("");
      setUploadProgress(0);
      setOcrProgress(0); // Reset OCR progress so it doesn't show "Extracting text..." when saving
      console.log('Starting save process...');

      // Upload file to Supabase Storage
      const ext = (receipt.file.name.split('.').pop() || 'bin').toLowerCase();
      const storagePath = `${user.id}/${receipt.id}.${ext}`;

      console.log('🔴 Uploading file to storage path:', storagePath);
      
      // Try to upload, but if file already exists, that's okay - we'll use the existing one
      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(storagePath, receipt.file, {
          contentType: receipt.mimeType || 'application/octet-stream',
          upsert: true, // Allow overwriting if file exists
        });
      
      if (uploadErr) {
        // If error is "already exists", that's fine - continue with existing file
        if (uploadErr.message?.includes('already exists') || uploadErr.message?.includes('duplicate')) {
          console.log('🔵 File already exists in storage, using existing file');
        } else {
          console.error('❌ Upload error:', uploadErr);
          throw uploadErr;
        }
      }
      setUploadProgress(50);

      // Get public URL (works whether file was just uploaded or already existed)
      const { data: pub } = supabase.storage.from('receipts').getPublicUrl(storagePath);
      const receiptUrl = pub?.publicUrl || null;
      console.log('🔴 Receipt URL:', receiptUrl);
      setUploadProgress(75);

      // Verify Supabase auth session before inserting
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔴 Supabase session:', session ? 'exists' : 'null');
      console.log('🔴 Session user ID (auth.users):', session?.user?.id);
      console.log('🔴 Users table ID:', user.id);
      console.log('🔴 Session error:', sessionError);
      
      if (!session) {
        throw new Error('Not authenticated with Supabase. Please sign in again.');
      }

      // The RLS policy might be checking against auth.uid(), so we need to ensure
      // the user_id matches what the policy expects. Let's try using the users table ID
      // but also log what we're doing for debugging
      console.log('Inserting receipt for user:', user.id);
      console.log('🔴 RLS Policy Check: The policy should allow inserts for authenticated users');
      console.log('🔴 If this fails, the RLS policy needs to be updated in Supabase dashboard');
      
      const { data: insertedReceipt, error: insertErr } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id, // This is the users table ID
          merchant_name: receipt.merchant || null,
          total_amount: grandTotal || null,
          tax_amount: null,
          tip_amount: null,
          receipt_url: receiptUrl,
          parsed: true,
        })
        .select('id')
        .single();
      
      if (insertErr || !insertedReceipt) {
        console.error('Failed to insert receipt:', insertErr);
        throw insertErr || new Error('Failed to save receipt');
      }
      
      console.log('Successfully inserted receipt:', insertedReceipt.id);
      setUploadProgress(90);

      // Insert line items with split information
      let lineItemsData: Array<{ id: string; item_name: string | null }> | null = null;
      if (receipt.items && receipt.items.length > 0) {
        const lineItems = receipt.items.map(item => ({
          receipt_id: insertedReceipt.id,
          item_name: item.name,
          quantity: null,
          unit_price: null,
          total_price: item.price,
          assigned_split_id: null, // Could extend to store split data
        }));

        const { data: insertedLineItems, error: lineItemsError } = await supabase
          .from('line_items')
          .insert(lineItems)
          .select();

        if (lineItemsError) {
          console.error('Failed to insert line items:', lineItemsError);
          throw lineItemsError; // This should fail the whole save
        }
        
        lineItemsData = insertedLineItems;
        console.log('Successfully inserted line items:', lineItemsData?.length || 0, 'items');
      }

      // Add all people as participants in receipt_participants
      const DEFAULT_COLORS = [
        'bg-blue-100 text-blue-800',
        'bg-green-100 text-green-800',
        'bg-purple-100 text-purple-800',
        'bg-orange-100 text-orange-800',
        'bg-pink-100 text-pink-800',
        'bg-indigo-100 text-indigo-800',
      ];
      
      console.log('🔵 [Save] Adding participants...');
      // Map person IDs to user_ids: "1" = current user, others = actual user_ids
      const personIdToUserId: Record<string, string> = {};
      personIdToUserId["1"] = user.id; // "You" maps to current user
      
      // Add all people as participants (skip if already exists)
      const participantsToAdd = [];
      for (let i = 0; i < people.length; i++) {
        const person = people[i];
        let userId: string;
        
        if (person.id === "1") {
          // "You" - use current user
          userId = user.id;
        } else {
          // Other people - their id is already the user_id
          userId = person.id;
        }
        
        personIdToUserId[person.id] = userId;
        
        // Check if participant already exists
        const { data: existingParticipant } = await supabase
          .from('receipt_participants')
          .select('id')
          .eq('receipt_id', insertedReceipt.id)
          .eq('user_id', userId)
          .maybeSingle();

        if (!existingParticipant) {
          participantsToAdd.push({
            receipt_id: insertedReceipt.id,
            user_id: userId,
            color: person.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
          });
        }
      }

      if (participantsToAdd.length > 0) {
        const { error: participantsError } = await supabase
          .from('receipt_participants')
          .insert(participantsToAdd);

        if (participantsError) {
          console.error('Failed to add participants:', participantsError);
          // Don't fail - continue with assignments
        } else {
          console.log('✅ Successfully added', participantsToAdd.length, 'participants');
        }
      }

      // Save line item assignments
      console.log('🔵 [Save] Saving line item assignments...');
      if (receipt.items && receipt.items.length > 0 && lineItemsData && lineItemsData.length > 0) {
        const assignmentsToInsert: Array<{ line_item_id: string; user_id: string }> = [];
        
        // Match receipt items to line items by index (they should be in the same order)
        receipt.items.forEach((item, index) => {
          const lineItem = lineItemsData![index]; // Safe because we checked lineItemsData is not null above
          if (!lineItem || !lineItem.id) return;

          // Map person IDs to user_ids for this item's assignments
          item.assignedTo.forEach(personId => {
            const userId = personIdToUserId[personId];
            if (userId) {
              assignmentsToInsert.push({
                line_item_id: lineItem.id,
                user_id: userId,
              });
            }
          });
        });

        if (assignmentsToInsert.length > 0) {
          const { error: assignmentsError } = await supabase
            .from('line_item_assignments')
            .insert(assignmentsToInsert);

          if (assignmentsError) {
            console.error('Failed to insert assignments:', assignmentsError);
            throw assignmentsError;
          }
          console.log('✅ Successfully saved', assignmentsToInsert.length, 'assignments');
        }
      }

      // Calculate and save splits
      console.log('🔵 [Save] Calculating splits...');
      console.log('🔵 [Save] personIdToUserId mapping:', personIdToUserId);
      console.log('🔵 [Save] Receipt items:', receipt.items);
      const payerId = user.id; // Person who uploaded is the payer
      console.log('🔵 [Save] Payer ID (uploader):', payerId);
      const participantOwedAmounts: Record<string, number> = {}; // user_id -> total amount owed

      if (receipt.items && receipt.items.length > 0) {
        receipt.items.forEach((item, itemIndex) => {
          const itemPrice = item.price || 0;
          if (itemPrice <= 0) return;

          const assignedCount = item.assignedTo.length;
          if (assignedCount === 0) return;

          const splitAmount = itemPrice / assignedCount;
          console.log(`🔵 [Save] Item "${item.name}": $${itemPrice} split ${assignedCount} ways = $${splitAmount.toFixed(2)} each`);
          console.log(`🔵 [Save] Item assignedTo personIds:`, item.assignedTo);
          
          item.assignedTo.forEach(personId => {
            const userId = personIdToUserId[personId];
            console.log(`🔵 [Save] Person ID "${personId}" maps to user_id: "${userId}"`);
            if (userId && userId !== payerId) {
              // Only track what non-payers owe
              participantOwedAmounts[userId] = (participantOwedAmounts[userId] || 0) + splitAmount;
              console.log(`🔵 [Save] Added $${splitAmount.toFixed(2)} to ${userId}'s total. New total: $${((participantOwedAmounts[userId] || 0) + splitAmount).toFixed(2)}`);
            } else if (userId === payerId) {
              console.log(`🔵 [Save] Skipping payer (${userId}) - they don't owe themselves`);
            } else {
              console.warn(`🔵 [Save] Could not find userId for personId: ${personId}`);
            }
          });
        });
      }

      console.log('🔵 [Save] Final participantOwedAmounts:', participantOwedAmounts);

      // Delete existing splits for this receipt
      await supabase
        .from('splits')
        .delete()
        .eq('receipt_id', insertedReceipt.id);

      // Create splits records
      const splitsToInsert = Object.entries(participantOwedAmounts).map(([participantUserId, amount]) => ({
        receipt_id: insertedReceipt.id,
        payer_id: payerId,
        participant_id: participantUserId,
        amount_owed: Math.round(amount * 100) / 100,
        split_type: 'item_based',
      }));

      console.log('🔵 [Save] Splits to insert:', splitsToInsert);

      if (splitsToInsert.length > 0) {
        const { error: splitsError } = await supabase
          .from('splits')
          .insert(splitsToInsert);

        if (splitsError) {
          console.error('Failed to insert splits:', splitsError);
          throw splitsError;
        }
        console.log('✅ Successfully saved', splitsToInsert.length, 'splits');
      } else {
        console.log('🔵 [Save] No splits to save (all items assigned to payer only or no items)');
      }

      setUploadProgress(100);
      setIsProcessing(false);
      console.log('=== Save process completed successfully ===');
      console.log('=== Navigating to Dashboard ===');
      
      // Navigate to dashboard - everything is saved!
      navigate('/dashboard');
    } catch (e) {
      console.error('❌❌❌ === Error in handleSaveAndShare ===', e);
      console.error('Error details:', JSON.stringify(e, null, 2));
      setIsProcessing(false);
      const errorMessage = e instanceof Error ? e.message : 'Failed to save receipt';
      setError(errorMessage);
      alert(`Error saving receipt: ${errorMessage}`);
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
                <div className="bg-white rounded-xl border border-slate-200 overflow-visible">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <h3 className="font-medium text-slate-800">People</h3>
                  </div>
                  <div className="p-4 space-y-3 overflow-visible">
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

                    <div className="flex gap-2 pt-2 border-t border-slate-200 relative">
                      <div className="flex-1 relative z-10">
                        <input
                          type="text"
                          value={newPersonName}
                          onChange={(e) => {
                            console.log('🔴🔴🔴 INPUT CHANGED! Value:', e.target.value);
                            handleInputChange(e.target.value);
                          }}
                          onClick={() => console.log('🔴🔴🔴 INPUT CLICKED!')}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearch();
                            }
                          }}
                          onBlur={() => {
                            console.log('🔵 [Input] Input blurred');
                            // Give time for click events on dropdown items to register
                            setTimeout(() => {
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
                        onClick={handleSearch}
                        disabled={!newPersonName.trim() || newPersonName.trim().length < 2}
                        className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        title="Search for users"
                      >
                        <Search className="w-4 h-4" />
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
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('🔴🔴🔴 Button clicked!');
                      handleSaveAndShare();
                    }}
                    disabled={isProcessing}
                    className="w-full px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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