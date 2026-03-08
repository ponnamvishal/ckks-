# Secure Cloud Analytics using CKKS + SSE on AWS

This project is a major-project prototype for privacy-preserving cloud analytics.

It combines:
- CKKS homomorphic encryption for encrypted numeric computation
- SSE (Searchable Symmetric Encryption) for encrypted keyword search
- AWS EC2 as backend host
- AWS S3 as dataset storage

The web app allows loading datasets from S3, encrypting data, running operations, decrypting results, and showing final outputs in tables/charts.

## Architecture

- Frontend: HTML/CSS/JavaScript served by Flask
- Backend: Flask API on EC2
- Storage: S3 bucket for CSV/JSON/TXT datasets
- Crypto:
  - CKKS via TenSEAL for numeric operations
  - SSE via deterministic encrypted keyword indexing

Data flow:
1. User selects dataset from S3
2. Backend loads dataset and returns records/columns
3. Frontend encrypts selected data flow through backend upload endpoint
4. Backend computes on encrypted vectors
5. Result is decrypted for display and verification

## Implemented Features

### CKKS workflow
- S3 dataset list/load
- Encrypt selected column data
- Operations:
  - Mean
  - Mode
  - Variance
  - Histogram (numeric summary workflow)
  - Minimum
  - Maximum
- Decrypt result
- Final result table behavior:
  - For min/max/mode: shows only matching rows from dataset
  - If exact value is unavailable: uses nearest available value and notes it
  - For mean/variance/histogram: row-level matching is shown as not applicable

### SSE workflow
- S3 dataset list/load (records)
- Select keyword column
- Encrypt keywords and index records
- Encrypted keyword search
- Decrypt and show matching rows in table format

### AWS integration
- S3 dataset APIs integrated in backend
- Frontend uses S3 endpoints for both CKKS and SSE tabs
- EC2 IAM role based S3 access supported

## Tech Stack

- Python 3
- Flask + Flask-CORS
- TenSEAL
- NumPy + Pandas
- Boto3
- Vanilla JS + Chart.js

## Project Structure

```text
client/
  ckks_client.py
  sse_client.py
server/
  app.py
  ckks_compute.py
  sse_server.py
shared/
  crypto_context.py
frontend/
  index.html
  css/style.css
  js/app.js
  js/api-client.js
  js/crypto-utils.js
requirements.txt
README.md
```

## AWS Configuration

Set these environment variables on EC2 before running server:

```bash
export S3_BUCKET_NAME=homomorphicckks
export AWS_REGION=eu-north-1
export S3_DATASETS_PREFIX=
```

Notes:
- `S3_DATASETS_PREFIX` can be empty to read bucket root.
- If your files are inside a folder (example `datasets/`), set `S3_DATASETS_PREFIX=datasets/`.

## Run on Ubuntu (EC2)

```bash
cd ~/ckks-
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export S3_BUCKET_NAME=homomorphicckks
export AWS_REGION=eu-north-1
export S3_DATASETS_PREFIX=

python3 -m server.app
```

Server runs on port `5001`.

If using public access in browser, open:
- `http://<EC2_PUBLIC_IP>:5001`

Also ensure EC2 security group allows inbound TCP `5001`.

## Quick API Checks

```bash
# health
curl http://13.49.222.79:5001/health

# list S3 datasets
curl http://13.49.222.79:5001/s3/datasets

# list columns for one key
curl "http://13.49.222.79:5001/s3/dataset/columns?key=healthcare_dataset.csv"
```

## Main Endpoints

- `GET /health`
- `GET /vectors`
- `POST /upload`
- `GET /mean/<vector_id>`
- `GET /mode/<vector_id>`
- `GET /variance/<vector_id>`
- `GET /histogram/<vector_id>`
- `GET /min/<vector_id>`
- `GET /max/<vector_id>`
- `POST /decrypt`
- `POST /sse/store_records`
- `POST /sse/search`
- `GET /s3/datasets`
- `GET /s3/dataset/columns?key=<dataset_key>`
- `POST /s3/dataset/load`
- `POST /s3/dataset/records`

## Current Notes and Limitations

- This is a prototype for academic use.
- Some legacy local-dataset endpoints still exist (`/dataset/*`) for fallback compatibility.
- For mathematically aggregated operations (mean/variance/histogram), row filtering is intentionally not used.
- In-memory storage is used for vectors/index in current runtime process.

## Suggested Next Steps

- Move secrets/config into a `.env` strategy for deployment
- Add persistent storage for vector/index metadata
- Add unit/integration tests for CKKS and SSE endpoints
- Add production WSGI (gunicorn) and reverse proxy (nginx)

## License

For educational and research use.


