/**
 * Cryptographic utilities for CKKS and SSE operations
 * Note: This is a simplified version. In production, you'd use proper libraries.
 */

const API_BASE_URL = 'http://localhost:5001';

// CKKS Context (simplified - in production, this would be properly initialized)
let ckksContext = null;

/**
 * Initialize CKKS context
 * Note: This is a placeholder. In a real implementation, you'd use TenSEAL.js
 */
async function initCKKSContext() {
    // In a real implementation, you'd initialize TenSEAL context here
    // For now, we'll handle encryption/decryption on the server side
    // or use a proper WebAssembly build of TenSEAL
    console.log('CKKS context initialization (simplified for demo)');
    return true;
}

/**
 * Parse comma-separated numeric data
 */
function parseData(input) {
    return input.split(',')
        .map(x => x.trim())
        .map(parseFloat)
        .filter(x => !isNaN(x));
}

/**
 * Validate data input
 */
function validateData(data) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Data must be a non-empty array');
    }
    if (!data.every(x => typeof x === 'number' && !isNaN(x))) {
        throw new Error('All values must be valid numbers');
    }
    return true;
}

/**
 * Encrypt keyword using HMAC (for SSE)
 * This is a simplified client-side implementation
 */
function encryptKeyword(keyword, key) {
    // In production, use Web Crypto API or proper crypto library
    // For demo purposes, we'll send to server or use a simple hash
    // This is just for demonstration - real SSE would use proper encryption
    return btoa(keyword); // Simplified - in production use proper HMAC
}

/**
 * Format JSON for display
 */
function formatJSON(obj) {
    return JSON.stringify(obj, null, 2);
}

/**
 * Calculate plaintext mean (for verification)
 */
function calculateMean(data) {
    return data.reduce((a, b) => a + b, 0) / data.length;
}

/**
 * Calculate median
 */
function calculateMedian(data) {
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
}

/**
 * Calculate mode (most frequent value)
 */
function calculateMode(data) {
    const frequency = {};
    let maxFreq = 0;
    let modes = [];
    
    // Count frequencies
    data.forEach(value => {
        frequency[value] = (frequency[value] || 0) + 1;
        if (frequency[value] > maxFreq) {
            maxFreq = frequency[value];
        }
    });
    
    // Find all values with maximum frequency
    for (let value in frequency) {
        if (frequency[value] === maxFreq) {
            modes.push(parseFloat(value));
        }
    }
    
    return modes.length === data.length ? null : modes; // No mode if all values appear once
}

/**
 * Calculate standard deviation
 */
function calculateStandardDeviation(data) {
    const mean = calculateMean(data);
    const squaredDiffs = data.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = calculateMean(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
}

/**
 * Calculate variance
 */
function calculateVariance(data) {
    const mean = calculateMean(data);
    const squaredDiffs = data.map(value => Math.pow(value - mean, 2));
    return calculateMean(squaredDiffs);
}

/**
 * Calculate minimum value
 */
function calculateMin(data) {
    return Math.min(...data);
}

/**
 * Calculate maximum value
 */
function calculateMax(data) {
    return Math.max(...data);
}

// Make utility functions globally available
window.parseData = parseData;
window.validateData = validateData;
window.formatJSON = formatJSON;
window.calculateMean = calculateMean;
window.calculateMedian = calculateMedian;
window.calculateMode = calculateMode;
window.calculateStandardDeviation = calculateStandardDeviation;
window.calculateVariance = calculateVariance;
window.calculateMin = calculateMin;
window.calculateMax = calculateMax;
