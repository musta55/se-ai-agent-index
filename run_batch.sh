#!/bin/bash
# Batch run script for multiple agents
# Automatically activates virtual environment

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run: python3.13 -m venv venv"
    exit 1
fi

source venv/bin/activate

python main.py "$@"
