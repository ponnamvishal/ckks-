from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import tenseal as ts
import base64
import os
import sys
import numpy as np
from .ckks_compute import (encrypted_mean, encrypted_mode, encrypted_variance, 
                           encrypted_histogram, encrypted_minimum, encrypted_maximum,
                           encrypted_linear_regression)
from .sse_server import SSEServer

app = Flask(__name__, static_folder=None)
CORS(app)  # Enable CORS for all routes

# Get the project root directory
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, 'frontend')

# Storage for encrypted vectors with hash values
stored_vectors = {}
vector_counter = 0

# SSE server instance
sse_server = SSEServer()

@app.route("/", methods=["GET"])
def index():
    """Serve the frontend HTML."""
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route("/api", methods=["GET"])
def api_info():
    """API info endpoint - lists all available endpoints."""
    return jsonify({
        "service": "Secure Cloud Analytics Server",
        "version": "2.0",
        "workflow": [
            "1. Upload dataset (POST /upload)",
            "2. Encrypt dataset → Generate hash value",
            "3. Select column (via dataset endpoints)",
            "4. Perform computations (mean, mode, variance, histogram, min, max)",
            "5. Get encrypted result",
            "6. Decrypt result (POST /decrypt)",
            "7. Result + hash → Verified"
        ],
        "endpoints": {
            "GET /": "Frontend interface",
            "GET /api": "This API info",
            "GET /health": "Health check",
            "GET /vectors": "List all stored vector IDs",
            "POST /upload": "Upload encrypted CKKS vector with hash (requires: id, data, context, hash OR plaintext with encrypt=true)",
            "GET /mean/<vector_id>": "Compute mean of encrypted vector",
            "GET /mode/<vector_id>": "Compute mode of encrypted vector",
            "GET /variance/<vector_id>": "Compute variance of encrypted vector",
            "GET /histogram/<vector_id>": "Compute histogram of encrypted vector",
            "GET /min/<vector_id>": "Compute minimum of encrypted vector",
            "GET /max/<vector_id>": "Compute maximum of encrypted vector",
            "POST /decrypt": "Decrypt result and verify with hash (requires: encrypted_result, vector_id OR context, original_hash)",
            "POST /sse/store": "Store document with encrypted keyword (requires: doc_id, encrypted_keyword, metadata)",
            "POST /sse/search": "Search encrypted keywords (requires: encrypted_keyword)"
        },
        "examples": {
            "upload": "POST /upload with JSON: {\"id\": \"vec1\", \"plaintext\": [1,2,3], \"encrypt\": true}",
            "statistics": "GET /mean/vec1, GET /mode/vec1, GET /variance/vec1, GET /histogram/vec1, GET /min/vec1, GET /max/vec1",
            "decrypt": "POST /decrypt with JSON: {\"encrypted_result\": \"<base64>\", \"vector_id\": \"vec1\"}",
            "sse_store": "POST /sse/store with JSON: {\"doc_id\": \"doc1\", \"encrypted_keyword\": \"<base64>\", \"metadata\": {}}",
            "sse_search": "POST /sse/search with JSON: {\"encrypted_keyword\": \"<base64>\"}"
        }
    })

# Serve static files (CSS, JS)
@app.route("/css/<path:filename>")
def css_files(filename):
    """Serve CSS files."""
    return send_from_directory(os.path.join(FRONTEND_DIR, 'css'), filename)

@app.route("/js/<path:filename>")
def js_files(filename):
    """Serve JavaScript files."""
    return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), filename)

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "service": "Secure Cloud Analytics"})

@app.route("/vectors", methods=["GET"])
def list_vectors():
    """List all stored vector IDs."""
    return jsonify({
        "count": len(stored_vectors),
        "vector_ids": list(stored_vectors.keys())
    })

