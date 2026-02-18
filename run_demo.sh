#!/bin/bash
# Quick start script for Hybrid SSE + CKKS Secure Cloud Analytics Demo

echo "=========================================="
echo "Hybrid SSE + CKKS Secure Cloud Analytics"
echo "Quick Start Script"
echo "=========================================="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -q -r requirements.txt

echo ""
echo "=========================================="
echo "Running Client Demo..."
echo "=========================================="
echo ""

# Run the demo
python client/client_demo.py

echo ""
echo "=========================================="
echo "Demo Complete!"
echo ""
echo "To start the cloud server, run:"
echo "  python server/app.py"
echo "=========================================="
