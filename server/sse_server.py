"""
Server-side Searchable Symmetric Encryption (SSE) implementation.
Stores encrypted keywords and enables search without decryption.
"""

class SSEServer:
    """
    Server that stores encrypted keywords and performs search operations.
    The server never sees plaintext keywords.
    """
    
    def __init__(self):
        """Initialize empty encrypted index."""
        self.encrypted_index = {}  # Maps encrypted_keyword -> list of record_ids
        self.records = {}  # Store full record data
        self.record_counter = 0
    
    def store_record(self, encrypted_keyword, record_data):
        """
        Stores a record with encrypted keyword in the index.
        
        Args:
            encrypted_keyword: Encrypted keyword token (bytes or base64 string)
            record_data: Full record data (dict)
            
        Returns:
            str: Record ID
        """
        # Generate record ID
        record_id = f"record_{self.record_counter}"
        self.record_counter += 1
        
        # Normalize to string for dictionary key
        if isinstance(encrypted_keyword, bytes):
            keyword_key = encrypted_keyword.hex()
        else:
            keyword_key = encrypted_keyword
        
        # Add to encrypted index
        if keyword_key not in self.encrypted_index:
            self.encrypted_index[keyword_key] = []
        
        self.encrypted_index[keyword_key].append(record_id)
        
        # Store full record
        self.records[record_id] = record_data
        
        return record_id
    
    def store(self, doc_id, encrypted_keyword, metadata=None):
        """
        Legacy method: Stores a document with encrypted keyword in the index.
        
        Args:
            doc_id: Unique document identifier
            encrypted_keyword: Encrypted keyword token (bytes or base64 string)
            metadata: Optional document metadata
        """
        # Normalize to string for dictionary key
        if isinstance(encrypted_keyword, bytes):
            keyword_key = encrypted_keyword.hex()
        else:
            keyword_key = encrypted_keyword
        
        if keyword_key not in self.encrypted_index:
            self.encrypted_index[keyword_key] = []
        
        self.encrypted_index[keyword_key].append(doc_id)
        
        if metadata:
            self.records[doc_id] = metadata
    
    def search(self, encrypted_keyword):
        """
        Searches for records matching an encrypted keyword.
        
        Args:
            encrypted_keyword: Encrypted keyword token (bytes or base64 string)
            
        Returns:
            list: List of record IDs matching the keyword
        """
        # Normalize to string for dictionary key
        if isinstance(encrypted_keyword, bytes):
            keyword_key = encrypted_keyword.hex()
        else:
            keyword_key = encrypted_keyword
        
        return self.encrypted_index.get(keyword_key, [])
    
    def get_record(self, record_id):
        """
        Retrieves record data.
        
        Args:
            record_id: Record identifier
            
        Returns:
            dict: Record data or None
        """
        return self.records.get(record_id)
    
    def get_document(self, doc_id):
        """
        Legacy method: Retrieves document metadata.
        
        Args:
            doc_id: Document identifier
            
        Returns:
            dict: Document metadata or None
        """
        return self.records.get(doc_id)
    
    def get_all_records(self, record_ids):
        """
        Retrieves multiple records.
        
        Args:
            record_ids: List of record identifiers
            
        Returns:
            list: List of record data dictionaries
        """
        return [self.records.get(rid) for rid in record_ids if rid in self.records]
