# Frontend Guide

## Quick Start

1. **Start the server:**
   ```bash
   python run_server.py
   ```

2. **Open your browser:**
   Navigate to: `http://localhost:5001`

3. **Use the interface:**
   - The frontend will automatically check server status
   - Three tabs are available:
     - **CKKS Computation** - Encrypt and compute on data
     - **SSE Search** - Store and search encrypted documents
     - **Stored Vectors** - View uploaded vectors

## Features

### CKKS Computation Tab
1. Enter comma-separated numbers (e.g., `10, 20, 30, 40, 50`)
2. Click "Encrypt & Upload" (currently shows demo mode)
3. Enter vector ID and click "Compute Encrypted Mean"
4. View results

### SSE Search Tab
1. Enter document ID, keyword, and optional metadata (JSON)
2. Click "Store Document"
3. Search for documents using keywords
4. View matching documents

### Stored Vectors Tab
1. Click "Refresh List" to see all uploaded vectors
2. View vector IDs stored on the server

## Notes

- The frontend uses a simplified encryption approach for demonstration
- In production, you would use TenSEAL.js (WebAssembly) for client-side encryption
- The server handles CORS automatically
- All API calls use the same origin as the frontend

## Troubleshooting

- **Server not responding:** Make sure the Flask server is running on port 5001
- **CORS errors:** The server includes flask-cors, so this should be handled automatically
- **404 errors:** Check that you're accessing `http://localhost:5001` (not 5000)
