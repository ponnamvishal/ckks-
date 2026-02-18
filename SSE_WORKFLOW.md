# SSE (Searchable Symmetric Encryption) Workflow

## Overview
The SSE implementation allows you to upload a dataset (like hospital records), encrypt keywords, and search for specific records (like "cancer patients") without revealing the search terms to the server.

## 7-Step Workflow

### Step 1: Upload Dataset
- Upload a CSV file containing your data
- Example: hospital_data.csv with columns like Name, Age, Condition, Treatment, etc.
- System parses the CSV and shows all columns

### Step 2: Encrypt
- Select which column contains the keywords to search (e.g., "Condition" or "Diagnosis")
- Click "Encrypt Keywords" button
- System encrypts all keywords using SSE and stores records on server
- Server never sees plaintext keywords

### Step 3: Keyword Search
- Enter a search keyword (e.g., "cancer", "diabetes", "heart disease")
- Click "Search" button
- Keyword is prepared for encryption

### Step 4: (Keyword Encrypt)
- Search keyword is encrypted using the same method as Step 2
- Encrypted keyword is sent to server
- Server never sees the plaintext search term

### Step 5: Encrypted Result
- Server searches the encrypted index
- Finds matching record IDs
- Returns encrypted results
- Server doesn't know what was searched or what matched

### Step 6: Decrypt
- Click "Decrypt Results" button
- System decrypts the matching records
- Prepares data for display

### Step 7: Table Form Result
- Matching records displayed in a table
- Shows all columns from the original CSV
- Easy to read and analyze results

## Example Use Case: Hospital Data

### Sample Data (hospital_data.csv)
```csv
Name,Age,Gender,Condition,Treatment,Doctor
John Doe,45,Male,Cancer,Chemotherapy,Dr. Smith
Jane Smith,32,Female,Diabetes,Insulin,Dr. Johnson
Bob Wilson,58,Male,Heart Disease,Surgery,Dr. Brown
Alice Davis,41,Female,Cancer,Radiation,Dr. Smith
Tom Miller,50,Male,Diabetes,Medication,Dr. Johnson
Sarah Lee,35,Female,Cancer,Chemotherapy,Dr. Smith
```

### Workflow Example

**Step 1: Upload**
- Upload hospital_data.csv
- System shows: "6 records, Columns: Name, Age, Gender, Condition, Treatment, Doctor"

**Step 2: Encrypt**
- Select "Condition" as keyword column
- Click "Encrypt Keywords"
- System encrypts: cancer → abc123..., diabetes → def456..., heart disease → ghi789...
- All 6 records stored with encrypted keywords

**Step 3: Search**
- Enter "cancer" in search box
- Click "Search"

**Step 4: Encrypt Search**
- "cancer" → encrypted to abc123...
- Sent to server

**Step 5: Server Search**
- Server finds 3 matching record IDs
- Returns encrypted results

**Step 6: Decrypt**
- Click "Decrypt Results"
- 3 records decrypted

**Step 7: Table Display**
```
┌─────────────┬─────┬────────┬───────────┬──────────────┬───────────┐
│ Name        │ Age │ Gender │ Condition │ Treatment    │ Doctor    │
├─────────────┼─────┼────────┼───────────┼──────────────┼───────────┤
│ John Doe    │ 45  │ Male   │ Cancer    │ Chemotherapy │ Dr. Smith │
│ Alice Davis │ 41  │ Female │ Cancer    │ Radiation    │ Dr. Smith │
│ Sarah Lee   │ 35  │ Female │ Cancer    │ Chemotherapy │ Dr. Smith │
└─────────────┴─────┴────────┴───────────┴──────────────┴───────────┘
```

## Key Features

### Privacy-Preserving Search
- Server never sees plaintext keywords
- Server never knows what you're searching for
- Server never knows which records matched

### Deterministic Encryption
- Same keyword always encrypts to same value
- Enables matching without decryption
- Uses HMAC-SHA256 for security

