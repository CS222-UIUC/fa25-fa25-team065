"""
Train ML model to predict next month's expenses by category.
Uses Random Forest with feature engineering for time series prediction.
"""

import numpy as np
import pandas as pd
import pickle
import json
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import matplotlib.pyplot as plt

EXPENSE_CATEGORIES = [
    'Groceries', 'Transportation', 'Entertainment', 'Dining Out',
    'Utilities', 'Shopping', 'Healthcare', 'Subscriptions'
]

class ExpensePredictor:
    """ML model to predict next month's expenses."""
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.feature_columns = None
        self.categories = EXPENSE_CATEGORIES
        
    def prepare_features(self, df, is_training=True):
        """Prepare feature matrix for training or prediction."""
        feature_cols = []
        
        # Month number (1-12 for seasonality)
        feature_cols.append('month_num')
        
        # Lag features for each category
        for category in self.categories:
            feature_cols.extend([
                f'{category}_lag1',
                f'{category}_lag2',
                f'{category}_lag3',
                f'{category}_rolling_avg_3'
            ])
        
        if is_training:
            self.feature_columns = feature_cols
        
        X = df[feature_cols].copy()
        return X
    
    def train(self, df, test_size=0.2):
        """Train separate models for each expense category."""
        print("\n" + "=" * 60)
        print("TRAINING EXPENSE PREDICTION MODELS")
        print("=" * 60)
        
        # Remove first 3 months per user (insufficient lag data)
        df_train = df[df['month_index'] >= 3].copy()
        
        print(f"\nTraining on {len(df_train)} records")
        print(f"Features: {len(self.categories) * 4 + 1}")
        
        # Prepare features
        X = self.prepare_features(df_train, is_training=True)
        
        results = {}
        
        for category in self.categories:
            print(f"\n--- Training model for {category} ---")
            
            y = df_train[category].values
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train model
            model = RandomForestRegressor(
                n_estimators=100,
                max_depth=15,
                min_samples_split=10,
                min_samples_leaf=5,
                random_state=42,
                n_jobs=-1
            )
            
            model.fit(X_train_scaled, y_train)
            
            # Evaluate
            y_pred_train = model.predict(X_train_scaled)
            y_pred_test = model.predict(X_test_scaled)
            
            train_mae = mean_absolute_error(y_train, y_pred_train)
            test_mae = mean_absolute_error(y_test, y_pred_test)
            train_r2 = r2_score(y_train, y_pred_train)
            test_r2 = r2_score(y_test, y_pred_test)
            
            print(f"Train MAE: ${train_mae:.2f}")
            print(f"Test MAE:  ${test_mae:.2f}")
            print(f"Train R²:  {train_r2:.4f}")
            print(f"Test R²:   {test_r2:.4f}")
            
            # Store model and scaler
            self.models[category] = model
            self.scalers[category] = scaler
            
            results[category] = {
                'train_mae': float(train_mae),
                'test_mae': float(test_mae),
                'train_r2': float(train_r2),
                'test_r2': float(test_r2)
            }
        
        return results
    
    def predict_next_month(self, user_history):
        """
        Predict next month's expenses given user's history.
        
        Args:
            user_history: DataFrame with columns for each category and 'month'
                         Must contain at least 3 months of data
        
        Returns:
            Dictionary with predicted expenses for each category
        """
        if len(user_history) < 3:
            raise ValueError("Need at least 3 months of history for prediction")
        
        # Sort by date
        user_history = user_history.sort_values('month')
        
        # Get the last 3 months for lag features
        last_3_months = user_history.tail(3)
        
        # Create feature row
        features = {}
        
        # Next month number (cyclical)
        last_month_date = pd.to_datetime(user_history['month'].iloc[-1])
        next_month_num = (last_month_date.month % 12) + 1
        features['month_num'] = next_month_num
        
        # Create lag features from history
        for category in self.categories:
            if category in user_history.columns:
                values = last_3_months[category].values
                features[f'{category}_lag1'] = values[-1] if len(values) >= 1 else 0
                features[f'{category}_lag2'] = values[-2] if len(values) >= 2 else 0
                features[f'{category}_lag3'] = values[-3] if len(values) >= 3 else 0
                features[f'{category}_rolling_avg_3'] = np.mean(values)
            else:
                # Category not present in history, use 0
                features[f'{category}_lag1'] = 0
                features[f'{category}_lag2'] = 0
                features[f'{category}_lag3'] = 0
                features[f'{category}_rolling_avg_3'] = 0
        
        # Create feature DataFrame
        X = pd.DataFrame([features])[self.feature_columns]
        
        # Predict for each category
        predictions = {}
        for category in self.categories:
            X_scaled = self.scalers[category].transform(X)
            pred = self.models[category].predict(X_scaled)[0]
            predictions[category] = max(0, round(pred, 2))  # Ensure non-negative
        
        predictions['total'] = round(sum(predictions.values()), 2)
        
        return predictions
    
    def save(self, filepath='expense_predictor_model.pkl'):
        """Save trained model to disk."""
        model_data = {
            'models': self.models,
            'scalers': self.scalers,
            'feature_columns': self.feature_columns,
            'categories': self.categories
        }
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        print(f"\nModel saved to: {filepath}")
    
    @classmethod
    def load(cls, filepath='expense_predictor_model.pkl'):
        """Load trained model from disk."""
        predictor = cls()
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        predictor.models = model_data['models']
        predictor.scalers = model_data['scalers']
        predictor.feature_columns = model_data['feature_columns']
        predictor.categories = model_data['categories']
        return predictor

