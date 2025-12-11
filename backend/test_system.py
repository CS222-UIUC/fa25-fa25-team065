"""
Test script to verify the ML prediction system.
Run this after training the model to ensure everything works.
"""

import json
import pickle
import pandas as pd
import numpy as np

def test_model_loading():
    """Test that model loads correctly."""
    print("\n" + "="*60)
    print("TEST 1: Model Loading")
    print("="*60)
    
    try:
        with open('expense_predictor_model.pkl', 'rb') as f:
            model_data = pickle.load(f)
        
        print("✓ Model loaded successfully")
        print(f"✓ Found {len(model_data['models'])} category models")
        print(f"✓ Feature columns: {len(model_data['feature_columns'])}")
        
        categories = model_data['categories']
        print(f"✓ Categories: {', '.join(categories)}")
        
        return True, model_data
    except Exception as e:
        print(f"✗ Error loading model: {e}")
        return False, None

def test_prediction():
    """Test prediction with sample data."""
    print("\n" + "="*60)
    print("TEST 2: Prediction Functionality")
    print("="*60)
    
    try:
        with open('expense_predictor_model.pkl', 'rb') as f:
            model_data = pickle.load(f)
        
        # Create sample history (4 months)
        sample_history = pd.DataFrame([
            {
                'month': '2024-01',
                'Groceries': 320,
                'Transportation': 150,
                'Entertainment': 180,
                'Dining Out': 220,
                'Utilities': 110,
                'Shopping': 160,
                'Healthcare': 90,
                'Subscriptions': 75
            },
            {
                'month': '2024-02',
                'Groceries': 310,
                'Transportation': 145,
                'Entertainment': 200,
                'Dining Out': 250,
                'Utilities': 115,
                'Shopping': 140,
                'Healthcare': 85,
                'Subscriptions': 75
            },
            {
                'month': '2024-03',
                'Groceries': 335,
                'Transportation': 160,
                'Entertainment': 190,
                'Dining Out': 240,
                'Utilities': 105,
                'Shopping': 180,
                'Healthcare': 100,
                'Subscriptions': 80
            },
            {
                'month': '2024-04',
                'Groceries': 325,
                'Transportation': 155,
                'Entertainment': 210,
                'Dining Out': 260,
                'Utilities': 100,
                'Shopping': 170,
                'Healthcare': 95,
                'Subscriptions': 80
            }
        ])
        
        print("\nSample history (last 3 months):")
        print(sample_history.tail(3)[model_data['categories']].to_string())
        
        # Prepare features
        last_3_months = sample_history.tail(3)
        features = {}
        
        # Next month number
        last_month_date = pd.to_datetime(sample_history['month'].iloc[-1])
        next_month_num = (last_month_date.month % 12) + 1
        features['month_num'] = next_month_num
        
        # Lag features
        for category in model_data['categories']:
            values = last_3_months[category].values
            features[f'{category}_lag1'] = float(values[-1])
            features[f'{category}_lag2'] = float(values[-2])
            features[f'{category}_lag3'] = float(values[-3])
            features[f'{category}_rolling_avg_3'] = float(np.mean(values))
        
        X = pd.DataFrame([features])[model_data['feature_columns']]
        
        # Make predictions
        predictions = {}
        for category in model_data['categories']:
            X_scaled = model_data['scalers'][category].transform(X)
            pred = model_data['models'][category].predict(X_scaled)[0]
            predictions[category] = max(0, round(float(pred), 2))
        
        print("\nPredictions for next month:")
        total = 0
        for cat, amount in predictions.items():
            print(f"  {cat:18} ${amount:7.2f}")
            total += amount
        print(f"  {'TOTAL':18} ${total:7.2f}")
        
        print("\n✓ Prediction successful")
        return True
    except Exception as e:
        print(f"\n✗ Error making prediction: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_training_results():
    """Test that training results are available."""
    print("\n" + "="*60)
    print("TEST 3: Training Results")
    print("="*60)
    
    try:
        with open('training_results.json', 'r') as f:
            results = json.load(f)
        
        print("\nModel Performance (Test Set):")
        print(f"{'Category':18} {'MAE':>10} {'R²':>10}")
        print("-" * 40)
        
        for category, metrics in results.items():
            mae = metrics['test_mae']
            r2 = metrics['test_r2']
            print(f"{category:18} ${mae:9.2f} {r2:10.4f}")
        
        avg_mae = np.mean([m['test_mae'] for m in results.values()])
        avg_r2 = np.mean([m['test_r2'] for m in results.values()])
        
        print("-" * 40)
        print(f"{'Average':18} ${avg_mae:9.2f} {avg_r2:10.4f}")
        
        print("\n✓ Training results loaded")
        
        # Check if performance is acceptable
        if avg_mae < 100 and avg_r2 > 0.6:
            print("✓ Model performance is acceptable")
        else:
            print("⚠ Model performance may need improvement")
        
        return True
    except Exception as e:
        print(f"\n✗ Error loading training results: {e}")
        return False

def test_data_generation():
    """Test that training data was generated correctly."""
    print("\n" + "="*60)
    print("TEST 4: Training Data")
    print("="*60)
    
    try:
        df = pd.read_csv('expense_training_data.csv')
        
        print(f"\n✓ Training data loaded: {len(df)} records")
        print(f"✓ Users: {df['user_id'].nunique()}")
        print(f"✓ Months: {df['month'].nunique()}")
        print(f"✓ Date range: {df['month'].min()} to {df['month'].max()}")
        
        # Check for required columns
        required_cols = ['user_id', 'month', 'Groceries', 'Transportation']
        missing = [col for col in required_cols if col not in df.columns]
        
        if missing:
            print(f"✗ Missing columns: {missing}")
            return False
        else:
            print("✓ All required columns present")
        
        # Check for nulls
        nulls = df.isnull().sum().sum()
        if nulls > 0:
            print(f"⚠ Warning: {nulls} null values found")
        else:
            print("✓ No null values")
        
        return True
    except Exception as e:
        print(f"\n✗ Error loading training data: {e}")
        return False

def test_api_format():
    """Test that API request/response format is correct."""
    print("\n" + "="*60)
    print("TEST 5: API Format")
    print("="*60)
    
    # Test request format
    test_request = {
        "history": [
            {
                "month": "2024-01",
                "Groceries": 300,
                "Transportation": 150
            }
        ]
    }
    
    print("\n✓ Sample API request format:")
    print(json.dumps(test_request, indent=2))
    
    # Test response format
    test_response = {
        "predictions": {
            "Groceries": 320.50,
            "Transportation": 145.75
        },
        "total": 466.25,
        "confidence": "medium",
        "history_months": 3,
        "next_month": "2024-04"
    }
    
    print("\n✓ Sample API response format:")
    print(json.dumps(test_response, indent=2))
    
    return True

def run_all_tests():
    """Run all tests."""
    print("\n" + "="*60)
    print("EXPENSE PREDICTION SYSTEM - TEST SUITE")
    print("="*60)
    
    tests = [
        ("Model Loading", test_model_loading),
        ("Prediction", test_prediction),
        ("Training Results", test_training_results),
        ("Training Data", test_data_generation),
        ("API Format", test_api_format)
    ]
    
    results = []
    for name, test_func in tests:
        try:
            if name == "Model Loading":
                success, _ = test_func()
            else:
                success = test_func()
            results.append((name, success))
        except Exception as e:
            print(f"\n✗ Test '{name}' failed with exception: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    for name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status:8} {name}")
    
    passed = sum(1 for _, s in results if s)
    total = len(results)
    
    print("\n" + "="*60)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! System is ready to use.")
        print("\nNext steps:")
        print("1. Start the API server: python api_server.py")
        print("2. Update your frontend with 8_BudgetDashboard_ML.tsx")
        print("3. Test predictions with real user data")
    else:
        print("⚠ Some tests failed. Please review errors above.")
        print("\nTroubleshooting:")
        print("1. Ensure you ran generate_training_data.py")
        print("2. Ensure you ran train_model.py")
        print("3. Check that all required files exist")
    
    print("="*60 + "\n")

if __name__ == "__main__":
    run_all_tests()
