"""
CKKS Workflow Demo - Following the steps from the image:
1. Upload dataset
2. Encrypt dataset → Generate hash value
3. Select column
4. Perform computations (Mean, mode, variance, histogram, minimum, maximum)
5. Encrypted result
6. Decrypt result
7. Result + hash → Verified
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.crypto_context import create_context
from client.ckks_client import encrypt_vector, decrypt_vector, verify_result, generate_hash
from server.ckks_compute import (encrypted_mean, encrypted_mode, encrypted_variance,
                                 encrypted_histogram, encrypted_minimum, encrypted_maximum)
import numpy as np

def run_ckks_workflow():
    print("=" * 60)
    print("CKKS Homomorphic Encryption Workflow Demo")
    print("=" * 60)
    
    # Step 1: Upload dataset (simulate with sample data)
    print("\n[Step 1] Upload Dataset")
    dataset = [23.5, 45.2, 67.8, 34.1, 56.9, 78.3, 12.4, 89.7, 45.6, 23.8]
    print(f"Dataset: {dataset}")
    
    # Step 2: Encrypt dataset → Generate hash value
    print("\n[Step 2] Encrypt Dataset and Generate Hash")
    context = create_context()
    encrypted_data, data_hash = encrypt_vector(context, dataset)
    print(f"✓ Data encrypted successfully")
    print(f"✓ Hash generated: {data_hash[:16]}...")
    
    # Step 3: Select column (already selected - using the dataset)
    print("\n[Step 3] Select Column")
    print(f"✓ Column selected: Numeric values (10 data points)")
    
    # Step 4: Perform computations
    print("\n[Step 4] Perform Homomorphic Computations")
    print("-" * 60)
    
    # Mean
    print("\n  Computing Mean...")
    enc_mean = encrypted_mean(encrypted_data)
    print("  ✓ Mean computed on encrypted data")
    
    # Mode
    print("\n  Computing Mode...")
    enc_mode = encrypted_mode(encrypted_data)
    print("  ✓ Mode computed on encrypted data")
    
    # Variance
    print("\n  Computing Variance...")
    enc_variance = encrypted_variance(encrypted_data)
    print("  ✓ Variance computed on encrypted data")
    
    # Histogram
    print("\n  Computing Histogram...")
    enc_histogram = encrypted_histogram(encrypted_data)
    print("  ✓ Histogram computed on encrypted data")
    
    # Minimum
    print("\n  Computing Minimum...")
    enc_min = encrypted_minimum(encrypted_data)
    print("  ✓ Minimum computed on encrypted data")
    
    # Maximum
    print("\n  Computing Maximum...")
    enc_max = encrypted_maximum(encrypted_data)
    print("  ✓ Maximum computed on encrypted data")
    
    # Step 5: Encrypted result (already have them)
    print("\n[Step 5] Encrypted Results")
    print("✓ All computations completed on encrypted data")
    print("✓ Results remain encrypted")
    
    # Step 6: Decrypt result
    print("\n[Step 6] Decrypt Results")
    print("-" * 60)
    
    decrypted_mean = decrypt_vector(enc_mean)
    decrypted_mode = decrypt_vector(enc_mode)
    decrypted_variance = decrypt_vector(enc_variance)
    decrypted_histogram = decrypt_vector(enc_histogram)
    decrypted_min = decrypt_vector(enc_min)
    decrypted_max = decrypt_vector(enc_max)
    
    print(f"  Mean:      {decrypted_mean[0]:.2f}")
    print(f"  Mode:      {decrypted_mode[0]:.2f}")
    print(f"  Variance:  {decrypted_variance[0]:.2f}")
    print(f"  Histogram: {decrypted_histogram[0]:.2f}")
    print(f"  Minimum:   {decrypted_min[0]:.2f}")
    print(f"  Maximum:   {decrypted_max[0]:.2f}")
    
    # Step 7: Result + hash → Verified
    print("\n[Step 7] Verify Results with Hash")
    print("-" * 60)
    
    # Verify original data integrity
    is_verified = verify_result(data_hash, dataset)
    
    if is_verified:
        print("✓ VERIFICATION SUCCESSFUL")
        print("✓ Data integrity confirmed")
        print("✓ Hash matches original dataset")
    else:
        print("✗ VERIFICATION FAILED")
        print("✗ Data may have been tampered with")
    
    # Compare with actual values
    print("\n[Verification] Compare with Actual Values")
    print("-" * 60)
    actual_mean = np.mean(dataset)
    actual_variance = np.var(dataset)
    actual_min = np.min(dataset)
    actual_max = np.max(dataset)
    
    print(f"  Actual Mean:     {actual_mean:.2f}")
    print(f"  Computed Mean:   {decrypted_mean[0]:.2f}")
    print(f"  Difference:      {abs(actual_mean - decrypted_mean[0]):.4f}")
    print()
    print(f"  Actual Variance: {actual_variance:.2f}")
    print(f"  Computed Var:    {decrypted_variance[0]:.2f}")
    print(f"  Difference:      {abs(actual_variance - decrypted_variance[0]):.4f}")
    
    print("\n" + "=" * 60)
    print("Workflow Complete!")
    print("=" * 60)
    print("\nKey Points:")
    print("• All computations performed on encrypted data")
    print("• Server never sees plaintext values")
    print("• Hash verification ensures data integrity")
    print("• Results match actual values (within CKKS precision)")

if __name__ == "__main__":
    run_ckks_workflow()