def plot_predictions(df, predictor, user_ids=[0, 1, 2]):
    """Plot predictions vs actuals for sample users."""
    fig, axes = plt.subplots(len(user_ids), 1, figsize=(12, 4 * len(user_ids)))
    if len(user_ids) == 1:
        axes = [axes]
    
    for idx, user_id in enumerate(user_ids):
        user_data = df[df['user_id'] == user_id].sort_values('month_index')
        
        # Use first N months to predict N+1
        predictions = []
        actuals = []
        months = []
        
        for i in range(3, len(user_data)):
            history = user_data.iloc[:i]
            pred = predictor.predict_next_month(history)
            actual = user_data.iloc[i]['total']
            
            predictions.append(pred['total'])
            actuals.append(actual)
            months.append(user_data.iloc[i]['month'])
        
        axes[idx].plot(months, actuals, label='Actual', marker='o')
        axes[idx].plot(months, predictions, label='Predicted', marker='s', linestyle='--')
        axes[idx].set_title(f'User {user_id} - Total Monthly Expenses')
        axes[idx].set_xlabel('Month')
        axes[idx].set_ylabel('Total Expense ($)')
        axes[idx].legend()
        axes[idx].grid(True, alpha=0.3)
        axes[idx].tick_params(axis='x', rotation=45)
    
    plt.tight_layout()
    plt.savefig('prediction_examples.png', dpi=150, bbox_inches='tight')
    print("\nPrediction visualization saved to: prediction_examples.png")

if __name__ == "__main__":
    # Load training data
    print("\nLoading training data...")
    df = pd.read_csv('expense_training_data.csv')
    print(f"Loaded {len(df)} records")
    
    # Initialize and train predictor
    predictor = ExpensePredictor()
    results = predictor.train(df)
    
    # Save results
    print("\n" + "=" * 60)
    print("TRAINING RESULTS SUMMARY")
    print("=" * 60)
    for category, metrics in results.items():
        print(f"\n{category}:")
        print(f"  Test MAE: ${metrics['test_mae']:.2f}")
        print(f"  Test R²:  {metrics['test_r2']:.4f}")
    
    # Save model
    predictor.save('expense_predictor_model.pkl')
    
    # Save results as JSON
    with open('training_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    print("\nTraining results saved to: training_results.json")
    
    # Test prediction on sample user
    print("\n" + "=" * 60)
    print("TESTING PREDICTION")
    print("=" * 60)
    
    test_user = df[df['user_id'] == 0].sort_values('month_index').head(12)
    history = test_user[['month'] + EXPENSE_CATEGORIES].copy()
    
    print("\nLast 3 months of history:")
    print(history.tail(3)[EXPENSE_CATEGORIES].to_string())
    
    prediction = predictor.predict_next_month(history)
    print("\nPredicted next month:")
    for cat, val in prediction.items():
        print(f"  {cat}: ${val:.2f}")
    
    # Create visualization
    print("\nGenerating prediction visualizations...")
    plot_predictions(df, predictor, user_ids=[0, 1, 2])
    
    print("\n" + "=" * 60)
    print("TRAINING COMPLETE!")
    print("=" * 60)
