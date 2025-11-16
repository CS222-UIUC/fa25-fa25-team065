/**
 * Budget Service - ML-based budget prediction engine
 * Analyzes historical spending and predicts next month's budget
 */

import { supabase } from '../supabase/client';
import { categorizeReceipt, Category, CATEGORIES } from '../utils/categoryClassifier';

/**
 * Historical spending for one month
 */
type MonthlySpending = {
  month: string; // 'YYYY-MM' format
  amount: number;
};

/**
 * Category spending with prediction
 */
export type CategoryBudget = {
  category: Category;
  currentMonthSpent: number;
  predictedNextMonth: number;
  historicalAverage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number; // 0-100, based on data consistency
  monthlyHistory: MonthlySpending[];
  receiptCount: number;
};

/**
 * Complete budget prediction summary
 */
export type BudgetPrediction = {
  totalCurrentMonth: number;
  totalPredictedNextMonth: number;
  overallTrend: 'increasing' | 'decreasing' | 'stable';
  categories: CategoryBudget[];
  dataMonths: number; // How many months of data used
  generatedAt: string;
};

/**
 * Receipt data from database
 */
type Receipt = {
  id: string;
  merchant_name: string | null;
  total_amount: number | null;
  date_uploaded: string;
};

export class BudgetService {
  
  /**
   * Fetch user receipts for the last N months
   * @param userId - User's ID from auth
   * @param monthsBack - Number of months to look back (default: 6)
   * @returns Array of receipts
   */
  static async getUserReceipts(userId: string, monthsBack: number = 6): Promise<Receipt[]> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
    
