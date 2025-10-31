export type ReceiptItem = {
  id: string;
  name: string;
  price: number;
  assignedTo: string[];
};

export class ReceiptParser {
  /**
   * Parse receipt text to extract items and prices
   */
  static parseText(text: string): ReceiptItem[] {
    const items: ReceiptItem[] = [];
    const lines = text.split('\n');
    
    // Common price patterns: $12.99, 12.99, $12, etc.
    const pricePattern = /\$?\d+\.?\d{0,2}/g;
    
    // Words to skip (common receipt headers/footers)
    const skipWords = [
      'total', 'subtotal', 'tax', 'thank you', 'receipt',
      'payment', 'change', 'cash', 'credit', 'debit',
      'balance', 'tender', 'amount'
    ];
    
    lines.forEach((line) => {
      const lowerLine = line.toLowerCase();
      
      // Skip empty lines and common header/footer text
      if (!line.trim() || skipWords.some(word => lowerLine.includes(word))) {
        return;
      }

      // Look for patterns like "Item Name    $12.99" or "Item Name 12.99"
      const prices = line.match(pricePattern);
      if (prices && prices.length > 0) {
        // Get the last price in the line (usually the actual price, not quantity)
        const priceStr = prices[prices.length - 1].replace('$', '');
        const price = parseFloat(priceStr);
        
        // Only include if price is reasonable (between 0.01 and 1000)
        if (price > 0 && price < 1000) {
          // Extract item name (everything before the price)
          let itemName = line;
          prices.forEach(p => {
            itemName = itemName.replace(p, '');
          });
          itemName = itemName.trim();
          
          // Clean up common prefixes/suffixes
          itemName = itemName.replace(/^\d+\s*x?\s*/i, ''); // Remove quantities like "2x" or "2 "
          itemName = itemName.replace(/\s+@\s*$/, ''); // Remove trailing "@"
          
          // Only add if we have a reasonable item name
          if (itemName.length > 2 && itemName.length < 100) {
            items.push({
              id: crypto.randomUUID(),
              name: itemName,
              price: price,
              assignedTo: ["1"], // Default to first person
            });
          }
        }
      }
    });

    return items;
  }

  /**
   * Create a default empty item
   */
  static createEmptyItem(): ReceiptItem {
    return {
      id: crypto.randomUUID(),
      name: "New Item",
      price: 0,
      assignedTo: ["1"]
    };
  }
}