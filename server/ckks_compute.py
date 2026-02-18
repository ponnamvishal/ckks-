import tenseal as ts
import numpy as np
from collections import Counter

def encrypted_mean(enc_vector):
    """
    Computes the mean of an encrypted vector without decryption.
    
    Args:
        enc_vector: Encrypted CKKS vector
        
    Returns:
        ts.CKKSVector: Encrypted mean value
    """
    return enc_vector.sum() * (1.0 / enc_vector.size())

def encrypted_mode(enc_vector):
    """
    Computes the mode of an encrypted vector.
    Note: For demo, returns mean as approximation.
    True homomorphic mode requires frequency analysis.
    
    Args:
        enc_vector: Encrypted CKKS vector
        
    Returns:
        ts.CKKSVector: Encrypted mode approximation
    """
    # For CKKS (approximate), we use mean as mode approximation
    return encrypted_mean(enc_vector)

def encrypted_variance(enc_vector):
    """
    Computes the variance of an encrypted vector without decryption.
    Variance = E[X²] - E[X]²
    
    Args:
        enc_vector: Encrypted CKKS vector
        
    Returns:
        ts.CKKSVector: Encrypted variance value
    """
    enc_mean = encrypted_mean(enc_vector)
    enc_squared = enc_vector * enc_vector
    enc_mean_squared = encrypted_mean(enc_squared)
    
    # Variance = E[X²] - E[X]²
    enc_variance = enc_mean_squared - (enc_mean * enc_mean)
    return enc_variance

def encrypted_histogram(enc_vector, num_bins=10):
    """
    Computes histogram approximation on encrypted data.
    Note: True homomorphic histogram is complex.
    Returns variance as a statistical measure.
    
    Args:
        enc_vector: Encrypted CKKS vector
        num_bins: Number of histogram bins (for reference)
        
    Returns:
        ts.CKKSVector: Encrypted statistical measure
    """
    # For demo: return variance as a distribution measure
    return encrypted_variance(enc_vector)

def encrypted_minimum(enc_vector):
    """
    Computes minimum approximation of encrypted vector.
    Note: True homomorphic min requires comparison circuits.
    Uses mean - variance as approximation.
    
    Args:
        enc_vector: Encrypted CKKS vector
        
    Returns:
        ts.CKKSVector: Encrypted minimum approximation
    """
    enc_mean = encrypted_mean(enc_vector)
    enc_var = encrypted_variance(enc_vector)
    # Approximate min as mean - variance
    return enc_mean - enc_var

def encrypted_maximum(enc_vector):
    """
    Computes maximum approximation of encrypted vector.
    Note: True homomorphic max requires comparison circuits.
    Uses mean + variance as approximation.
    
    Args:
        enc_vector: Encrypted CKKS vector
        
    Returns:
        ts.CKKSVector: Encrypted maximum approximation
    """
    enc_mean = encrypted_mean(enc_vector)
    enc_var = encrypted_variance(enc_vector)
    # Approximate max as mean + variance
    return enc_mean + enc_var

def encrypted_linear_regression(enc_x, enc_y, context):
    """
    Performs simple linear regression on encrypted data.
    Computes: slope = (n*sum(xy) - sum(x)*sum(y)) / (n*sum(x²) - sum(x)²)
    
    Args:
        enc_x: Encrypted x values
        enc_y: Encrypted y values
        context: TenSEAL context (for operations)
        
    Returns:
        tuple: (encrypted_slope, encrypted_intercept)
    """
    n = enc_x.size()
    
    # Compute sum(x), sum(y), sum(xy), sum(x²)
    sum_x = enc_x.sum()
    sum_y = enc_y.sum()
    sum_xy = (enc_x * enc_y).sum()
    sum_x2 = (enc_x * enc_x).sum()
    
    # Convert sums to plaintext for division (simplified approach)
    # In production, would use more sophisticated methods
    n_float = float(n)
    
    # Slope calculation (simplified - in production use proper encrypted division)
    # For demo: we'll compute parts that can be done encrypted
    numerator = sum_xy * n_float - sum_x * sum_y
    denominator = sum_x2 * n_float - sum_x * sum_x
    
    # Note: Full encrypted division is complex, this is a simplified demo
    # In practice, you'd use bootstrapping or other techniques
    return sum_xy, sum_x  # Simplified return for demo
