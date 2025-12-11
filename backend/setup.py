#!/usr/bin/env python3
"""
Quick setup script for the AI Budget Prediction System.
Runs all necessary steps to get the system up and running.
"""

import subprocess
import sys
import os
from pathlib import Path

def print_header(text):
    """Print a formatted header."""
    print("\n" + "="*70)
    print(f"  {text}")
    print("="*70 + "\n")

def run_command(cmd, description):
    """Run a command and handle errors."""
    print(f"▶ {description}...")
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=True,
            capture_output=True,
            text=True
        )
        print(f"✓ {description} completed successfully\n")
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        print(f"✗ {description} failed!")
        print(f"Error: {e.stderr}")
        return False, None

def check_file_exists(filepath):
    """Check if a file exists."""
    return Path(filepath).exists()

def main():
    print_header("AI-POWERED BUDGET PREDICTION SYSTEM - QUICK SETUP")
    
    print("""
This script will:
1. Check Python dependencies
2. Generate synthetic training data (1000 users × 24 months)
3. Train machine learning models
4. Run system tests
5. Provide next steps

Estimated time: 3-5 minutes
""")
    
    response = input("Continue? (y/n): ")
    if response.lower() != 'y':
        print("Setup cancelled.")
        return
    
    # Step 1: Check dependencies
    print_header("STEP 1: Checking Dependencies")
    
    required_packages = [
        'flask', 'flask_cors', 'pandas', 'numpy', 
        'sklearn', 'matplotlib'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package)
            print(f"✓ {package}")
        except ImportError:
            print(f"✗ {package} (missing)")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n⚠ Missing packages: {', '.join(missing_packages)}")
        print("\nInstalling missing packages...")
        success, _ = run_command(
            "pip install -r requirements.txt",
            "Installing dependencies"
        )
        if not success:
            print("✗ Failed to install dependencies. Please run:")
            print("   pip install -r requirements.txt")
            return
    else:
        print("\n✓ All dependencies installed")
    
    # Step 2: Generate training data
    print_header("STEP 2: Generating Training Data")
    
    if check_file_exists('expense_training_data.csv'):
        print("⚠ Training data already exists.")
        response = input("Regenerate? (y/n): ")
        if response.lower() != 'y':
            print("Skipping data generation...")
        else:
            success, _ = run_command(
                "python generate_training_data.py",
                "Generating training data"
            )
            if not success:
                print("✗ Data generation failed")
                return
    else:
        success, _ = run_command(
            "python generate_training_data.py",
            "Generating training data"
        )
        if not success:
            print("✗ Data generation failed")
            return
    
    # Step 3: Train models
    print_header("STEP 3: Training ML Models")
    
    if check_file_exists('expense_predictor_model.pkl'):
        print("⚠ Trained model already exists.")
        response = input("Retrain? (y/n): ")
        if response.lower() != 'y':
            print("Skipping model training...")
        else:
            success, _ = run_command(
                "python train_model.py",
                "Training models"
            )
            if not success:
                print("✗ Model training failed")
                return
    else:
        success, _ = run_command(
            "python train_model.py",
            "Training models"
        )
        if not success:
            print("✗ Model training failed")
            return
    
    # Step 4: Run tests
    print_header("STEP 4: Running System Tests")
    
    success, output = run_command(
        "python test_system.py",
        "Running tests"
    )
    
    if output:
        print(output)
    
    # Step 5: Next steps
    print_header("SETUP COMPLETE!")
    
    print("""
✓ System is ready to use!

📋 NEXT STEPS:

1. START THE API SERVER:
   python api_server.py
   
   The server will run on http://localhost:5000

2. UPDATE YOUR REACT FRONTEND:
   cp 8_BudgetDashboard_ML.tsx src/components/8_BudgetDashboard.tsx
   
3. START YOUR REACT APP:
   npm start
   
4. TEST THE SYSTEM:
   - Navigate to /budget in your app
   - Add expenses for 3+ months
   - Click "Get AI Predictions"

📖 DOCUMENTATION:
   See README_SETUP.md for detailed information

📊 FILES CREATED:
   - expense_training_data.csv (training data)
   - expense_predictor_model.pkl (trained models)
   - training_results.json (performance metrics)
   - prediction_examples.png (visualizations)

🎯 QUICK TEST:
   To verify the API is working:
   1. python api_server.py  (in one terminal)
   2. curl http://localhost:5000/health  (in another terminal)

💡 TIP:
   The model works best with:
   - At least 3 months of expense history
   - Consistent spending patterns
   - Accurate expense amounts
""")
    
    print("="*70 + "\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nSetup interrupted by user.")
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
