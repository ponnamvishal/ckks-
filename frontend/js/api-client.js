/**
 * API Client for communicating with the Flask backend
 */

const API_BASE_URL = window.location.origin; // Use same origin as frontend

/**
 * Check server health
 */
async function checkServerHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        return { status: 'online', data };
    } catch (error) {
        return { status: 'offline', error: error.message };
    }
}

/**
 * Upload encrypted CKKS vector
 */
async function uploadVector(vectorId, encryptedData, encryptedContext) {
    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: vectorId,
                data: encryptedData,
                context: encryptedContext
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }
        
        return await response.json();
    } catch (error) {
        throw new Error(`Upload error: ${error.message}`);
    }
}

/**
 * Compute mean of encrypted vector
 */
async function computeMeanAPI(vectorId) {
    try {
        const response = await fetch(`${API_BASE_URL}/mean/${vectorId}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Computation failed');
        }
        
        return await response.json();
    } catch (error) {
        throw new Error(`Computation error: ${error.message}`);
    }
}

/**
 * Store document with encrypted keyword (SSE)
 */
async function storeDocumentAPI(docId, encryptedKeyword, metadata) {
    try {
        const response = await fetch(`${API_BASE_URL}/sse/store`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                doc_id: docId,
                encrypted_keyword: encryptedKeyword,
                metadata: metadata
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Store failed');
        }
        
        return await response.json();
    } catch (error) {
        throw new Error(`Store error: ${error.message}`);
    }
}

/**
 * Search encrypted keywords (SSE)
 */
async function searchDocumentsAPI(encryptedKeyword) {
    try {
        const response = await fetch(`${API_BASE_URL}/sse/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                encrypted_keyword: encryptedKeyword
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Search failed');
        }
        
        return await response.json();
    } catch (error) {
        throw new Error(`Search error: ${error.message}`);
    }
}

/**
 * List all stored vectors
 */
async function listVectors() {
    try {
        const response = await fetch(`${API_BASE_URL}/vectors`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to list vectors');
        }
        
        return await response.json();
    } catch (error) {
        throw new Error(`List error: ${error.message}`);
    }
}

// Make API functions globally available
window.computeMeanAPI = computeMeanAPI;
window.storeDocumentAPI = storeDocumentAPI;
window.searchDocumentsAPI = searchDocumentsAPI;
window.checkServerHealth = checkServerHealth;
window.listVectors = listVectors;
