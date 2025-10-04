#!/usr/bin/env python3
"""
Start script for Toonly AI Python backend
"""

import uvicorn

if __name__ == "__main__":
    print("🚀 Starting Toonly AI Python Backend...")
    print("📍 Server will run on: http://localhost:3001")
    print("🔄 Auto-reload enabled for development")
    print("=" * 50)
    
    uvicorn.run(
        "main:app",  # Import string instead of app object (required for reload)
        host="0.0.0.0", 
        port=3001,
        reload=True,  # Auto-reload on file changes during development
        log_level="info"
    )