### Full Record Retrieval
- Search returns complete records
- All columns displayed in table
- Easy to analyze results

### Flexible Keyword Column
- Choose any column as keyword field
- Common choices: Condition, Diagnosis, Disease, Category, Type
- Can re-encrypt with different column

## Technical Details

### Encryption Method
- **Algorithm**: HMAC-SHA256
- **Key**: 256-bit random key
- **Deterministic**: Same input → same output
- **Secure**: Cannot reverse without key

### Data Flow

```
Client Side:
1. Upload CSV → Parse records
2. Select keyword column
3. For each record:
   - Extract keyword
   - Encrypt: HMAC(key, keyword)
   - Send: {encrypted_keyword, full_record}

Server Side:
1. Receive encrypted records
2. Build index: encrypted_keyword → [record_ids]
3. Store records: record_id → full_record

Search (Client):
1. Enter search keyword
2. Encrypt: HMAC(key, search_keyword)
3. Send encrypted keyword to server

Search (Server):
1. Receive encrypted keyword
2. Lookup in index
3. Retrieve matching records
4. Return records to client

Client (Display):
1. Receive records
2. Display in table format
```

### API Endpoints

#### Store Records
```
POST /sse/store_records
{
  "records": [
    {
      "encrypted_keyword": "base64_encrypted",
      "data": {"Name": "John", "Age": "45", ...}
    },
    ...
  ]
}

Response:
{
  "status": "success",
  "stored_count": 6
}
```

#### Search
```
POST /sse/search
{
  "encrypted_keyword": "base64_encrypted"
}

Response:
{
  "matches": 3,
  "record_ids": ["record_0", "record_2", "record_5"],
  "records": [
    {"Name": "John Doe", "Age": "45", ...},
    {"Name": "Alice Davis", "Age": "41", ...},
    {"Name": "Sarah Lee", "Age": "35", ...}
  ]
}
```

## Security Properties

### Confidentiality
- Keywords encrypted before leaving client
- Server cannot read keywords
- Only authorized clients with key can decrypt

### Searchability
- Deterministic encryption enables search
- Server can match without decryption
- Efficient index-based lookup

### Privacy
- Server doesn't know search terms
- Server doesn't know which records matched
- Access patterns protected

## Limitations

### Pattern Leakage
- Server can see when same keyword is searched
- Frequency analysis possible
- Mitigation: Use padding, dummy queries

### Keyword Guessing
- If keyword space is small, server could guess
- Example: "Male" or "Female" easy to guess
- Mitigation: Use high-entropy keywords

### No Partial Matching
- Exact keyword match only
- "cancer" won't match "breast cancer"
- Mitigation: Normalize keywords, use tags

## Best Practices

### Keyword Selection
- Choose columns with meaningful search terms
- Normalize keywords (lowercase, trim)
- Consider using multiple keyword columns

### Data Preparation
- Clean CSV data before upload
- Remove special characters
- Ensure consistent formatting

### Search Strategy
- Use specific keywords
- Try variations (cancer, Cancer, CANCER)
- Combine with client-side filtering

## Testing

### Test Data
Create a test CSV file:
```csv
Name,Age,Condition
John,45,Cancer
Jane,32,Diabetes
Bob,58,Heart Disease
Alice,41,Cancer
Tom,50,Diabetes
Sarah,35,Cancer
```

### Test Workflow
1. Upload test CSV
2. Select "Condition" as keyword column
3. Encrypt keywords
4. Search for "Cancer"
5. Verify 3 results: John, Alice, Sarah
6. Search for "Diabetes"
7. Verify 2 results: Jane, Tom

## Summary

The SSE implementation provides:
- ✅ Privacy-preserving keyword search
- ✅ Full record retrieval
- ✅ Table format display
- ✅ Easy-to-use 7-step workflow
- ✅ Secure encryption
- ✅ Efficient search

Perfect for searching sensitive data like medical records, financial data, or any dataset where privacy is important!
