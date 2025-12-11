"""
Flask API server for expense prediction.
Provides endpoints to get predictions based on user's expense history.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import pickle
import numpy as np
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Load the trained model
try:
    with open('expense_predictor_model.pkl', 'rb') as f:
        model_data = pickle.load(f)
        logger.info("Model loaded successfully")
except FileNotFoundError:
    logger.error("Model file not found. Run train_model.py first!")
    model_data = None

EXPENSE_CATEGORIES = [
    'Groceries', 'Transportation', 'Entertainment', 'Dining Out',
    'Utilities', 'Shopping', 'Healthcare', 'Subscriptions'
]

def predict_expenses(user_history):
    """
    Predict next month's expenses given user history.
    Only predicts for categories the user has actually used.
    
    Args:
        user_history: List of dicts with 'month' and category amounts
    
    Returns:
        Dictionary with predictions for each category
    """
    if model_data is None:
        raise RuntimeError("Model not loaded")
    
    if len(user_history) < 3:
        # Not enough history - return default predictions
        return {
            'predictions': {cat: 0 for cat in EXPENSE_CATEGORIES},
            'total': 0,
            'confidence': 'low',
            'message': 'Need at least 3 months of history for accurate predictions'
        }
    
    # Convert to DataFrame
    df = pd.DataFrame(user_history)
    
    # Fill any NaN values with 0 (safety measure)
    df = df.fillna(0)
    
    # Identify categories the user has actually used (non-zero values in history)
    user_categories = set()
    for cat in EXPENSE_CATEGORIES:
        if cat in df.columns:
            # Check if user has any non-zero spending in this category
            # Convert to numeric first to handle any string values
            df[cat] = pd.to_numeric(df[cat], errors='coerce').fillna(0)
            if df[cat].sum() > 0:
                user_categories.add(cat)
    
    logger.info(f"User has used {len(user_categories)} categories: {sorted(user_categories)}")
    
    # Ensure all categories are present in DataFrame (for feature building)
    for cat in EXPENSE_CATEGORIES:
        if cat not in df.columns:
            df[cat] = 0
        else:
            # Ensure numeric and fill NaN
            df[cat] = pd.to_numeric(df[cat], errors='coerce').fillna(0)
    
    # Sort by month
    df = df.sort_values('month')
    
    # Get last 3 months for lag features
    last_3_months = df.tail(3)
    
    # Build feature vector
    features = {}
    
    # Next month number
    last_month_date = pd.to_datetime(df['month'].iloc[-1])
    next_month_num = (last_month_date.month % 12) + 1
    features['month_num'] = next_month_num
    
    # Lag features
    for category in EXPENSE_CATEGORIES:
        values = last_3_months[category].values
        features[f'{category}_lag1'] = float(values[-1]) if len(values) >= 1 else 0
        features[f'{category}_lag2'] = float(values[-2]) if len(values) >= 2 else 0
        features[f'{category}_lag3'] = float(values[-3]) if len(values) >= 3 else 0
        features[f'{category}_rolling_avg_3'] = float(np.mean(values))
    
    # Create feature DataFrame
    X = pd.DataFrame([features])[model_data['feature_columns']]
    
    # Predict ONLY for categories the user has actually used
    # Set all other categories to 0
    predictions = {}
    for category in EXPENSE_CATEGORIES:
        if category in user_categories:
            # User has used this category - make prediction
            X_scaled = model_data['scalers'][category].transform(X)
            pred = model_data['models'][category].predict(X_scaled)[0]
            predictions[category] = max(0, round(float(pred), 2))
        else:
            # User has never used this category - set to 0
            predictions[category] = 0
    
    total = round(sum(predictions.values()), 2)
    
    # Calculate confidence based on variance in history
    confidence = 'medium'
    if len(user_history) >= 6:
        # Check variance - lower variance = higher confidence
        category_variances = []
        for cat in EXPENSE_CATEGORIES:
            if cat in df.columns and df[cat].sum() > 0:
                cv = df[cat].std() / (df[cat].mean() + 1e-6)  # Coefficient of variation
                category_variances.append(cv)
        
        if category_variances:
            avg_cv = np.mean(category_variances)
            if avg_cv < 0.3:
                confidence = 'high'
            elif avg_cv > 0.6:
                confidence = 'low'
    
    return {
        'predictions': predictions,
        'total': total,
        'confidence': confidence,
        'history_months': len(user_history),
        'next_month': f"{last_month_date.year}-{next_month_num:02d}"
    }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model_data is not None
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Predict next month's expenses.
    
    Expected request body:
    {
        "history": [
            {
                "month": "2024-01",
                "Groceries": 300,
                "Transportation": 150,
                ...
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'history' not in data:
            return jsonify({'error': 'Missing history data'}), 400
        
        history = data['history']
        
        if not isinstance(history, list) or len(history) == 0:
            return jsonify({'error': 'History must be a non-empty list'}), 400
        
        # Validate history format
        for entry in history:
            if 'month' not in entry:
                return jsonify({'error': 'Each history entry must have a month field'}), 400
        
        logger.info(f"Received prediction request with {len(history)} months of history")
        
        result = predict_expenses(history)
        
        logger.info(f"Prediction successful: total=${result['total']}")
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get list of supported expense categories."""
    return jsonify({
        'categories': EXPENSE_CATEGORIES
    })

@app.route('/api/recommendations', methods=['POST'])
def get_recommendations():
    """
    Get budget recommendations based on predictions.
    
    Expected request body:
    {
        "predictions": {...},
        "current_budget": 2000
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'predictions' not in data:
            return jsonify({'error': 'Missing predictions data'}), 400
        
        predictions = data['predictions']
        current_budget = data.get('current_budget', 2000)
        
        total_predicted = sum(predictions.values())
        
        recommendations = []
        
        # Budget vs prediction comparison
        if total_predicted > current_budget:
            difference = total_predicted - current_budget
            recommendations.append({
                'type': 'warning',
                'message': f'Your predicted expenses (${total_predicted:.2f}) exceed your budget by ${difference:.2f}',
                'action': 'Consider reducing spending in high-expense categories'
            })
        elif total_predicted < current_budget * 0.7:
            difference = current_budget - total_predicted
            recommendations.append({
                'type': 'success',
                'message': f'You\'re on track to save ${difference:.2f} this month!',
                'action': 'Consider putting extra savings into an emergency fund'
            })
        
        # Category-specific recommendations
        high_categories = [(cat, amt) for cat, amt in predictions.items() 
                          if amt > 0 and cat != 'total']
        high_categories.sort(key=lambda x: x[1], reverse=True)
        
        if high_categories:
            top_category, top_amount = high_categories[0]
            pct = (top_amount / total_predicted) * 100
            if pct > 30:
                recommendations.append({
                    'type': 'tip',
                    'message': f'{top_category} is your largest expense at {pct:.1f}% of total spending',
                    'action': f'Look for ways to optimize {top_category} costs'
                })
        
        # General tips
        if len(recommendations) < 3:
            recommendations.append({
                'type': 'tip',
                'message': 'Track your expenses weekly to stay on budget',
                'action': 'Set up spending alerts for each category'
            })
        
        return jsonify({
            'recommendations': recommendations,
            'predicted_total': round(total_predicted, 2),
            'budget_difference': round(current_budget - total_predicted, 2),
            'savings_potential': round(max(0, current_budget - total_predicted), 2)
        })
    
    except Exception as e:
        logger.error(f"Recommendations error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    if model_data is None:
        logger.error("Cannot start server without model. Run train_model.py first!")
    else:
        logger.info("Starting Flask server...")
        app.run(debug=True, host='0.0.0.0', port=5001)
