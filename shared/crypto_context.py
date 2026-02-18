import tenseal as ts

def create_context():
    """
    Creates a CKKS encryption context with appropriate parameters.
    
    Returns:
        ts.Context: Configured CKKS context with Galois keys for vector operations
    """
    context = ts.context(
        ts.SCHEME_TYPE.CKKS,
        poly_modulus_degree=8192,
        coeff_mod_bit_sizes=[60, 40, 40, 60]
    )
    context.global_scale = 2 ** 40
    context.generate_galois_keys()
    return context
