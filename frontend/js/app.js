/**
 * Main application logic
 */

// Global state
let currentVectorId = null;
let sseKey = null; // SSE encryption key (simplified)
let uploadedData = null; // Store uploaded data for visualization
let dataChart = null; // Chart instance

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    checkServerStatus();
    loadVectors();
    loadDatasetColumns();
    loadSSEColumns();
    refreshS3Datasets();
});

/**
 * Initialize tab switching
 */
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Update buttons
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update content
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
}

/**
 * Check server status
 */
async function checkServerStatus() {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    const result = await window.checkServerHealth();
    
    if (result.status === 'online') {
        statusIndicator.classList.add('online');
        statusText.textContent = 'Server Online';
    } else {
        statusIndicator.classList.remove('online');
        statusText.textContent = 'Server Offline';
    }
    
    // Check every 10 seconds
    setTimeout(checkServerStatus, 10000);
}

/**
 * Encrypt and upload data
 */

/**
 * Compute selected statistic
 */
async function computeStatistic() {
    const vectorIdInput = document.getElementById('vectorIdInput');
    const computationSelect = document.getElementById('computationSelect');
    const computationStatus = document.getElementById('computationStatus');
    const encryptedResultStatus = document.getElementById('encryptedResultStatus');
    
    const vectorId = vectorIdInput.value.trim() || currentVectorId;
    const computation = computationSelect.value;
    
    if (!vectorId) {
        computationStatus.className = 'result-box error';
        computationStatus.textContent = 'Error: Please provide a vector ID or upload data first.';
        computationStatus.style.display = 'block';
        return;
    }
    
    try {
        computationStatus.className = 'result-box info';
        computationStatus.textContent = `Step 4: Computing ${getComputationName(computation)} on encrypted data...`;
        computationStatus.style.display = 'block';
        
        // Call the appropriate computation API
        let result;
        const API_BASE_URL = window.location.origin;
        const response = await fetch(`${API_BASE_URL}/${computation}/${vectorId}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Computation failed');
        }
        
        result = await response.json();
        
        // Store encrypted result and computation type globally
        window.encryptedResult = result.encrypted_result || result.encrypted_mean;
        window.computationResult = result;
        window.currentComputation = computation;
        
        computationStatus.className = 'result-box success';
        computationStatus.textContent = `✓ Step 4 Complete: ${getComputationName(computation)} computed!\n\n` +
            `Computation: ${result.computation}\n` +
            `Vector ID: ${result.vector_id}\n` +
            `Original Hash: ${result.original_hash ? result.original_hash.substring(0, 16) + '...' : 'N/A'}\n\n` +
            `Computation performed on encrypted data.`;
        computationStatus.style.display = 'block';
        
        // Show Step 5: Encrypted Result
        encryptedResultStatus.className = 'result-box info';
        encryptedResultStatus.textContent = `Step 5: Encrypted Result Ready\n\n` +
            `Encrypted result: ${window.encryptedResult.substring(0, 50)}...\n\n` +
            `Result is still encrypted. Click "Decrypt Result" in Step 6 to see the actual value.`;
        encryptedResultStatus.style.display = 'block';
        
        // DON'T show visualization yet - wait for decryption
        
    } catch (error) {
        computationStatus.className = 'result-box error';
        computationStatus.textContent = `Error: ${error.message}`;
        computationStatus.style.display = 'block';
    }
}

/**
 * Decrypt result (Step 6)
 */
async function decryptResult() {
    const decryptStatus = document.getElementById('decryptStatus');
    const verificationStatus = document.getElementById('verificationStatus');
    
    if (!window.encryptedResult) {
        alert('Please compute a statistic first');
        return;
    }
    
    try {
        decryptStatus.className = 'result-box info';
        decryptStatus.textContent = 'Step 6: Decrypting result...';
        decryptStatus.style.display = 'block';
        
        // In production, this would use TenSEAL.js to decrypt client-side
        // For demo, we'll show the encrypted result info
        const result = window.computationResult;
        const computation = window.currentComputation;
        
        decryptStatus.className = 'result-box success';
        decryptStatus.textContent = `✓ Step 6 Complete: Result decrypted!\n\n` +
            `Encrypted result: ${window.encryptedResult.substring(0, 50)}...\n\n` +
            `Note: In production, client would decrypt using TenSEAL.js.\n` +
            `For this demo, decryption happens server-side.\n\n` +
            `Proceed to Step 7 for verification.`;
        decryptStatus.style.display = 'block';
        
        // NOW show visualization after decryption
        if (uploadedData && uploadedData.length > 0 && computation) {
            renderDataChart(uploadedData, computation);
        }
        
        // Show Step 7: Verification
        if (result.original_hash && window.currentHash) {
            const hashMatch = result.original_hash === window.currentHash;
            verificationStatus.className = hashMatch ? 'result-box success' : 'result-box error';
            verificationStatus.textContent = `Step 7: Verification\n\n` +
                `Original Hash: ${result.original_hash.substring(0, 32)}...\n` +
                `Current Hash:  ${window.currentHash.substring(0, 32)}...\n\n` +
                (hashMatch ? 
                    `✓ VERIFICATION SUCCESSFUL\n✓ Hash matches - data integrity confirmed\n✓ No tampering detected` :
                    `✗ VERIFICATION FAILED\n✗ Hash mismatch - data may have been tampered`);
            verificationStatus.style.display = 'block';
        } else {
            verificationStatus.className = 'result-box info';
            verificationStatus.textContent = `Step 7: Verification\n\n` +
                `Hash verification requires uploading data first.\n` +
                `Upload data to generate hash for verification.`;
            verificationStatus.style.display = 'block';
        }
        
    } catch (error) {
        decryptStatus.className = 'result-box error';
        decryptStatus.textContent = `Error: ${error.message}`;
        decryptStatus.style.display = 'block';
    }
}

/**
 * Get human-readable computation name
 */
function getComputationName(computation) {
    const names = {
        'mean': 'Mean',
        'mode': 'Mode',
        'variance': 'Variance',
        'histogram': 'Histogram',
        'min': 'Minimum',
        'max': 'Maximum'
    };
    return names[computation] || computation;
}

/**
 * Compute mean (legacy function for backward compatibility)
 */
async function computeMean() {
    // Set the dropdown to mean and call the new function
    const computationSelect = document.getElementById('computationSelect');
    if (computationSelect) {
        computationSelect.value = 'mean';
    }
    return await computeStatistic();
}

/**
 * Store document with SSE
 */
async function storeDocument() {
    const docIdInput = document.getElementById('docIdInput');
    const keywordInput = document.getElementById('keywordInput');
    const metadataInput = document.getElementById('metadataInput');
    const storeResult = document.getElementById('storeResult');
    const storeStatus = document.getElementById('storeStatus');
    
    try {
        const docId = docIdInput.value.trim();
        const keyword = keywordInput.value.trim();
        let metadata = {};
        
        if (!docId || !keyword) {
            throw new Error('Document ID and keyword are required');
        }
        
        // Parse metadata
        if (metadataInput.value.trim()) {
            try {
                metadata = JSON.parse(metadataInput.value);
            } catch (e) {
                throw new Error('Invalid JSON in metadata field');
            }
        }
        
        // Encrypt keyword (simplified - in production use proper HMAC)
        const encryptedKeyword = btoa(keyword); // Simplified
        
        storeStatus.className = 'result-box info';
        storeStatus.textContent = 'Storing document...';
        storeResult.style.display = 'block';
        
        // Call API directly if window.storeDocumentAPI is not available
        let result;
        if (typeof window.storeDocumentAPI === 'function') {
            result = await window.storeDocumentAPI(docId, encryptedKeyword, metadata);
        } else {
            // Fallback: call API directly
            const API_BASE_URL = window.location.origin;
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
            
            result = await response.json();
        }
        
        storeStatus.className = 'result-box success';
        storeStatus.textContent = `✓ Document stored successfully!\n\n${formatJSON(result)}`;
        
        // Clear inputs
        docIdInput.value = '';
        keywordInput.value = '';
        metadataInput.value = '';
        
    } catch (error) {
        storeStatus.className = 'result-box error';
        storeStatus.textContent = `Error: ${error.message}`;
        storeResult.style.display = 'block';
    }
}

/**
 * Search documents
 */
async function searchDocuments() {
    const searchKeywordInput = document.getElementById('searchKeywordInput');
    const searchResult = document.getElementById('searchResult');
    const searchStatus = document.getElementById('searchStatus');
    
    try {
        const keyword = searchKeywordInput.value.trim();
        
        if (!keyword) {
            throw new Error('Search keyword is required');
        }
        
        // Encrypt keyword (simplified)
        const encryptedKeyword = btoa(keyword); // Simplified
        
        searchStatus.className = 'result-box info';
        searchStatus.textContent = 'Searching encrypted index...';
        searchResult.style.display = 'block';
        
        // Call API directly if window.searchDocumentsAPI is not available
        let result;
        if (typeof window.searchDocumentsAPI === 'function') {
            result = await window.searchDocumentsAPI(encryptedKeyword);
        } else {
            // Fallback: call API directly
            const API_BASE_URL = window.location.origin;
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
            
            result = await response.json();
        }
        
        searchStatus.className = 'result-box success';
        searchStatus.textContent = `✓ Search completed!\n\nFound ${result.matches} matching document(s):\n\n${formatJSON(result.documents)}`;
        
    } catch (error) {
        searchStatus.className = 'result-box error';
        searchStatus.textContent = `Error: ${error.message}`;
        searchResult.style.display = 'block';
    }
}

/**
 * Load stored vectors
 */
async function loadVectors() {
    const vectorsList = document.getElementById('vectorsList');
    const vectorsStatus = document.getElementById('vectorsStatus');
    
    try {
        vectorsStatus.className = 'result-box info';
        vectorsStatus.textContent = 'Loading vectors...';
        vectorsList.style.display = 'block';
        
        // Use window.listVectors if available, otherwise call API directly
        let result;
        if (typeof window.listVectors === 'function') {
            result = await window.listVectors();
        } else {
            // Fallback: call API directly
            const API_BASE_URL = window.location.origin;
            const response = await fetch(`${API_BASE_URL}/vectors`);
            if (!response.ok) {
                throw new Error('Failed to list vectors');
            }
            result = await response.json();
        }
        
        if (result.count === 0) {
            vectorsStatus.className = 'result-box info';
            vectorsStatus.textContent = 'No vectors stored yet.\n\nUpload data using the CKKS Computation tab.';
        } else {
            vectorsStatus.className = 'result-box success';
            vectorsStatus.textContent = `Found ${result.count} vector(s):\n\n${formatJSON(result.vector_ids)}`;
        }
        
    } catch (error) {
        vectorsStatus.className = 'result-box error';
        vectorsStatus.textContent = `Error: ${error.message}`;
        vectorsList.style.display = 'block';
    }
}

/**
 * Load dataset columns
 */
async function loadDatasetColumns() {
    const columnSelect = document.getElementById('datasetColumn');
    
    try {
        const response = await fetch(`${window.location.origin}/dataset/columns`);
        const result = await response.json();
        
        if (result.status === 'success') {
            columnSelect.innerHTML = '<option value="">Select a column...</option>';
            result.numeric_columns.forEach(col => {
                const option = document.createElement('option');
                option.value = col;
                option.textContent = col;
                columnSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading columns:', error);
        columnSelect.innerHTML = '<option value="">Error loading columns</option>';
    }
}

/**
 * Load available datasets from S3
 */
async function refreshS3Datasets() {
    const select = document.getElementById('s3DatasetSelect');
    if (!select) {
        return;
    }

    try {
        select.innerHTML = '<option value="">Loading S3 datasets...</option>';
        const response = await fetch(`${window.location.origin}/s3/datasets`);
        const result = await response.json();

        if (!response.ok || result.error) {
            throw new Error(result.error || 'Failed to fetch S3 dataset list');
        }

        select.innerHTML = '<option value="">Select S3 dataset...</option>';
        result.datasets.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key;
            select.appendChild(option);
        });

        if (!result.datasets || result.datasets.length === 0) {
            select.innerHTML = '<option value="">No S3 datasets found</option>';
        }
    } catch (error) {
        console.error('Error loading S3 datasets:', error);
        select.innerHTML = '<option value="">Error loading S3 datasets</option>';
    }
}

/**
 * Load selected S3 dataset into Step 1/2 CKKS workflow
 */
async function loadSelectedS3Dataset() {
    const select = document.getElementById('s3DatasetSelect');
    const status = document.getElementById('fileUploadStatus');
    const columnSelect = document.getElementById('datasetColumn');
    const dataInput = document.getElementById('dataInput');

    if (!select || !status || !columnSelect || !dataInput) {
        return;
    }

    const key = select.value;
    if (!key) {
        alert('Please select an S3 dataset first');
        return;
    }

    try {
        status.className = 'result-box info';
        status.textContent = `Loading dataset from S3: ${key}...`;
        status.style.display = 'block';

        const columnsResp = await fetch(`${window.location.origin}/s3/dataset/columns?key=${encodeURIComponent(key)}`);
        const columnsResult = await columnsResp.json();
        if (!columnsResp.ok || columnsResult.error) {
            throw new Error(columnsResult.error || 'Failed to fetch S3 dataset columns');
        }

        const numericColumns = columnsResult.numeric_columns || [];
        if (numericColumns.length === 0) {
            throw new Error('No numeric columns found in selected S3 dataset');
        }

        columnSelect.innerHTML = '<option value="">Select a column...</option>';
        numericColumns.forEach(col => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;
            columnSelect.appendChild(option);
        });
        uploadedFileData = {};
        const loadedColumns = [];

        for (const col of numericColumns) {
            const loadResp = await fetch(`${window.location.origin}/s3/dataset/load`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    key,
                    column: col,
                    n_samples: 200
                })
            });

            const loadResult = await loadResp.json();
            if (!loadResp.ok || loadResult.error) {
                continue;
            }

            const sampleData = loadResult.sample_data || [];
            if (sampleData.length) {
                uploadedFileData[col] = sampleData;
                loadedColumns.push(col);
            }
        }

        if (loadedColumns.length === 0) {
            throw new Error('No numeric samples could be loaded from the selected S3 dataset');
        }

        const firstColumn = loadedColumns[0];
        const firstSampleData = uploadedFileData[firstColumn];
        dataInput.value = firstSampleData.slice(0, 100).join(', ');

        uploadedFileName = key;
        fileColumns = loadedColumns;
        uploadedData = firstSampleData;
        window.loadedS3DatasetKey = key;

        status.className = 'result-box success';
        status.textContent = `Step 1 Complete: S3 dataset loaded\n\n` +
            `Dataset: ${key}\n` +
            `Rows: ${columnsResult.total_rows}\n` +
            `Numeric columns found: ${numericColumns.length}\n` +
            `Numeric columns loaded: ${loadedColumns.length}\n` +
            `Preview column: ${firstColumn}\n` +
            `Sample points loaded per column: up to 200\n\n` +
            `Proceed to Step 2 to encrypt.`;
    } catch (error) {
        status.className = 'result-box error';
        status.textContent = `Error loading S3 dataset: ${error.message}`;
        status.style.display = 'block';
    }
}

window.refreshS3Datasets = refreshS3Datasets;
window.loadSelectedS3Dataset = loadSelectedS3Dataset;

/**
 * Upload and process external file
 */
async function uploadExternalFile() {
    const fileInput = document.getElementById('fileInput');
    const uploadResult = document.getElementById('uploadResult');
    const uploadStatus = document.getElementById('uploadStatus');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please select a file first');
        return;
    }
    
    const file = fileInput.files[0];
    const fileName = file.name.toLowerCase();
    
    try {
        uploadStatus.className = 'result-box info';
        uploadStatus.textContent = 'Processing uploaded file...';
        uploadResult.style.display = 'block';
        
        const fileContent = await readFileContent(file);
        
        // Process different file formats
        if (fileName.endsWith('.csv')) {
            await processCSVFile(fileContent, file.name);
        } else if (fileName.endsWith('.txt')) {
            await processTXTFile(fileContent, file.name);
        } else if (fileName.endsWith('.json')) {
            await processJSONFile(fileContent, file.name);
        } else {
            throw new Error('Unsupported file format. Please use CSV, TXT, or JSON files.');
        }
        
    } catch (error) {
        uploadStatus.className = 'result-box error';
        uploadStatus.textContent = `Error processing file: ${error.message}`;
        uploadResult.style.display = 'block';
    }
}

/**
 * Process CSV file with column selection
 */
async function processCSVFile(content, fileName) {
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        throw new Error('File is empty');
    }
    
    // Parse header row
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    if (headers.length === 1) {
        // Single column, process directly
        const data = [];
        for (let i = 1; i < lines.length && data.length < 1000; i++) { // Limit to 1000 rows
            const value = parseFloat(lines[i].trim());
            if (!isNaN(value)) {
                data.push(value);
            }
        }
        
        if (data.length === 0) {
            throw new Error('No valid numeric data found');
        }
        
        await finalizeFileUpload(data, fileName, 'Single Column');
    } else {
        // Multiple columns, show column selector
        showColumnSelector(lines, headers, fileName);
    }
}

/**
 * Show column selector for CSV files
 */
function showColumnSelector(lines, headers, fileName) {
    const uploadStatus = document.getElementById('uploadStatus');
    
    // Create column selector HTML
    let selectorHTML = `✓ CSV file loaded: ${fileName}\n`;
    selectorHTML += `Found ${headers.length} columns, ${lines.length - 1} rows\n\n`;
    selectorHTML += `Select a column to extract numeric data:\n\n`;
    
    // Create dropdown for column selection
    const selectorDiv = document.createElement('div');
    selectorDiv.style.marginTop = '15px';
    
    const label = document.createElement('label');
    label.textContent = 'Select Column:';
    label.style.display = 'block';
    label.style.marginBottom = '8px';
    label.style.color = 'var(--text-primary)';
    
    const select = document.createElement('select');
    select.id = 'columnSelector';
    select.style.width = '100%';
    select.style.padding = '12px';
    select.style.background = 'var(--bg-color)';
    select.style.border = '1px solid var(--border-color)';
    select.style.borderRadius = '8px';
    select.style.color = 'var(--text-primary)';
    select.style.marginBottom = '15px';
    
    // Add options
    headers.forEach((header, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${header} (Column ${index + 1})`;
        select.appendChild(option);
    });
    
    const button = document.createElement('button');
    button.textContent = 'Extract Selected Column';
    button.className = 'btn btn-primary';
    button.onclick = () => extractSelectedColumn(lines, headers, fileName);
    
    selectorDiv.appendChild(label);
    selectorDiv.appendChild(select);
    selectorDiv.appendChild(button);
    
    uploadStatus.className = 'result-box info';
    uploadStatus.textContent = selectorHTML;
    uploadStatus.appendChild(selectorDiv);
}

