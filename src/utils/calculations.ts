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

export class SplitCalculator {
  /**
   * Calculate how much each person owes
   */
  static calculateSplits(
    items: ReceiptItem[],
    people: Person[]
  ): Record<string, number> {
    const splits: Record<string, number> = {};
    
    // Initialize all people to 0
    people.forEach(person => {
      splits[person.id] = 0;
    });

    // Calculate splits for each item
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

  /**
   * Calculate grand total of all items
   */
  static calculateTotal(items: ReceiptItem[]): number {
    return items.reduce((sum, item) => sum + item.price, 0);
  }

  /**
   * Calculate tax and tip amounts
   */
  static calculateTaxAndTip(
    subtotal: number,
    taxPercent: number = 0,
    tipPercent: number = 0
  ): { tax: number; tip: number; total: number } {
    const tax = subtotal * (taxPercent / 100);
    const tip = subtotal * (tipPercent / 100);
    const total = subtotal + tax + tip;
    
    return { tax, tip, total };
  }
}

export const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

export const formatBytes = (bytes: number): string => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};