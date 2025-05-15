#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv-elevation-solver"

# Create virtualenv if needed
if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
fi

# Activate and install dependencies
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install -r "$SCRIPT_DIR/requirements.txt"