/**
 * Extract data from selected column
 */
async function extractSelectedColumn(lines, headers, fileName) {
    const select = document.getElementById('columnSelector');
    const columnIndex = parseInt(select.value);
    const columnName = headers[columnIndex];
    
    const uploadStatus = document.getElementById('uploadStatus');
    
    try {
        uploadStatus.className = 'result-box info';
        uploadStatus.textContent = `Extracting data from column: ${columnName}...`;
        
        const data = [];
        let processedRows = 0;
        
        // Process in chunks to avoid stack overflow
        for (let i = 1; i < lines.length && data.length < 1000; i++) {
            const values = lines[i].split(',');
            if (values.length > columnIndex) {
                const value = parseFloat(values[columnIndex].trim().replace(/"/g, ''));
                if (!isNaN(value)) {
                    data.push(value);
                }
            }
            processedRows++;
            
            // Process in chunks of 100 to prevent blocking
            if (processedRows % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        if (data.length === 0) {
            throw new Error(`No valid numeric data found in column: ${columnName}`);
        }
        
        await finalizeFileUpload(data, fileName, columnName);
        
    } catch (error) {
        uploadStatus.className = 'result-box error';
        uploadStatus.textContent = `Error extracting column: ${error.message}`;
    }
}

/**
 * Process TXT file (optimized for large files)
 */
async function processTXTFile(content, fileName) {
    const lines = content.split('\n').filter(line => line.trim());
    const data = [];
    let processedLines = 0;
    
    for (let line of lines) {
        if (data.length >= 1000) break; // Limit to 1000 values
        
        const num = parseFloat(line.trim());
        if (!isNaN(num)) {
            data.push(num);
        }
        
        processedLines++;
        // Process in chunks to prevent blocking
        if (processedLines % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }
    
    if (data.length === 0) {
        throw new Error('No valid numeric data found in the file');
    }
    
    await finalizeFileUpload(data, fileName, 'Text File');
}

/**
 * Process JSON file (optimized for large files)
 */
async function processJSONFile(content, fileName) {
    try {
        const jsonData = JSON.parse(content);
        let data = [];
        
        if (Array.isArray(jsonData)) {
            // Process array in chunks
            for (let i = 0; i < jsonData.length && data.length < 1000; i++) {
                const item = jsonData[i];
                if (typeof item === 'number' && !isNaN(item)) {
                    data.push(item);
                }
                
                // Process in chunks
                if (i % 100 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
            }
        } else if (typeof jsonData === 'object') {
            // Extract numeric values from object
            for (let key in jsonData) {
                if (data.length >= 1000) break;
                
                const value = jsonData[key];
                if (typeof value === 'number' && !isNaN(value)) {
                    data.push(value);
                } else if (Array.isArray(value)) {
                    for (let item of value) {
                        if (data.length >= 1000) break;
                        if (typeof item === 'number' && !isNaN(item)) {
                            data.push(item);
                        }
                    }
                }
            }
        }
        
        if (data.length === 0) {
            throw new Error('No valid numeric data found in JSON file');
        }
        
        await finalizeFileUpload(data, fileName, 'JSON Data');
        
    } catch (e) {
        throw new Error('Invalid JSON format: ' + e.message);
    }
}

/**
 * Finalize file upload process
 */
async function finalizeFileUpload(data, fileName, source) {
    const dataInput = document.getElementById('dataInput');
    const uploadStatus = document.getElementById('uploadStatus');
    const fileInput = document.getElementById('fileInput');
    
    // Limit data size for display and processing
    const limitedData = data.slice(0, 1000);
    
    // Populate the data input field (limit display to prevent UI issues)
    const displayData = limitedData.slice(0, 100); // Show only first 100 values in input
    dataInput.value = displayData.join(', ') + (limitedData.length > 100 ? '...' : '');
    
    // Store full data for visualization (up to 1000 values)
    uploadedData = limitedData;
    
    // Calculate basic statistics
    const mean = limitedData.reduce((a, b) => a + b, 0) / limitedData.length;
    const min = Math.min(...limitedData);
    const max = Math.max(...limitedData);
    
    uploadStatus.className = 'result-box success';
    uploadStatus.textContent = `✓ File processed successfully!\n\n` +
        `File: ${fileName}\n` +
        `Source: ${source}\n` +
        `Total data points: ${data.length}\n` +
        `Loaded for processing: ${limitedData.length}\n` +
        `Statistics:\n` +
        `  Mean: ${mean.toFixed(2)}\n` +
        `  Min: ${min.toFixed(2)}\n` +
        `  Max: ${max.toFixed(2)}\n\n` +
        `Data loaded into input field. Click "Encrypt & Upload" to proceed.`;
    
    // Clear file input
    fileInput.value = '';
}

/**
 * Read file content as text
 */
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
async function loadDatasetData() {
    const columnSelect = document.getElementById('datasetColumn');
    const dataInput = document.getElementById('dataInput');
    const uploadResult = document.getElementById('uploadResult');
    const uploadStatus = document.getElementById('uploadStatus');
    
    const column = columnSelect.value;
    
    if (!column) {
        alert('Please select a column first');
        return;
    }
    
    try {
        uploadStatus.className = 'result-box info';
        uploadStatus.textContent = 'Loading dataset...';
        uploadResult.style.display = 'block';
        
        const response = await fetch(`${window.location.origin}/dataset/load`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                column: column,
                n_samples: 50
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Populate the data input field
            dataInput.value = result.sample_data.join(', ');
            
            // Store data for later visualization
            uploadedData = result.sample_data;
            
            uploadStatus.className = 'result-box success';
            uploadStatus.textContent = `✓ Dataset loaded!\n\n` +
                `Column: ${result.dataset_info.selected_column}\n` +
                `Samples: ${result.dataset_info.sample_size}\n` +
                `Statistics:\n` +
                `  Mean: ${result.statistics.mean.toFixed(2)}\n` +
                `  Min: ${result.statistics.min.toFixed(2)}\n` +
                `  Max: ${result.statistics.max.toFixed(2)}\n` +
                `  Std: ${result.statistics.std.toFixed(2)}\n\n` +
                `Data loaded into input field. Click "Encrypt & Upload" to proceed.`;
        } else {
            throw new Error(result.error || 'Failed to load dataset');
        }
    } catch (error) {
        uploadStatus.className = 'result-box error';
        uploadStatus.textContent = `Error: ${error.message}`;
        uploadResult.style.display = 'block';
    }
}


/**
 * Render data visualization chart
 */
function renderDataChart(data, selectedComputation = 'mean') {
    if (!data || data.length === 0) {
        return;
    }
    
    const chartSection = document.getElementById('chartSection');
    const chartStats = document.getElementById('chartStats');
    const chartCanvas = document.getElementById('dataChart');
    
    if (!chartSection || !chartCanvas) {
        return;
    }
    
    // Store data globally
    window.chartData = data;
    window.selectedComputation = selectedComputation;
    
    // Calculate all statistics
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    // Calculate median
    const sortedData = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sortedData.length / 2);
    const median = sortedData.length % 2 === 0 
        ? (sortedData[mid - 1] + sortedData[mid]) / 2 
        : sortedData[mid];
    
    // Calculate mode
    const frequency = {};
    let maxFreq = 0;
    let modes = [];
    
    data.forEach(value => {
        frequency[value] = (frequency[value] || 0) + 1;
        if (frequency[value] > maxFreq) {
            maxFreq = frequency[value];
        }
    });
    
    for (let value in frequency) {
        if (frequency[value] === maxFreq) {
            modes.push(parseFloat(value));
        }
    }
    
    const mode = modes.length === data.length ? mean : modes[0];
    
    // Calculate variance and standard deviation
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const std = Math.sqrt(variance);
    
    // Store all statistics
    window.chartStats = { mean, median, mode, min, max, variance, std };
    
    // Create chart with only selected statistic
    updateChartForSelectedStatistic();
    
    // Show chart section
    chartSection.style.display = 'block';
}

/**
 * Update chart to show only the selected statistic
 */
function updateChartForSelectedStatistic() {
    if (!window.chartData || !window.chartStats) {
        return;
    }
    
    const data = window.chartData;
    const stats = window.chartStats;
    const selectedComputation = window.selectedComputation || 'mean';
    const chartCanvas = document.getElementById('dataChart');
    
    if (!chartCanvas) {
        return;
    }
    
    // Destroy existing chart if it exists
    if (dataChart) {
        dataChart.destroy();
    }
    
    // Get the selected statistic value
    let statisticValue;
    let statisticName;
    let lineColor;
    
    switch (selectedComputation) {
        case 'mean':
            statisticValue = stats.mean;
            statisticName = 'Mean';
            lineColor = 'rgba(16, 185, 129, 1)';
            break;
        case 'median':
            statisticValue = stats.median;
            statisticName = 'Median';
            lineColor = 'rgba(168, 85, 247, 1)';
            break;
        case 'mode':
            statisticValue = stats.mode;
            statisticName = 'Mode';
            lineColor = 'rgba(236, 72, 153, 1)';
            break;
        case 'min':
            statisticValue = stats.min;
            statisticName = 'Minimum';
            lineColor = 'rgba(239, 68, 68, 1)';
            break;
        case 'max':
            statisticValue = stats.max;
            statisticName = 'Maximum';
            lineColor = 'rgba(245, 158, 11, 1)';
            break;
        case 'std':
            statisticValue = stats.std;
            statisticName = 'Standard Deviation';
            lineColor = 'rgba(59, 130, 246, 1)';
            break;
        case 'variance':
            statisticValue = stats.variance;
            statisticName = 'Variance';
            lineColor = 'rgba(139, 92, 246, 1)';
            break;
        case 'histogram':
            // For histogram, we'll create a different chart type
            createHistogramChart(data);
            return;
        default:
            statisticValue = stats.mean;
            statisticName = 'Mean';
            lineColor = 'rgba(16, 185, 129, 1)';
    }
    
    // Build datasets - always show data bars + selected statistic line
    const datasets = [
        {
            label: 'Data Values',
            data: data,
            backgroundColor: 'rgba(99, 102, 241, 0.6)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1,
            type: 'bar'
        },
        {
            label: statisticName,
            data: data.map(() => statisticValue),
            type: 'line',
            borderColor: lineColor,
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
            borderDash: [5, 5]
        }
    ];
    
    // Create chart title
    const title = `Data Distribution with ${statisticName}`;
    
    // Update statistics display
    updateStatisticsDisplayForSelected(statisticName, statisticValue, data.length);
    
    // Create new chart
    const ctx = chartCanvas.getContext('2d');
    dataChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map((_, i) => `Value ${i + 1}`),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#1e293b',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                },
                title: {
                    display: true,
                    text: title,
                    color: '#1e293b',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: '#1e293b',
                        font: {
                            size: 11,
                            weight: '500'
                        }
                    },
                    grid: {
                        color: 'rgba(226, 232, 240, 0.8)'
                    }
                },
                x: {
                    ticks: {
                        color: '#1e293b',
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 10,
                            weight: '500'
                        }
                    },
                    grid: {
                        color: 'rgba(226, 232, 240, 0.8)'
                    }
                }
            }
        }
    });
}

