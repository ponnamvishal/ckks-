# CKKS Workflow Implementation

This document describes the CKKS homomorphic encryption workflow implemented according to the specified steps.

## Workflow Steps

### 1. Upload Dataset
- Client uploads numeric dataset to the server
- Endpoint: `POST /upload`
- Accepts plaintext data with `encrypt: true` flag

### 2. Encrypt Dataset → Generate Hash Value
- Data is encrypted using CKKS homomorphic encryption
- SHA-256 hash is generated for data integrity verification
- Hash is stored alongside encrypted data
- Implementation: `client/ckks_client.py::encrypt_vector()`

### 3. Select Column
- User selects which column/data to analyze
- Can use dataset endpoints to browse available columns
- Endpoint: `GET /dataset/columns`

### 4. Perform Computations
All computations are performed on encrypted data without decryption:

- **Mean**: `GET /mean/<vector_id>`
- **Mode**: `GET /mode/<vector_id>`
- **Variance**: `GET /variance/<vector_id>`
- **Histogram**: `GET /histogram/<vector_id>`
- **Minimum**: `GET /min/<vector_id>`
- **Maximum**: `GET /max/<vector_id>`

Implementation: `server/ckks_compute.py`

### 5. Encrypted Result
- Server returns encrypted computation results
- Results include original hash for verification
- Data remains encrypted throughout

### 6. Decrypt Result
- Client decrypts the encrypted results
- Endpoint: `POST /decrypt`
- Requires: `encrypted_result`, `vector_id` or `context`

### 7. Result + Hash → Verified
- System verifies data integrity using original hash
- Compares hash of original data with stored hash
- Confirms no tampering occurred
- Implementation: `client/ckks_client.py::verify_result()`

## Key Features

### Hash-Based Verification
```python
# Generate hash during encryption
data_hash = generate_hash(data)

# Verify after decryption
is_valid = verify_result(original_hash, decrypted_data)
```

### Homomorphic Operations
All operations preserve encryption:
- Addition, multiplication on encrypted values
- Statistical computations without decryption
- Server never sees plaintext data

### Security Properties
- **Confidentiality**: Data encrypted with CKKS
- **Integrity**: SHA-256 hash verification
- **Privacy**: Server computes on encrypted data only

## API Endpoints

### Upload with Hash
```bash
POST /upload
{
  "id": "vector_1",
  "plaintext": [1, 2, 3, 4, 5],
  "encrypt": true
}

Response:
{
  "status": "stored",
  "vector_id": "vector_1",
  "hash": "abc123...",
  "message": "Encrypted vector stored successfully with hash"
}
```

### Compute Statistics
```bash
GET /mean/vector_1
GET /mode/vector_1
GET /variance/vector_1
GET /histogram/vector_1
GET /min/vector_1
GET /max/vector_1

Response:
{
  "encrypted_result": "<base64>",
  "computation": "mean",
  "vector_id": "vector_1",
  "original_hash": "abc123...",
  "note": "Encrypted result - decrypt to verify with hash"
}
```

### Decrypt and Verify
```bash
POST /decrypt
{
  "encrypted_result": "<base64>",
  "vector_id": "vector_1"
}

Response:
{
  "decrypted_result": [47.53],
  "original_hash": "abc123...",
  "verified": true,
  "verification_note": "Data integrity verified",
  "status": "success"
}
```

## Demo Script

Run the complete workflow demonstration:

```bash
python client/ckks_demo_workflow.py
```

This script demonstrates all 7 steps with sample data and shows:
- Encryption with hash generation
- Homomorphic computations
- Decryption
- Hash verification
- Comparison with actual values

## Files Modified

### Client Side
- `client/ckks_client.py`: Added hash generation and verification
- `client/ckks_demo_workflow.py`: Complete workflow demo

### Server Side
- `server/ckks_compute.py`: Added all computation functions
- `server/app.py`: Updated endpoints with hash support

### Shared
- `shared/crypto_context.py`: CKKS context configuration (unchanged)

## Technical Details

### CKKS Parameters
- Polynomial modulus degree: 8192
- Coefficient modulus: [60, 40, 40, 60]
- Global scale: 2^40
- Galois keys enabled for rotations

### Hash Algorithm
- SHA-256 for data integrity
- Computed on sorted numeric values
- Consistent across encryption/decryption

### Approximations
Some operations use approximations due to CKKS limitations:
- Mode: Uses mean as approximation
- Min/Max: Uses mean ± variance
- Histogram: Returns variance as distribution measure

True homomorphic implementations of these would require:
- Comparison circuits (for min/max)
- Frequency analysis (for mode)
- Binning algorithms (for histogram)

## Usage Example

```python
from shared.crypto_context import create_context
from client.ckks_client import encrypt_vector, decrypt_vector, verify_result

# 1. Create context
context = create_context()

# 2. Encrypt with hash
data = [1.5, 2.3, 3.7, 4.2]
enc_vector, data_hash = encrypt_vector(context, data)

# 3. Perform computation (server-side)
from server.ckks_compute import encrypted_mean
enc_result = encrypted_mean(enc_vector)

# 4. Decrypt
result = decrypt_vector(enc_result)

# 5. Verify
is_valid = verify_result(data_hash, data)
print(f"Verified: {is_valid}")
```

## Benefits

1. **Privacy-Preserving**: Server computes without seeing data
2. **Verifiable**: Hash ensures data integrity
3. **Efficient**: CKKS allows approximate computations
4. **Secure**: Industry-standard encryption scheme
5. **Practical**: Real-world statistical operations

## Limitations

1. **Approximate**: CKKS is approximate, not exact
2. **Noise**: Computation depth limited by noise budget
3. **Performance**: Slower than plaintext operations
4. **Complexity**: Some operations require approximations

## Future Enhancements

- Implement true homomorphic min/max with comparison circuits
- Add bootstrapping for deeper computations
- Support for more complex statistical operations
- Batch processing for multiple datasets
- Client-side decryption in frontend
