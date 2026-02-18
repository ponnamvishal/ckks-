# Sample Data Files

This directory contains sample CSV datasets for demonstration purposes.

## Files

### `sample_data.csv`
A comprehensive sample dataset with **30 rows** containing:
- **Numeric columns** (for CKKS computation):
  - `id`: Record identifier
  - `value`: Numeric values (mean ~100)
  - `price`: Price data (mean ~45)
  - `quantity`: Quantity values (1-100)
  - `revenue`: Revenue calculations

- **Text columns** (for SSE search):
  - `category`: Document categories (medical, financial, legal)
  - `keyword`: Searchable keywords (health, banking, research, contract, etc.)
  - `description`: Document descriptions

### `sample_dataset.csv`
Auto-generated dataset with 100 rows of numeric data (created if sample_data.csv doesn't exist).

## Usage

### For CKKS Computation:
1. Use numeric columns: `value`, `price`, `quantity`, `revenue`
2. Load via frontend: Select a numeric column and click "Load Dataset"
3. Data will be encrypted and uploaded for computation

### For SSE Search:
1. Use text columns: `category`, `keyword`, `description`
2. Load via frontend: Select a text column and click "Load Sample Keywords"
3. Keywords can be used to store and search documents

## API Endpoints

- `GET /dataset/columns` - List all columns (numeric and text)
- `POST /dataset/load` - Load data:
  - For CKKS: `{"column": "value", "n_samples": 20}`
  - For SSE: `{"column": "keyword", "n_samples": 10, "for_sse": true}`

## Example Data

The sample_data.csv includes realistic examples:
- Medical records with keywords: health, research, diagnosis, treatment
- Financial documents with keywords: banking, investment, audit, tax
- Legal documents with keywords: contract, compliance, litigation, patent