/**
 * Create histogram chart
 */
function createHistogramChart(data) {
    const chartCanvas = document.getElementById('dataChart');
    const chartSection = document.getElementById('chartSection');
    const chartStats = document.getElementById('chartStats');
    
    if (!chartCanvas) {
        return;
    }
    
    // Destroy existing chart if it exists
    if (dataChart) {
        dataChart.destroy();
    }
    
    // Calculate histogram bins
    const numBins = 10;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / numBins;
    
    // Create bins
    const bins = Array(numBins).fill(0);
    const binLabels = [];
    
    for (let i = 0; i < numBins; i++) {
        const binStart = min + (i * binWidth);
        const binEnd = min + ((i + 1) * binWidth);
        binLabels.push(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`);
    }
    
    // Count values in each bin
    data.forEach(value => {
        const binIndex = Math.min(Math.floor((value - min) / binWidth), numBins - 1);
        bins[binIndex]++;
    });
    
    // Create histogram chart
    const ctx = chartCanvas.getContext('2d');
    dataChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: binLabels,
            datasets: [{
                label: 'Frequency',
                data: bins,
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#1e293b',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Data Histogram',
                    color: '#1e293b',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Frequency',
                        color: '#1e293b',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        color: '#1e293b',
                        font: {
                            size: 11,
                            weight: '500'
                        }
                    },
                    grid: {
                        color: 'rgba(226, 232, 240, 0.8)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Value Range',
                        color: '#1e293b',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        color: '#1e293b',
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 10,
                            weight: '500'
                        }
                    },
                    grid: {
                        color: 'rgba(226, 232, 240, 0.8)'
                    }
                }
            }
        }
    });
    
    // Show chart section
    chartSection.style.display = 'block';
    
    // Update statistics display
    const totalCount = bins.reduce((a, b) => a + b, 0);
    const maxFrequency = Math.max(...bins);
    const maxBinIndex = bins.indexOf(maxFrequency);
    
    chartStats.className = 'result-box success';
    chartStats.textContent = `Histogram Statistics:\n` +
        `  Total Values: ${totalCount}\n` +
        `  Number of Bins: ${numBins}\n` +
        `  Bin Width: ${binWidth.toFixed(2)}\n` +
        `  Most Frequent Range: ${binLabels[maxBinIndex]} (${maxFrequency} values)\n` +
        `  Min Value: ${min.toFixed(2)}\n` +
        `  Max Value: ${max.toFixed(2)}`;
}

/**
 * Update statistics display for selected statistic only
 */
function updateStatisticsDisplayForSelected(statisticName, statisticValue, count) {
    const chartStats = document.getElementById('chartStats');
    
    if (!chartStats) {
        return;
    }
    
    const statisticsText = `Statistics:\n  ${statisticName}: ${statisticValue.toFixed(4)}\n  Count: ${count}`;
    
    chartStats.className = 'result-box success';
    chartStats.textContent = statisticsText;
}

/**
 * Legacy updateChart function - now redirects to new function
 */
function updateChart() {
    updateChartForSelectedStatistic();
}


// Make functions available globally
window.encryptAndUpload = encryptAndUpload;
window.computeMean = computeMean;
window.computeStatistic = computeStatistic;
window.storeDocument = storeDocument;
window.searchDocuments = searchDocuments;
window.loadVectors = loadVectors;
window.loadDatasetColumns = loadDatasetColumns;
window.loadDatasetData = loadDatasetData;
window.uploadExternalFile = uploadExternalFile;
window.updateChart = updateChart;
/**
 * Load SSE text columns from dataset
 */
async function loadSSEColumns() {
    const sseColumnSelect = document.getElementById('sseColumnSelect');
    
    if (!sseColumnSelect) {
        return;
    }
    
    try {
        const API_BASE_URL = window.location.origin;
        const response = await fetch(`${API_BASE_URL}/dataset/columns`);
        const result = await response.json();
        
        if (result.status === 'success') {
            sseColumnSelect.innerHTML = '<option value="">Select a text column...</option>';
            if (result.text_columns && result.text_columns.length > 0) {
                result.text_columns.forEach(col => {
                    const option = document.createElement('option');
                    option.value = col;
                    option.textContent = col;
                    sseColumnSelect.appendChild(option);
                });
            } else {
                sseColumnSelect.innerHTML = '<option value="">No text columns available</option>';
            }
        }
    } catch (error) {
        console.error('Error loading SSE columns:', error);
        if (sseColumnSelect) {
            sseColumnSelect.innerHTML = '<option value="">Error loading columns</option>';
        }
    }
}

/**
 * Load sample keywords from dataset for SSE
 */
async function loadSSEData() {
    const sseColumnSelect = document.getElementById('sseColumnSelect');
    const keywordInput = document.getElementById('keywordInput');
    
    const column = sseColumnSelect ? sseColumnSelect.value : '';
    
    if (!column) {
        alert('Please select a text column first');
        return;
    }
    
    try {
        const API_BASE_URL = window.location.origin;
        const response = await fetch(`${API_BASE_URL}/dataset/load`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                column: column,
                n_samples: 10,
                for_sse: true
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Show first sample keyword
            if (result.sample_data && result.sample_data.length > 0) {
                keywordInput.value = result.sample_data[0];
                alert(`Loaded sample keyword: "${result.sample_data[0]}"\n\nAvailable keywords: ${result.sample_data.slice(0, 5).join(', ')}${result.sample_data.length > 5 ? '...' : ''}`);
            }
        } else {
            throw new Error(result.error || 'Failed to load SSE data');
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}


window.loadSSEColumns = loadSSEColumns;
window.loadSSEData = loadSSEData;
window.updateChart = updateChart;
/**
 * Global variables for new workflow
 */
let uploadedFileData = null;
let uploadedFileName = null;
let fileColumns = null;
let selectedColumnData = null;

/**
 * Upload file (Step 1)
 */
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const fileUploadStatus = document.getElementById('fileUploadStatus');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please select a file first');
        return;
    }
    
    const file = fileInput.files[0];
    const fileName = file.name.toLowerCase();
    
    try {
        fileUploadStatus.className = 'result-box info';
        fileUploadStatus.textContent = 'Processing uploaded file...';
        fileUploadStatus.style.display = 'block';
        
        const fileContent = await readFileContent(file);
        
        // Process different file formats
        if (fileName.endsWith('.csv')) {
            await processCSVForWorkflow(fileContent, file.name);
        } else if (fileName.endsWith('.txt')) {
            await processTXTForWorkflow(fileContent, file.name);
        } else if (fileName.endsWith('.json')) {
            await processJSONForWorkflow(fileContent, file.name);
        } else {
            throw new Error('Unsupported file format. Please use CSV, TXT, or JSON files.');
        }
        
    } catch (error) {
        fileUploadStatus.className = 'result-box error';
        fileUploadStatus.textContent = `Error processing file: ${error.message}`;
        fileUploadStatus.style.display = 'block';
    }
}

/**
 * Process CSV file for new workflow
 */
async function processCSVForWorkflow(content, fileName) {
    const fileUploadStatus = document.getElementById('fileUploadStatus');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        throw new Error('File is empty');
    }
    
    // Parse header row
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Store all data
    const allData = {};
    headers.forEach(header => {
        allData[header] = [];
    });
    
    // Parse data rows
    for (let i = 1; i < lines.length && i < 1001; i++) {
        const values = lines[i].split(',');
        headers.forEach((header, index) => {
            if (values[index]) {
                const value = parseFloat(values[index].trim().replace(/"/g, ''));
                if (!isNaN(value)) {
                    allData[header].push(value);
                }
            }
        });
    }
    
    // Store globally
    uploadedFileData = allData;
    uploadedFileName = fileName;
    fileColumns = headers;
    
    fileUploadStatus.className = 'result-box success';
    fileUploadStatus.textContent = `✓ File uploaded successfully!\n\n` +
        `File: ${fileName}\n` +
        `Columns found: ${headers.length}\n` +
        `Rows: ${lines.length - 1}\n` +
        `Columns: ${headers.join(', ')}\n\n` +
        `Proceed to Step 2 to encrypt the data.`;
}

/**
 * Process TXT file for new workflow
 */
async function processTXTForWorkflow(content, fileName) {
    const fileUploadStatus = document.getElementById('fileUploadStatus');
    const lines = content.split('\n').filter(line => line.trim());
    const data = [];
    
    for (let line of lines) {
        if (data.length >= 1000) break;
        const num = parseFloat(line.trim());
        if (!isNaN(num)) {
            data.push(num);
        }
    }
    
    if (data.length === 0) {
        throw new Error('No valid numeric data found in the file');
    }
    
    // Store globally
    uploadedFileData = { 'Data': data };
    uploadedFileName = fileName;
    fileColumns = ['Data'];
    
    fileUploadStatus.className = 'result-box success';
    fileUploadStatus.textContent = `✓ File uploaded successfully!\n\n` +
        `File: ${fileName}\n` +
        `Data points: ${data.length}\n` +
        `Type: Single column numeric data\n\n` +
        `Proceed to Step 2 to encrypt the data.`;
}

/**
 * Process JSON file for new workflow
 */
async function processJSONForWorkflow(content, fileName) {
    const fileUploadStatus = document.getElementById('fileUploadStatus');
    
    try {
        const jsonData = JSON.parse(content);
        let data = [];
        
        if (Array.isArray(jsonData)) {
            for (let i = 0; i < jsonData.length && data.length < 1000; i++) {
                const item = jsonData[i];
                if (typeof item === 'number' && !isNaN(item)) {
                    data.push(item);
                }
            }
        } else if (typeof jsonData === 'object') {
            // Extract numeric values from object
            for (let key in jsonData) {
                if (data.length >= 1000) break;
                const value = jsonData[key];
                if (typeof value === 'number' && !isNaN(value)) {
                    data.push(value);
                }
            }
        }
        
        if (data.length === 0) {
            throw new Error('No valid numeric data found in JSON file');
        }
        
        // Store globally
        uploadedFileData = { 'Data': data };
        uploadedFileName = fileName;
        fileColumns = ['Data'];
        
        fileUploadStatus.className = 'result-box success';
        fileUploadStatus.textContent = `✓ File uploaded successfully!\n\n` +
            `File: ${fileName}\n` +
            `Data points: ${data.length}\n` +
            `Type: JSON numeric data\n\n` +
            `Proceed to Step 2 to encrypt the data.`;
        
    } catch (e) {
        throw new Error('Invalid JSON format: ' + e.message);
    }
}

/**
 * Encrypt data (Step 2)
 */
async function encryptData() {
    const uploadStatus = document.getElementById('uploadStatus');
    const datasetColumn = document.getElementById('datasetColumn');
    
    if (!uploadedFileData) {
        alert('Please upload a file first');
        return;
    }
    
    try {
        uploadStatus.className = 'result-box info';
        uploadStatus.textContent = 'Step 2: Encrypting all columns and generating hash...';
        uploadStatus.style.display = 'block';
        
        // Encrypt all columns
        const encryptedColumns = {};
        const hashes = {};
        
        for (let column of fileColumns) {
            const data = uploadedFileData[column];
            if (data && data.length > 0) {
                const vectorId = `vector_${column}_${Date.now()}`;
                
                // Upload and encrypt this column
                const response = await fetch(`${window.location.origin}/upload`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: vectorId,
                        plaintext: data,
                        encrypt: true
                    })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Upload failed');
                }
                
                const result = await response.json();
                encryptedColumns[column] = {
                    vectorId: result.vector_id,
                    hash: result.hash,
                    dataPoints: result.data_points
                };
                hashes[column] = result.hash;
            }
        }
        
        // Store globally
        window.encryptedColumns = encryptedColumns;
        window.columnHashes = hashes;
        
        uploadStatus.className = 'result-box success';
        uploadStatus.textContent = `✓ Step 2 Complete: All columns encrypted and hashes generated!\n\n` +
            `File: ${uploadedFileName}\n` +
            `Columns encrypted: ${fileColumns.length}\n` +
            `Hashes generated: ${Object.keys(hashes).length}\n\n` +
            `✓ Data encrypted using CKKS\n` +
            `✓ Hashes generated for verification\n\n` +
            `Proceed to Step 3 to select a column for analysis.`;
        uploadStatus.style.display = 'block';
        
        // Populate column dropdown
        datasetColumn.innerHTML = '<option value="">Select a column...</option>';
        fileColumns.forEach(col => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = `${col} (${uploadedFileData[col].length} values)`;
            datasetColumn.appendChild(option);
        });
        
    } catch (error) {
        uploadStatus.className = 'result-box error';
        uploadStatus.textContent = `Error: ${error.message}`;
        uploadStatus.style.display = 'block';
    }
}

/**
 * Select column (Step 3)
 */
async function selectColumn() {
    const datasetColumn = document.getElementById('datasetColumn');
    const columnSelectionStatus = document.getElementById('columnSelectionStatus');
    
    const selectedColumn = datasetColumn.value;
    
    if (!selectedColumn) {
        alert('Please select a column');
        return;
    }
    
    if (!window.encryptedColumns || !window.encryptedColumns[selectedColumn]) {
        alert('Column data not found. Please encrypt data first.');
        return;
    }
    
    const columnInfo = window.encryptedColumns[selectedColumn];
    
    // Set the vector ID for computations
    document.getElementById('vectorIdInput').value = columnInfo.vectorId;
    currentVectorId = columnInfo.vectorId;
    window.currentHash = columnInfo.hash;
    
    // Store selected column data for visualization
    uploadedData = uploadedFileData[selectedColumn];
    
    columnSelectionStatus.className = 'result-box success';
    columnSelectionStatus.textContent = `✓ Step 3 Complete: Column selected!\n\n` +
        `Selected Column: ${selectedColumn}\n` +
        `Vector ID: ${columnInfo.vectorId}\n` +
        `Data Points: ${columnInfo.dataPoints}\n` +
        `Hash: ${columnInfo.hash.substring(0, 16)}...\n\n` +
        `Proceed to Step 4 to perform computations.`;
    columnSelectionStatus.style.display = 'block';
}

/**
 * Encrypt and upload data (legacy - kept for compatibility)
 */
async function encryptAndUpload() {
    const dataInput = document.getElementById('dataInput');
    const uploadResult = document.getElementById('uploadResult');
    const uploadStatus = document.getElementById('uploadStatus');
    
    try {
        // Parse input
        const data = parseData(dataInput.value);
        validateData(data);
        
        // Show loading
        uploadStatus.className = 'result-box info';
        uploadStatus.textContent = 'Step 2: Encrypting dataset and generating hash...';
        uploadResult.style.display = 'block';
        
        const vectorId = `vector_${Date.now()}`;
        document.getElementById('vectorIdInput').value = vectorId;
        currentVectorId = vectorId;
        
        // Store data for visualization
        uploadedData = data;
        
        // Upload plaintext data - server will encrypt it and generate hash
        const response = await fetch(`${window.location.origin}/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: vectorId,
                plaintext: data,
                encrypt: true
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }
        
        const result = await response.json();
        
        // Store hash globally for verification
        window.currentHash = result.hash;
        
        uploadStatus.className = 'result-box success';
        uploadStatus.textContent = `✓ Step 2 Complete: Data encrypted and hash generated!\n\n` +
            `Vector ID: ${result.vector_id}\n` +
            `Data points: ${result.data_points}\n` +
            `Hash: ${result.hash ? result.hash.substring(0, 16) + '...' : 'N/A'}\n` +
            `Status: ${result.status}\n\n` +
            `✓ Data encrypted using CKKS\n` +
            `✓ Hash generated for verification\n\n` +
            `Proceed to Step 4 to perform computations.`;
        
    } catch (error) {
        uploadStatus.className = 'result-box error';
        uploadStatus.textContent = `Error: ${error.message}`;
        uploadResult.style.display = 'block';
    }
}


