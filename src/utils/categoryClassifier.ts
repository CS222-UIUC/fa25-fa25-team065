/**
 * Budget category classification utility
 * Categorizes receipts based on merchant names
 */

export const CATEGORIES = [
  'Food & Dining',
  'Groceries', 
  'Transportation',
  'Entertainment',
  'Utilities',
  'Shopping',
  'Other'
] as const;

export type Category = typeof CATEGORIES[number];

/**
 * Categorizes a receipt based on merchant name using pattern matching
 * @param merchantName - The name of the merchant from receipt
 * @returns Category enum value
 */
export function categorizeReceipt(merchantName: string | null): Category {
  if (!merchantName) return 'Other';
  
  const merchant = merchantName.toLowerCase().trim();
  
  // Food & Dining - restaurants, cafes, fast food
  if (
    merchant.includes('restaurant') || merchant.includes('cafe') || 
    merchant.includes('pizza') || merchant.includes('burger') ||
    merchant.includes('starbucks') || merchant.includes('coffee') ||
    merchant.includes('diner') || merchant.includes('grill') ||
    merchant.includes('kitchen') || merchant.includes('bar') ||
    merchant.includes('mcdonald') || merchant.includes('subway') ||
    merchant.includes('chipotle') || merchant.includes('taco') ||
    merchant.includes('wendy') || merchant.includes('kfc') ||
    merchant.includes('domino') || merchant.includes('panera')
  ) {
    return 'Food & Dining';
  }
  
  // Groceries - supermarkets, grocery stores
  if (
    merchant.includes('grocery') || merchant.includes('market') ||
    merchant.includes('whole foods') || merchant.includes('trader joe') ||
    merchant.includes('walmart') || merchant.includes('target') ||
    merchant.includes('costco') || merchant.includes('safeway') ||
    merchant.includes('kroger') || merchant.includes('publix') ||
    merchant.includes('aldi') || merchant.includes('food lion') ||
    merchant.includes('wegmans') || merchant.includes('sprouts')
  ) {
    return 'Groceries';
  }
  
  // Transportation - rideshare, gas, parking, transit
  if (
    merchant.includes('uber') || merchant.includes('lyft') ||
    merchant.includes('gas') || merchant.includes('shell') ||
    merchant.includes('chevron') || merchant.includes('bp') ||
    merchant.includes('exxon') || merchant.includes('mobil') ||
    merchant.includes('parking') || merchant.includes('metro') ||
    merchant.includes('transit') || merchant.includes('taxi') ||
    merchant.includes('sunoco') || merchant.includes('arco')
  ) {
    return 'Transportation';
  }
  
  // Entertainment - streaming, movies, gyms, recreation
  if (
    merchant.includes('theater') || merchant.includes('cinema') ||
    merchant.includes('netflix') || merchant.includes('spotify') ||
    merchant.includes('hulu') || merchant.includes('disney') ||
    merchant.includes('gym') || merchant.includes('fitness') ||
    merchant.includes('movie') || merchant.includes('amc') ||
    merchant.includes('planet fitness') || merchant.includes('la fitness') ||
    merchant.includes('youtube') || merchant.includes('apple music')
  ) {
    return 'Entertainment';
  }
  
  // Utilities - electric, water, internet, phone
  if (
    merchant.includes('electric') || merchant.includes('water') ||
    merchant.includes('internet') || merchant.includes('phone') ||
    merchant.includes('comcast') || merchant.includes('verizon') ||
    merchant.includes('at&t') || merchant.includes('t-mobile') ||
    merchant.includes('utility') || merchant.includes('power') ||
    merchant.includes('xfinity') || merchant.includes('spectrum') ||
    merchant.includes('sprint') || merchant.includes('cox')
  ) {
    return 'Utilities';
  }
  
  // Shopping - retail, clothing, online stores
  if (
    merchant.includes('amazon') || merchant.includes('ebay') ||
    merchant.includes('mall') || merchant.includes('clothing') ||
    merchant.includes('store') || merchant.includes('shop') ||
    merchant.includes('retail') || merchant.includes('nike') ||
    merchant.includes('gap') || merchant.includes('h&m') ||
    merchant.includes('macy') || merchant.includes('nordstrom') ||
    merchant.includes('zara') || merchant.includes('forever 21')
  ) {
    return 'Shopping';
  }
  
  // Default to Other for unrecognized merchants
  return 'Other';
}

/**
 * Batch categorize multiple receipts
 * @param receipts - Array of receipts with merchant_name field
 * @returns Array of receipts with added category field
 */
export function categorizeReceipts<T extends { merchant_name: string | null }>(
  receipts: T[]
): (T & { category: Category })[] {
  return receipts.map(receipt => ({
    ...receipt,
    category: categorizeReceipt(receipt.merchant_name)
  }));
}

