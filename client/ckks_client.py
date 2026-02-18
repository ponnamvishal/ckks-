import tenseal as ts
import numpy as np
import hashlib
import json

def generate_hash(data):
    """
    Generate SHA-256 hash of the data for verification.
    
    Args:
        data: List or numpy array of numeric values
        
    Returns:
        str: Hexadecimal hash string
    """
    # Convert data to string representation for consistent hashing
    data_str = json.dumps(sorted([float(x) for x in data]))
    return hashlib.sha256(data_str.encode()).hexdigest()

def encrypt_vector(context, data):
    """
    Encrypts a numeric vector using CKKS and generates hash for verification.
    
    Args:
        context: TenSEAL CKKS context
        data: List or numpy array of numeric values
        
    Returns:
        tuple: (ts.CKKSVector, str) - Encrypted vector and hash value
    """
    # Generate hash before encryption
    data_hash = generate_hash(data)
    
    # Encrypt the data
    encrypted_vector = ts.ckks_vector(context, data)
    
    return encrypted_vector, data_hash

def decrypt_vector(enc_vector):
    """
    Decrypts a CKKS encrypted vector.
    
    Args:
        enc_vector: Encrypted CKKS vector
        
    Returns:
        list: Decrypted values
    """
    return enc_vector.decrypt()

def verify_result(original_hash, decrypted_data):
    """
    Verify decrypted result matches original data hash.
    
    Args:
        original_hash: Hash generated during encryption
        decrypted_data: Decrypted data to verify
        
    Returns:
        bool: True if verification succeeds
    """
    computed_hash = generate_hash(decrypted_data)
    return original_hash == computed_hash