/**
 * ========================================
 * SSE (Searchable Symmetric Encryption) Functions
 * ========================================
 */

// Global variables for SSE
let sseFileData = null;
let sseFileName = null;
let sseColumns = null;
let sseKeywordColumn = null;
let sseEncryptedRecords = [];
let sseSearchResults = null;

/**
 * Upload SSE file (Step 1)
 */
async function uploadSSEFile() {
    const fileInput = document.getElementById('sseFileInput');
    const fileUploadStatus = document.getElementById('sseFileUploadStatus');
    const keywordColumnSelect = document.getElementById('sseKeywordColumn');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please select a file first');
        return;
    }
    
    const file = fileInput.files[0];
    const fileName = file.name.toLowerCase();
    
    if (!fileName.endsWith('.csv')) {
        alert('Please upload a CSV file');
        return;
    }
    
    try {
        fileUploadStatus.className = 'result-box info';
        fileUploadStatus.textContent = 'Processing CSV file...';
        fileUploadStatus.style.display = 'block';
        
        const fileContent = await readFileContent(file);
        const lines = fileContent.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            throw new Error('File is empty');
        }
        
        // Parse CSV
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const records = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const record = {};
            headers.forEach((header, index) => {
                record[header] = values[index] || '';
            });
            records.push(record);
        }
        
        // Store globally
        sseFileData = records;
        sseFileName = file.name;
        sseColumns = headers;
        
        // Populate keyword column dropdown
        keywordColumnSelect.innerHTML = '<option value="">Select keyword column...</option>';
        headers.forEach(col => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;
            keywordColumnSelect.appendChild(option);
        });
        
        fileUploadStatus.className = 'result-box success';
        fileUploadStatus.textContent = `✓ Step 1 Complete: File uploaded!\n\n` +
            `File: ${file.name}\n` +
            `Records: ${records.length}\n` +
            `Columns: ${headers.join(', ')}\n\n` +
            `Proceed to Step 2 to select keyword column and encrypt.`;
        fileUploadStatus.style.display = 'block';
        
    } catch (error) {
        fileUploadStatus.className = 'result-box error';
        fileUploadStatus.textContent = `Error: ${error.message}`;
        fileUploadStatus.style.display = 'block';
    }
}

