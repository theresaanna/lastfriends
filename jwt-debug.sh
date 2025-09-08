#!/bin/bash
# JWT Debug Tool - Convenience wrapper script

# Load environment from .env.local if it exists
if [ -f ".env.local" ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Check if a token was provided
if [ -z "$1" ]; then
    echo "Usage: ./jwt-debug.sh <jwt_token>"
    echo "       ./jwt-debug.sh --help"
    echo ""
    echo "This script will automatically load your .env.local file and debug the JWT token."
    exit 1
fi

# Show help if requested
if [ "$1" == "--help" ]; then
    node debug-jwt.mjs
    exit 0
fi

# Run the debug tool with the token
echo "🔍 Running JWT debug tool with environment from .env.local"
echo "📋 Using NEXTAUTH_SECRET from: ${NEXTAUTH_SECRET:+environment}"
echo ""

node debug-jwt.mjs "$1"
