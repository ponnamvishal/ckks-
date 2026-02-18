"""
Load example dataset from Kaggle for demonstration.
Uses a simple CSV dataset that doesn't require Kaggle API.
"""

import pandas as pd
import numpy as np
import os
import requests
from pathlib import Path

DATA_DIR = Path(__file__).parent

def download_sample_dataset():
    """
    Create a sample dataset for demonstration with both numeric and text data.
    Includes data suitable for both CKKS computation and SSE search.
    """
    print("Creating sample dataset for demonstration...")
    
    # Check if sample_data.csv exists (our comprehensive sample)
    sample_csv = DATA_DIR / 'sample_data.csv'
    if sample_csv.exists():
        print(f"✓ Using existing sample dataset: {sample_csv}")
        df = pd.read_csv(sample_csv)
        return df, sample_csv
    
    # Generate sample numeric data (sales, prices, etc.)
    np.random.seed(42)
    n_samples = 100
    
    # Categories and keywords for SSE search
    categories = ['medical', 'financial', 'legal'] * (n_samples // 3 + 1)
    keywords = ['health', 'banking', 'research', 'contract', 'investment', 'diagnosis', 
                'compliance', 'audit', 'treatment', 'litigation', 'loan', 'prescription',
                'patent', 'tax', 'lab', 'agreement', 'credit', 'imaging', 'license', 
                'insurance', 'emergency', 'will', 'mortgage', 'vaccination', 'deed',
                'statement', 'discharge', 'report', 'consultation']
    
    data = {
        'id': range(1, n_samples + 1),
        'value': np.random.normal(100, 20, n_samples),
        'price': np.random.normal(50, 10, n_samples),
        'quantity': np.random.randint(1, 100, n_samples),
        'revenue': np.random.normal(5000, 1000, n_samples),
        'category': categories[:n_samples],
        'keyword': [np.random.choice(keywords) for _ in range(n_samples)],
        'description': [f"Sample document {i}" for i in range(1, n_samples + 1)]
    }
    
    df = pd.DataFrame(data)
    
    # Save to CSV
    csv_path = DATA_DIR / 'sample_dataset.csv'
    df.to_csv(csv_path, index=False)
    
    print(f"✓ Sample dataset created: {csv_path}")
    print(f"  Rows: {len(df)}")
    print(f"  Columns: {list(df.columns)}")
    
    return df, csv_path

def load_dataset(csv_path=None):
    """
    Load dataset from CSV file.
    
    Args:
        csv_path: Path to CSV file. If None, uses default sample dataset.
        
    Returns:
        pandas.DataFrame: Loaded dataset
    """
    if csv_path is None:
        # Try sample_data.csv first (comprehensive), then sample_dataset.csv
        sample_data_path = DATA_DIR / 'sample_data.csv'
        sample_dataset_path = DATA_DIR / 'sample_dataset.csv'
        
        if sample_data_path.exists():
            csv_path = sample_data_path
        elif sample_dataset_path.exists():
            csv_path = sample_dataset_path
        else:
            print(f"Dataset not found. Creating sample dataset...")
            return download_sample_dataset()[0]
    
    if not os.path.exists(csv_path):
        print(f"Dataset not found at {csv_path}. Creating sample dataset...")
        return download_sample_dataset()[0]
    
    df = pd.read_csv(csv_path)
    return df

def get_numeric_columns(df):
    """Extract numeric columns from dataframe."""
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    return numeric_cols

def get_sample_data(df, column=None, n_samples=10):
    """
    Get sample data from a column.
    
    Args:
        df: DataFrame
        column: Column name. If None, uses first numeric column.
        n_samples: Number of samples to return
        
    Returns:
        list: Sample values
    """
    numeric_cols = get_numeric_columns(df)
    
    if not numeric_cols:
        raise ValueError("No numeric columns found in dataset")
    
    if column is None:
        column = numeric_cols[0]
    
    if column not in numeric_cols:
        raise ValueError(f"Column '{column}' is not numeric")
    
    values = df[column].dropna().head(n_samples).tolist()
    return values

if __name__ == "__main__":
    # Test the dataset loader
    print("Loading sample dataset...")
    df = load_dataset()
    
    print("\nDataset Info:")
    print(df.head())
    print(f"\nNumeric columns: {get_numeric_columns(df)}")
    
    # Get sample data
    sample = get_sample_data(df, n_samples=10)
    print(f"\nSample values (first 10): {sample}")