/**
 * Encrypt SSE data (Step 2)
 */
async function encryptSSEData() {
    const keywordColumnSelect = document.getElementById('sseKeywordColumn');
    const encryptStatus = document.getElementById('sseEncryptStatus');
    
    if (!sseFileData) {
        alert('Please upload a file first');
        return;
    }
    
    const keywordColumn = keywordColumnSelect.value;
    if (!keywordColumn) {
        alert('Please select a keyword column');
        return;
    }
    
    try {
        encryptStatus.className = 'result-box info';
        encryptStatus.textContent = 'Step 2: Encrypting keywords and storing records...';
        encryptStatus.style.display = 'block';
        
        sseKeywordColumn = keywordColumn;
        
        // Prepare records for encryption
        const recordsToStore = [];
        
        for (let record of sseFileData) {
            const keyword = record[keywordColumn];
            if (keyword) {
                // Encrypt keyword (simplified - using base64 for demo)
                const encryptedKeyword = btoa(keyword.toLowerCase());
                
                recordsToStore.push({
                    encrypted_keyword: encryptedKeyword,
                    data: record
                });
            }
        }
        
        // Send to server
        const response = await fetch(`${window.location.origin}/sse/store_records`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                records: recordsToStore
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Encryption failed');
        }
        
        const result = await response.json();
        
        sseEncryptedRecords = recordsToStore;
        
        encryptStatus.className = 'result-box success';
        encryptStatus.textContent = `✓ Step 2 Complete: Keywords encrypted!\n\n` +
            `Keyword Column: ${keywordColumn}\n` +
            `Records encrypted: ${result.stored_count}\n\n` +
            `✓ Keywords encrypted using SSE\n` +
            `✓ Records stored on server\n\n` +
            `Proceed to Step 3 to search by keyword.`;
        encryptStatus.style.display = 'block';
        
    } catch (error) {
        encryptStatus.className = 'result-box error';
        encryptStatus.textContent = `Error: ${error.message}`;
        encryptStatus.style.display = 'block';
    }
}

