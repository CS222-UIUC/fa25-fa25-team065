"""
Generate synthetic expense data for training the budget prediction model.
Creates realistic monthly expense patterns across various categories.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import json

# Set random seed for reproducibility
np.random.seed(42)

# Define expense categories with typical ranges and patterns
EXPENSE_CATEGORIES = {
    'Groceries': {
        'base': 300,
        'std': 80,
        'trend': 0.02,  # 2% monthly increase
        'seasonality': [1.0, 1.0, 1.05, 1.05, 1.1, 1.1, 1.05, 1.05, 1.0, 1.0, 1.15, 1.2]
    },
    'Transportation': {
        'base': 150,
        'std': 40,
        'trend': 0.01,
        'seasonality': [1.0, 1.0, 1.0, 1.0, 1.1, 1.2, 1.2, 1.15, 1.1, 1.0, 1.0, 1.0]
    },
    'Entertainment': {
        'base': 200,
        'std': 70,
        'trend': 0.005,
        'seasonality': [0.9, 0.9, 1.0, 1.0, 1.1, 1.2, 1.3, 1.2, 1.0, 1.0, 1.1, 1.3]
    },
    'Dining Out': {
        'base': 250,
        'std': 90,
        'trend': 0.015,
        'seasonality': [0.9, 1.0, 1.0, 1.0, 1.1, 1.1, 1.1, 1.1, 1.0, 1.0, 1.15, 1.2]
    },
    'Utilities': {
        'base': 120,
        'std': 30,
        'trend': 0.005,
        'seasonality': [1.2, 1.2, 1.1, 1.0, 0.9, 0.8, 0.8, 0.8, 0.9, 1.0, 1.1, 1.2]
    },
    'Shopping': {
        'base': 180,
        'std': 100,
        'trend': 0.01,
        'seasonality': [0.8, 0.9, 1.0, 1.0, 1.1, 1.0, 1.0, 1.0, 1.0, 1.1, 1.3, 1.5]
    },
    'Healthcare': {
        'base': 100,
        'std': 80,
        'trend': 0.03,
        'seasonality': [1.1, 1.2, 1.1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.1, 1.0, 1.0, 1.1]
    },
    'Subscriptions': {
        'base': 80,
        'std': 20,
        'trend': 0.02,
        'seasonality': [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]
    }
}

def generate_user_profile():
    """Generate a random user spending profile with income and habits."""
    income_bracket = np.random.choice(['low', 'medium', 'high'], p=[0.3, 0.5, 0.2])
    
    income_multipliers = {
        'low': np.random.uniform(0.5, 0.8),
        'medium': np.random.uniform(0.8, 1.3),
        'high': np.random.uniform(1.3, 2.0)
    }
    
    spending_behavior = np.random.choice(['frugal', 'moderate', 'liberal'], p=[0.25, 0.5, 0.25])
    behavior_multipliers = {
        'frugal': np.random.uniform(0.7, 0.9),
        'moderate': np.random.uniform(0.9, 1.1),
        'liberal': np.random.uniform(1.1, 1.4)
    }
    
    return {
        'income_multiplier': income_multipliers[income_bracket],
        'behavior_multiplier': behavior_multipliers[spending_behavior],
        'category_preferences': {cat: np.random.uniform(0.7, 1.3) for cat in EXPENSE_CATEGORIES.keys()}
    }

def generate_monthly_expense(category, month_index, base_amount, user_profile, previous_expenses):
    """Generate expense for a specific category and month."""
    config = EXPENSE_CATEGORIES[category]
    
    # Apply user profile multipliers
    adjusted_base = base_amount * user_profile['income_multiplier'] * user_profile['behavior_multiplier']
    adjusted_base *= user_profile['category_preferences'][category]
    
    # Apply trend (cumulative over months)
    trend_factor = (1 + config['trend']) ** month_index
    
    # Apply seasonality
    seasonal_factor = config['seasonality'][month_index % 12]
    
    # Add momentum from previous months (spending habits)
    momentum = 0
    if len(previous_expenses) > 0:
        recent_avg = np.mean(previous_expenses[-3:]) if len(previous_expenses) >= 3 else np.mean(previous_expenses)
        momentum = (recent_avg - adjusted_base) * 0.3  # 30% momentum from recent spending
    
    # Calculate base expense
    expected = adjusted_base * trend_factor * seasonal_factor + momentum
    
    # Add random noise
    noise = np.random.normal(0, config['std'] * user_profile['behavior_multiplier'])
    
    # Ensure non-negative
    expense = max(0, expected + noise)
    
    return round(expense, 2)

def generate_user_data(user_id, num_months=24):
    """Generate complete expense history for one user."""
    user_profile = generate_user_profile()
    user_data = []
    
    # Track previous expenses for momentum calculation
    category_history = {cat: [] for cat in EXPENSE_CATEGORIES.keys()}
    
    start_date = datetime.now() - timedelta(days=30 * num_months)
    
    for month_idx in range(num_months):
        month_date = start_date + timedelta(days=30 * month_idx)
        month_str = month_date.strftime('%Y-%m')
        
        month_expenses = {}
        for category, config in EXPENSE_CATEGORIES.items():
            expense = generate_monthly_expense(
                category,
                month_idx,
                config['base'],
                user_profile,
                category_history[category]
            )
            month_expenses[category] = expense
            category_history[category].append(expense)
        
        # Add some derived features
        total_expense = sum(month_expenses.values())
        
        user_data.append({
            'user_id': user_id,
            'month': month_str,
            'month_index': month_idx,
            **month_expenses,
            'total': round(total_expense, 2)
        })
    
    return user_data

def generate_dataset(num_users=1000, months_per_user=24):
    """Generate complete dataset with multiple users."""
    print(f"Generating data for {num_users} users over {months_per_user} months each...")
    
    all_data = []
    for user_id in range(num_users):
        if (user_id + 1) % 100 == 0:
            print(f"Generated data for {user_id + 1} users...")
        user_data = generate_user_data(user_id, months_per_user)
        all_data.extend(user_data)
    
    df = pd.DataFrame(all_data)
    print(f"\nGenerated {len(df)} records")
    print(f"Date range: {df['month'].min()} to {df['month'].max()}")
    print(f"\nSample statistics:")
    print(df[list(EXPENSE_CATEGORIES.keys()) + ['total']].describe())
    
    return df

def create_features(df):
    """Create additional features for model training."""
    df_features = df.copy()
    
    # Time-based features
    df_features['year'] = pd.to_datetime(df_features['month']).dt.year
    df_features['month_num'] = pd.to_datetime(df_features['month']).dt.month
    
    # Lag features (previous months' expenses)
    category_cols = list(EXPENSE_CATEGORIES.keys())
    
    for category in category_cols:
        # Sort by user and month to ensure correct ordering
        df_features = df_features.sort_values(['user_id', 'month_index'])
        
        # Create lag features (1, 2, 3 months back)
        for lag in [1, 2, 3]:
            df_features[f'{category}_lag{lag}'] = df_features.groupby('user_id')[category].shift(lag)
        
        # Rolling averages
        df_features[f'{category}_rolling_avg_3'] = df_features.groupby('user_id')[category].transform(
            lambda x: x.rolling(window=3, min_periods=1).mean()
        )
    
    # Fill NaN values in lag features with 0 (for first few months)
    lag_cols = [col for col in df_features.columns if 'lag' in col or 'rolling' in col]
    df_features[lag_cols] = df_features[lag_cols].fillna(0)
    
    return df_features

if __name__ == "__main__":
    # Generate training data
    print("=" * 60)
    print("EXPENSE PREDICTION MODEL - DATA GENERATION")
    print("=" * 60)
    
    df = generate_dataset(num_users=1000, months_per_user=24)
    
    # Create features
    print("\nCreating features...")
    df_features = create_features(df)
    
    # Save data
    print("\nSaving data...")
    df_features.to_csv('expense_training_data.csv', index=False)
    print("Saved to: expense_training_data.csv")
    
    # Save metadata
    metadata = {
        'categories': list(EXPENSE_CATEGORIES.keys()),
        'num_users': len(df['user_id'].unique()),
        'num_months': len(df['month'].unique()),
        'total_records': len(df),
        'date_range': {
            'start': df['month'].min(),
            'end': df['month'].max()
        }
    }
    
    with open('data_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    print("Saved metadata to: data_metadata.json")
    
    print("\n" + "=" * 60)
    print("DATA GENERATION COMPLETE!")
    print("=" * 60)