    const { data, error } = await supabase
      .from('receipts')
      .select('id, merchant_name, total_amount, date_uploaded')
      .eq('user_id', userId)
      .gte('date_uploaded', cutoffDate.toISOString())
      .order('date_uploaded', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
  
  /**
   * Group receipts by month and category
   * @param receipts - Array of receipts
   * @returns Map of month to category spending
   */
  private static groupByMonthAndCategory(
    receipts: Receipt[]
  ): Map<string, Map<Category, number>> {
    const monthCategoryMap = new Map<string, Map<Category, number>>();
    
    receipts.forEach(receipt => {
      const date = new Date(receipt.date_uploaded);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const category = categorizeReceipt(receipt.merchant_name);
      const amount = receipt.total_amount || 0;
      
      if (!monthCategoryMap.has(monthKey)) {
        monthCategoryMap.set(monthKey, new Map());
      }
      
      const categoryMap = monthCategoryMap.get(monthKey)!;
      categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
    });
    
    return monthCategoryMap;
  }
  
  /**
   * Calculate trend based on historical data using linear regression
   * @param monthlyAmounts - Array of monthly spending amounts
   * @returns Trend classification
   */
  private static calculateTrend(monthlyAmounts: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (monthlyAmounts.length < 2) return 'stable';
    
    // Simple linear regression slope calculation
    const n = monthlyAmounts.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    monthlyAmounts.forEach((y, x) => {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Calculate relative slope as percentage of average
    const avgAmount = sumY / n;
    if (avgAmount === 0) return 'stable';
    
    const relativeSlope = (slope / avgAmount) * 100;
    
    // Threshold: 5% change per month
    if (relativeSlope > 5) return 'increasing';
    if (relativeSlope < -5) return 'decreasing';
    return 'stable';
  }
  
  /**
   * Predict next month's spending using weighted moving average + trend analysis
   * @param monthlyAmounts - Historical monthly spending
   * @returns Predicted amount for next month
   */
  private static predictNextMonth(monthlyAmounts: number[]): number {
    if (monthlyAmounts.length === 0) return 0;
    if (monthlyAmounts.length === 1) return monthlyAmounts[0];
    
    // Weighted moving average (more recent months = more weight)
    let weightedSum = 0;
    let weightTotal = 0;
    
    monthlyAmounts.forEach((amount, index) => {
      const weight = index + 1; // Recent months weighted higher
      weightedSum += amount * weight;
      weightTotal += weight;
    });
    
    const weightedAverage = weightedSum / weightTotal;
    
    // Apply trend adjustment based on growth rate
    const trend = this.calculateTrend(monthlyAmounts);
    let trendMultiplier = 1.0;
    
    if (trend === 'increasing') {
      // Calculate average month-over-month growth
      const growthRates: number[] = [];
      for (let i = 1; i < monthlyAmounts.length; i++) {
        if (monthlyAmounts[i - 1] > 0) {
          growthRates.push(monthlyAmounts[i] / monthlyAmounts[i - 1]);
        }
      }
      const avgGrowth = growthRates.length > 0 
        ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
        : 1.05; // Default 5% growth if no data
      trendMultiplier = avgGrowth;
    } else if (trend === 'decreasing') {
      // Calculate average month-over-month decline
      const growthRates: number[] = [];
      for (let i = 1; i < monthlyAmounts.length; i++) {
        if (monthlyAmounts[i - 1] > 0) {
          growthRates.push(monthlyAmounts[i] / monthlyAmounts[i - 1]);
        }
      }
      const avgGrowth = growthRates.length > 0
        ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
        : 0.95; // Default 5% decline if no data
      trendMultiplier = avgGrowth;
    }
    
    return weightedAverage * trendMultiplier;
  }
  
  /**
   * Calculate confidence score based on data consistency
   * Uses coefficient of variation - lower variance = higher confidence
   * @param monthlyAmounts - Historical spending data
   * @returns Confidence score (0-100)
   */
  private static calculateConfidence(monthlyAmounts: number[]): number {
    if (monthlyAmounts.length < 2) return 30; // Low confidence with minimal data
    
    const mean = monthlyAmounts.reduce((a, b) => a + b, 0) / monthlyAmounts.length;
    if (mean === 0) return 0;
    
    // Calculate standard deviation
    const squaredDiffs = monthlyAmounts.map(x => Math.pow(x - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / monthlyAmounts.length;
    const stdDev = Math.sqrt(variance);
    
    // Coefficient of variation as percentage
    const cv = (stdDev / mean) * 100;
    
    // Convert to confidence score (lower CV = higher confidence)
    // CV of 0% = 100 confidence, CV of 100% = 0 confidence
    const baseConfidence = Math.max(0, Math.min(100, 100 - cv));
    
    // Bonus for more data points (up to +20 points)
    const dataBonus = Math.min(20, monthlyAmounts.length * 3);
    
    return Math.round(Math.min(100, baseConfidence + dataBonus));
  }
  
  /**
   * Generate complete budget predictions for all categories
   * Main entry point for ML-based budget recommendations
   * @param userId - User's ID from auth
   * @param monthsBack - Number of months to analyze (default: 6)
   * @returns Complete budget prediction with per-category forecasts
   */
  static async generateBudgetPrediction(
    userId: string, 
    monthsBack: number = 6
  ): Promise<BudgetPrediction> {
    const receipts = await this.getUserReceipts(userId, monthsBack);
    
    if (receipts.length === 0) {
      return {
        totalCurrentMonth: 0,
        totalPredictedNextMonth: 0,
        overallTrend: 'stable',
        categories: [],
        dataMonths: 0,
        generatedAt: new Date().toISOString(),
      };
    }
    
    const monthCategoryMap = this.groupByMonthAndCategory(receipts);
    const months = Array.from(monthCategoryMap.keys()).sort();
    
    // Process each category
    const categoryBudgets: CategoryBudget[] = [];
    
    for (const category of CATEGORIES) {
      const monthlyHistory: MonthlySpending[] = [];
      const monthlyAmounts: number[] = [];
      
      // Extract historical data for this category
      months.forEach(month => {
        const categoryMap = monthCategoryMap.get(month)!;
        const amount = categoryMap.get(category) || 0;
        monthlyHistory.push({ month, amount });
        monthlyAmounts.push(amount);
      });
      
      // Skip categories with no spending
      if (monthlyAmounts.every(x => x === 0)) continue;
      
      const currentMonthSpent = monthlyAmounts[monthlyAmounts.length - 1] || 0;
      const predictedNextMonth = this.predictNextMonth(monthlyAmounts);
      const historicalAverage = monthlyAmounts.reduce((a, b) => a + b, 0) / monthlyAmounts.length;
      const trend = this.calculateTrend(monthlyAmounts);
      const confidence = this.calculateConfidence(monthlyAmounts);
      
      // Count receipts for this category
      const receiptCount = receipts.filter(
        r => categorizeReceipt(r.merchant_name) === category
      ).length;
      
      categoryBudgets.push({
        category,
        currentMonthSpent: Math.round(currentMonthSpent * 100) / 100,
        predictedNextMonth: Math.round(predictedNextMonth * 100) / 100,
        historicalAverage: Math.round(historicalAverage * 100) / 100,
        trend,
        confidence,
        monthlyHistory,
        receiptCount,
      });
    }
    
    // Sort by predicted amount (highest first)
    categoryBudgets.sort((a, b) => b.predictedNextMonth - a.predictedNextMonth);
    
    // Calculate totals
    const totalCurrentMonth = categoryBudgets.reduce((sum, cat) => sum + cat.currentMonthSpent, 0);
    const totalPredictedNextMonth = categoryBudgets.reduce((sum, cat) => sum + cat.predictedNextMonth, 0);
    
    // Determine overall trend based on total spending history
    const overallTrend = this.calculateTrend(
      months.map(month => {
        const categoryMap = monthCategoryMap.get(month)!;
        return Array.from(categoryMap.values()).reduce((sum, amt) => sum + amt, 0);
      })
    );
    
    return {
      totalCurrentMonth: Math.round(totalCurrentMonth * 100) / 100,
      totalPredictedNextMonth: Math.round(totalPredictedNextMonth * 100) / 100,
      overallTrend,
      categories: categoryBudgets,
      dataMonths: months.length,
      generatedAt: new Date().toISOString(),
    };
  }
  
  /**
   * Get all available budget categories
   * @returns Array of category names
   */
  static getCategories(): readonly Category[] {
    return CATEGORIES;
  }
}