@app.route("/dataset/load", methods=["POST"])
def load_dataset():
    """
    Load example dataset and return sample data.
    Expects JSON: {"column": str (optional), "n_samples": int (optional), "for_sse": bool (optional)}
    """
    try:
        from data.load_kaggle_dataset import load_dataset, get_numeric_columns, get_sample_data
        
        df = load_dataset()
        numeric_cols = get_numeric_columns(df)
        
        data = request.json or {}
        column = data.get("column")
        n_samples = data.get("n_samples", 20)
        for_sse = data.get("for_sse", False)
        
        if for_sse:
            # Return text data for SSE search
            text_cols = df.select_dtypes(include=['object']).columns.tolist()
            keyword_col = column if column and column in text_cols else (text_cols[0] if text_cols else None)
            
            if not keyword_col:
                return jsonify({"error": "No text columns available for SSE search"}), 400
            
            sample_data = df[keyword_col].dropna().head(n_samples).tolist()
            
            return jsonify({
                "status": "success",
                "dataset_info": {
                    "total_rows": len(df),
                    "text_columns": text_cols,
                    "selected_column": keyword_col,
                    "sample_size": len(sample_data),
                    "type": "sse"
                },
                "sample_data": sample_data
            })
        else:
            # Return numeric data for CKKS computation
            if column and column not in numeric_cols:
                return jsonify({"error": f"Column '{column}' not found or not numeric"}), 400
            
            # Get sample data
            sample_values = get_sample_data(df, column=column, n_samples=n_samples)
            
            return jsonify({
                "status": "success",
                "dataset_info": {
                    "total_rows": len(df),
                    "numeric_columns": numeric_cols,
                    "selected_column": column or numeric_cols[0],
                    "sample_size": len(sample_values),
                    "type": "ckks"
                },
                "sample_data": sample_values,
                "statistics": {
                    "mean": float(np.mean(sample_values)),
                    "min": float(np.min(sample_values)),
                    "max": float(np.max(sample_values)),
                    "std": float(np.std(sample_values))
                }
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/dataset/columns", methods=["GET"])
def list_dataset_columns():
    """List available numeric and text columns in the dataset."""
    try:
        from data.load_kaggle_dataset import load_dataset, get_numeric_columns
        
        df = load_dataset()
        numeric_cols = get_numeric_columns(df)
        
        # Get text columns (for SSE search)
        text_cols = df.select_dtypes(include=['object']).columns.tolist()
        
        return jsonify({
            "status": "success",
            "numeric_columns": numeric_cols,
            "text_columns": text_cols,
            "total_rows": len(df),
            "all_columns": list(df.columns)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/upload", methods=["POST"])
def upload():
    """
    Upload encrypted CKKS vector to cloud storage with hash generation.
    Accepts either:
    1. Encrypted data: {"id": str, "data": base64_serialized_vector, "context": base64_serialized_context, "hash": str}
    2. Plaintext data: {"id": str, "plaintext": [numbers], "encrypt": true}
    """
    global vector_counter
    try:
        data = request.json
        vector_id = data.get("id", f"vector_{vector_counter}")
        
        # Check if plaintext data is provided (for frontend convenience)
        if data.get("encrypt") and "plaintext" in data:
            # Encrypt plaintext data server-side with hash generation
            plaintext = data["plaintext"]
            if not isinstance(plaintext, list):
                return jsonify({"error": "plaintext must be a list of numbers"}), 400
            
            # Create context and encrypt with hash
            from shared.crypto_context import create_context
            from client.ckks_client import encrypt_vector, generate_hash
            
            context = create_context()
            enc_vector, data_hash = encrypt_vector(context, plaintext)
            
            # Serialize
            vector_serialized = enc_vector.serialize()
            context_serialized = context.serialize()
            
            vector_b64 = base64.b64encode(vector_serialized).decode('utf-8')
            context_b64 = base64.b64encode(context_serialized).decode('utf-8')
            
            stored_vectors[vector_id] = {
                "data": vector_b64,
                "context": context_b64,
                "hash": data_hash,
                "original_data": plaintext  # Store for verification demo
            }
            
            vector_counter += 1
            
            return jsonify({
                "status": "stored",
                "vector_id": vector_id,
                "hash": data_hash,
                "message": "Encrypted vector stored successfully with hash",
                "data_points": len(plaintext)
            })
        else:
            # Store encrypted data as provided
            if "data" not in data or "context" not in data:
                return jsonify({"error": "Either provide 'plaintext' with 'encrypt: true' or 'data', 'context', and 'hash'"}), 400
            
            data_hash = data.get("hash", "")
            
            stored_vectors[vector_id] = {
                "data": data["data"],
                "context": data["context"],
                "hash": data_hash
            }
            
            vector_counter += 1
            
            return jsonify({
                "status": "stored",
                "vector_id": vector_id,
                "hash": data_hash,
                "message": "Encrypted vector stored successfully with hash"
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/mean/<vector_id>", methods=["GET"])
def compute_mean(vector_id):
    """
    Compute mean of encrypted vector without decryption.
    Returns encrypted result with hash for verification.
    """
    try:
        if vector_id not in stored_vectors:
            return jsonify({"error": "Vector not found"}), 404
        
        # Deserialize context and vector
        context_bytes = base64.b64decode(stored_vectors[vector_id]["context"])
        data_bytes = base64.b64decode(stored_vectors[vector_id]["data"])
        
        context = ts.context_from(context_bytes)
        enc_vector = ts.ckks_vector_from(context, data_bytes)
        
        # Compute encrypted mean
        enc_mean = encrypted_mean(enc_vector)
        
        # Serialize result
        result_serialized = enc_mean.serialize()
        result_b64 = base64.b64encode(result_serialized).decode('utf-8')
        
        return jsonify({
            "encrypted_result": result_b64,
            "computation": "mean",
            "vector_id": vector_id,
            "original_hash": stored_vectors[vector_id].get("hash", ""),
            "note": "Encrypted result - decrypt to verify with hash"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/mode/<vector_id>", methods=["GET"])
def compute_mode(vector_id):
    """
    Compute mode of encrypted vector.
    Returns encrypted result with hash for verification.
    """
    try:
        if vector_id not in stored_vectors:
            return jsonify({"error": "Vector not found"}), 404
        
        context_bytes = base64.b64decode(stored_vectors[vector_id]["context"])
        data_bytes = base64.b64decode(stored_vectors[vector_id]["data"])
        
        context = ts.context_from(context_bytes)
        enc_vector = ts.ckks_vector_from(context, data_bytes)
        
        # Compute encrypted mode
        enc_result = encrypted_mode(enc_vector)
        
        # Serialize result
        result_serialized = enc_result.serialize()
        result_b64 = base64.b64encode(result_serialized).decode('utf-8')
        
        return jsonify({
            "encrypted_result": result_b64,
            "computation": "mode",
            "vector_id": vector_id,
            "original_hash": stored_vectors[vector_id].get("hash", ""),
            "note": "Encrypted result - decrypt to verify with hash"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/histogram/<vector_id>", methods=["GET"])
def compute_histogram(vector_id):
    """
    Compute histogram approximation on encrypted vector.
    Returns encrypted result with hash for verification.
    """
    try:
        if vector_id not in stored_vectors:
            return jsonify({"error": "Vector not found"}), 404
        
        context_bytes = base64.b64decode(stored_vectors[vector_id]["context"])
        data_bytes = base64.b64decode(stored_vectors[vector_id]["data"])
        
        context = ts.context_from(context_bytes)
        enc_vector = ts.ckks_vector_from(context, data_bytes)
        
        # Compute encrypted histogram approximation
        enc_result = encrypted_histogram(enc_vector)
        
        # Serialize result
        result_serialized = enc_result.serialize()
        result_b64 = base64.b64encode(result_serialized).decode('utf-8')
        
        return jsonify({
            "encrypted_result": result_b64,
            "computation": "histogram",
            "vector_id": vector_id,
            "original_hash": stored_vectors[vector_id].get("hash", ""),
            "note": "Encrypted result - decrypt to verify with hash"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/variance/<vector_id>", methods=["GET"])
def compute_variance(vector_id):
    """
    Compute variance of encrypted vector using homomorphic operations.
    Returns encrypted result with hash for verification.
    """
    try:
        if vector_id not in stored_vectors:
            return jsonify({"error": "Vector not found"}), 404
        
        context_bytes = base64.b64decode(stored_vectors[vector_id]["context"])
        data_bytes = base64.b64decode(stored_vectors[vector_id]["data"])
        
        context = ts.context_from(context_bytes)
        enc_vector = ts.ckks_vector_from(context, data_bytes)
        
        # Compute variance homomorphically
        enc_variance = encrypted_variance(enc_vector)
        
        # Serialize result
        result_serialized = enc_variance.serialize()
        result_b64 = base64.b64encode(result_serialized).decode('utf-8')
        
        return jsonify({
            "encrypted_result": result_b64,
            "computation": "variance",
            "vector_id": vector_id,
            "original_hash": stored_vectors[vector_id].get("hash", ""),
            "note": "Encrypted result - decrypt to verify with hash"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/min/<vector_id>", methods=["GET"])
def compute_min(vector_id):
    """
    Compute minimum of encrypted vector.
    Returns encrypted result with hash for verification.
    """
    try:
        if vector_id not in stored_vectors:
            return jsonify({"error": "Vector not found"}), 404
        
        context_bytes = base64.b64decode(stored_vectors[vector_id]["context"])
        data_bytes = base64.b64decode(stored_vectors[vector_id]["data"])
        
        context = ts.context_from(context_bytes)
        enc_vector = ts.ckks_vector_from(context, data_bytes)
        
        # Compute encrypted minimum
        enc_result = encrypted_minimum(enc_vector)
        
        # Serialize result
        result_serialized = enc_result.serialize()
        result_b64 = base64.b64encode(result_serialized).decode('utf-8')
        
        return jsonify({
            "encrypted_result": result_b64,
            "computation": "minimum",
            "vector_id": vector_id,
            "original_hash": stored_vectors[vector_id].get("hash", ""),
            "note": "Encrypted result - decrypt to verify with hash"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/max/<vector_id>", methods=["GET"])
def compute_max(vector_id):
    """
    Compute maximum of encrypted vector.
    Returns encrypted result with hash for verification.
    """
    try:
        if vector_id not in stored_vectors:
            return jsonify({"error": "Vector not found"}), 404
        
        context_bytes = base64.b64decode(stored_vectors[vector_id]["context"])
        data_bytes = base64.b64decode(stored_vectors[vector_id]["data"])
        
        context = ts.context_from(context_bytes)
        enc_vector = ts.ckks_vector_from(context, data_bytes)
        
        # Compute encrypted maximum
        enc_result = encrypted_maximum(enc_vector)
        
        # Serialize result
        result_serialized = enc_result.serialize()
        result_b64 = base64.b64encode(result_serialized).decode('utf-8')
        
        return jsonify({
            "encrypted_result": result_b64,
            "computation": "maximum",
            "vector_id": vector_id,
            "original_hash": stored_vectors[vector_id].get("hash", ""),
            "note": "Encrypted result - decrypt to verify with hash"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/decrypt", methods=["POST"])
def decrypt_result():
    """
    Decrypt encrypted result and verify with original hash.
    Expects JSON: {"encrypted_result": base64, "context": base64, "original_hash": str, "vector_id": str}
    """
    try:
        data = request.json
        
        # Get encrypted result and context
        if "vector_id" in data:
            # Use stored context
            vector_id = data["vector_id"]
            if vector_id not in stored_vectors:
                return jsonify({"error": "Vector not found"}), 404
            
            context_bytes = base64.b64decode(stored_vectors[vector_id]["context"])
            original_hash = stored_vectors[vector_id].get("hash", "")
            original_data = stored_vectors[vector_id].get("original_data", None)
        else:
            # Use provided context
            if "context" not in data:
                return jsonify({"error": "Either vector_id or context must be provided"}), 400
            context_bytes = base64.b64decode(data["context"])
            original_hash = data.get("original_hash", "")
            original_data = None
        
        result_bytes = base64.b64decode(data["encrypted_result"])
        
        # Deserialize and decrypt
        context = ts.context_from(context_bytes)
        enc_result = ts.ckks_vector_from(context, result_bytes)
        decrypted_result = enc_result.decrypt()
        
        # Verify with original data if available
        verified = False
        verification_note = "No original data available for verification"
        
        if original_data is not None:
            from client.ckks_client import verify_result
            verified = verify_result(original_hash, original_data)
            verification_note = "Data integrity verified" if verified else "Verification failed"
        
        return jsonify({
            "decrypted_result": decrypted_result,
            "original_hash": original_hash,
            "verified": verified,
            "verification_note": verification_note,
            "status": "success"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/sse/store", methods=["POST"])
def sse_store():
    """
    Store document with encrypted keyword in SSE index.
    Expects JSON: {"doc_id": str, "encrypted_keyword": str (base64), "metadata": dict}
    """
    try:
        data = request.json
        doc_id = data["doc_id"]
        encrypted_keyword = data["encrypted_keyword"]
        metadata = data.get("metadata", {})
        
        sse_server.store(doc_id, encrypted_keyword, metadata)
        
        return jsonify({
            "status": "stored",
            "doc_id": doc_id,
            "message": "Document indexed successfully"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/sse/store_records", methods=["POST"])
def sse_store_records():
    """
    Store multiple records with encrypted keywords.
    Expects JSON: {
        "records": [
            {"encrypted_keyword": str, "data": dict},
            ...
        ]
    }
    """
    try:
        data = request.json
        records = data.get("records", [])
        
        stored_count = 0
        for record in records:
            encrypted_keyword = record["encrypted_keyword"]
            record_data = record["data"]
            sse_server.store_record(encrypted_keyword, record_data)
            stored_count += 1
        
        return jsonify({
            "status": "success",
            "stored_count": stored_count,
            "message": f"{stored_count} records indexed successfully"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/sse/search", methods=["POST"])
def sse_search():
    """
    Search for documents matching encrypted keyword.
    Expects JSON: {"encrypted_keyword": str (base64)}
    """
    try:
        data = request.json
        encrypted_keyword = data["encrypted_keyword"]
        
        record_ids = sse_server.search(encrypted_keyword)
        
        # Retrieve full records
        records = sse_server.get_all_records(record_ids)
        
        return jsonify({
            "matches": len(record_ids),
            "record_ids": record_ids,
            "records": records
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors with helpful message."""
    # If it's an API request, return JSON
    if request.path.startswith('/api') or request.path.startswith('/upload') or \
       request.path.startswith('/mean') or request.path.startswith('/sse') or \
       request.path.startswith('/vectors') or request.path.startswith('/health'):
        return jsonify({
            "error": "Endpoint not found",
            "message": "The requested endpoint does not exist",
            "available_endpoints": [
                "GET /",
                "GET /api",
                "GET /health",
                "GET /vectors",
                "POST /upload",
                "GET /mean/<vector_id>",
                "POST /sse/store",
                "POST /sse/search"
            ],
            "help": "Visit GET /api for detailed endpoint documentation"
        }), 404
    # Otherwise, try to serve frontend
    return send_from_directory(FRONTEND_DIR, 'index.html'), 404

if __name__ == "__main__":
    print("Starting Secure Cloud Analytics Server...")
    print("Server running on http://localhost:5001")
    print("Note: If port 5000 was in use, switched to 5001")
    app.run(debug=True, host="0.0.0.0", port=5001)