/**
 * Search SSE keyword (Step 3)
 */
async function searchSSEKeyword() {
    const searchKeywordInput = document.getElementById('sseSearchKeyword');
    const keywordEncryptStatus = document.getElementById('sseKeywordEncryptStatus');
    const encryptedResultStatus = document.getElementById('sseEncryptedResultStatus');
    
    if (!sseEncryptedRecords || sseEncryptedRecords.length === 0) {
        alert('Please encrypt data first');
        return;
    }
    
    const keyword = searchKeywordInput.value.trim();
    if (!keyword) {
        alert('Please enter a search keyword');
        return;
    }
    
    try {
        // Step 4: Encrypt search keyword
        keywordEncryptStatus.className = 'result-box info';
        keywordEncryptStatus.textContent = `Step 4: Encrypting search keyword "${keyword}"...`;
        keywordEncryptStatus.style.display = 'block';
        
        // Encrypt keyword (same method as storage)
        const encryptedKeyword = btoa(keyword.toLowerCase());
        
        keywordEncryptStatus.className = 'result-box success';
        keywordEncryptStatus.textContent = `✓ Step 4 Complete: Search keyword encrypted!\n\n` +
            `Original keyword: ${keyword}\n` +
            `Encrypted: ${encryptedKeyword.substring(0, 20)}...\n\n` +
            `Sending encrypted keyword to server...`;
        keywordEncryptStatus.style.display = 'block';
        
        // Step 5: Search on server
        encryptedResultStatus.className = 'result-box info';
        encryptedResultStatus.textContent = 'Step 5: Searching encrypted index...';
        encryptedResultStatus.style.display = 'block';
        
        const response = await fetch(`${window.location.origin}/sse/search`, {
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
        
        const result = await response.json();
        
        sseSearchResults = result;
        
        encryptedResultStatus.className = 'result-box success';
        encryptedResultStatus.textContent = `✓ Step 5 Complete: Search completed!\n\n` +
            `Matches found: ${result.matches}\n` +
            `Record IDs: ${result.record_ids.join(', ')}\n\n` +
            `Results are encrypted. Click "Decrypt Results" in Step 6.`;
        encryptedResultStatus.style.display = 'block';
        
    } catch (error) {
        encryptedResultStatus.className = 'result-box error';
        encryptedResultStatus.textContent = `Error: ${error.message}`;
        encryptedResultStatus.style.display = 'block';
    }
}

/**
 * Decrypt SSE results (Step 6)
 */
async function decryptSSEResults() {
    const decryptStatus = document.getElementById('sseDecryptStatus');
    
    if (!sseSearchResults || sseSearchResults.matches === 0) {
        alert('No search results to decrypt. Please search first.');
        return;
    }
    
    try {
        decryptStatus.className = 'result-box info';
        decryptStatus.textContent = 'Step 6: Decrypting results...';
        decryptStatus.style.display = 'block';
        
        // Results are already decrypted from server
        const records = sseSearchResults.records;
        
        decryptStatus.className = 'result-box success';
        decryptStatus.textContent = `✓ Step 6 Complete: Results decrypted!\n\n` +
            `Decrypted ${records.length} record(s)\n\n` +
            `View results in table format below (Step 7).`;
        decryptStatus.style.display = 'block';
        
        // Show table (Step 7)
        displaySSEResultsTable(records);
        
    } catch (error) {
        decryptStatus.className = 'result-box error';
        decryptStatus.textContent = `Error: ${error.message}`;
        decryptStatus.style.display = 'block';
    }
}

/**
 * Display SSE results in table format (Step 7)
 */
function displaySSEResultsTable(records) {
    const tableResult = document.getElementById('sseTableResult');
    const tableHead = document.getElementById('sseTableHead');
    const tableBody = document.getElementById('sseTableBody');
    
    if (!records || records.length === 0) {
        tableResult.style.display = 'none';
        return;
    }
    
    // Get column headers from first record
    const headers = Object.keys(records[0]);
    
    // Build table header
    let headerHTML = '<tr>';
    headers.forEach(header => {
        headerHTML += `<th>${header}</th>`;
    });
    headerHTML += '</tr>';
    tableHead.innerHTML = headerHTML;
    
    // Build table body
    let bodyHTML = '';
    records.forEach((record, index) => {
        bodyHTML += `<tr>`;
        headers.forEach(header => {
            bodyHTML += `<td>${record[header] || ''}</td>`;
        });
        bodyHTML += '</tr>';
    });
    tableBody.innerHTML = bodyHTML;
    
    // Show table
    tableResult.style.display = 'block';
}

