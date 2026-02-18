from cryptography.hazmat.primitives import hashes, hmac
from cryptography.hazmat.backends import default_backend
import base64
import os

class SSEClient:
    """
    Client-side Searchable Symmetric Encryption (SSE).
    Handles keyword encryption for secure search using deterministic HMAC.
    Note: For SSE, we need deterministic encryption so the same keyword
    always encrypts to the same value for searchability.
    """
    
    def __init__(self, key=None):
        """
        Initialize SSE client with encryption key.
        
        Args:
            key: Optional encryption key (bytes). If None, generates a new key.
        """
        if key is None:
            self.key = os.urandom(32)  # 32 bytes = 256 bits
        else:
            self.key = key
        self.backend = default_backend()
    
    def get_key(self):
        """Returns the encryption key (for sharing with authorized parties)."""
        return self.key
    
    def encrypt_keyword(self, keyword):
        """
        Encrypts a keyword for secure search using HMAC (deterministic).
        
        Args:
            keyword: Plaintext keyword string
            
        Returns:
            bytes: Encrypted keyword token (deterministic HMAC)
        """
        # Use HMAC for deterministic encryption
        # Same keyword always produces same token
        h = hmac.HMAC(self.key, hashes.SHA256(), backend=self.backend)
        h.update(keyword.encode('utf-8'))
        return h.finalize()
    
    def encrypt_keyword_base64(self, keyword):
        """
        Encrypts keyword and returns as base64 string (for JSON serialization).
        
        Args:
            keyword: Plaintext keyword string
            
        Returns:
            str: Base64-encoded encrypted keyword (deterministic)
        """
        encrypted = self.encrypt_keyword(keyword)
        return base64.b64encode(encrypted).decode('utf-8')
    
    def decrypt_keyword_from_base64(self, token_b64):
        """
        Note: In this SSE implementation, we don't decrypt keywords.
        The server only needs to match encrypted tokens for search.
        This is a simplified SSE for demonstration.
        
        Args:
            token_b64: Base64-encoded encrypted keyword
            
        Returns:
            str: Note that decryption is not needed for search
        """
        # In real SSE, we might store a mapping, but for this demo
        # the server only needs to match tokens
        return "decryption_not_needed_for_search"
