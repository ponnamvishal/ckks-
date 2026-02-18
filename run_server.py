#!/usr/bin/env python
"""
Launcher script for the Secure Cloud Analytics Server.
This ensures proper imports regardless of how the script is run.
"""
import sys
import os

# Add project root to path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Now import and run the app
from server.app import app

if __name__ == "__main__":
    print("Starting Secure Cloud Analytics Server...")
    print("Server running on http://localhost:5001")
    print("Note: If port 5000 was in use, switched to 5001")
    app.run(debug=True, host="0.0.0.0", port=5001)
