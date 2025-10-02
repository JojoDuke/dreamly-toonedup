#!/usr/bin/env python3
"""
Automated setup script for Toonly AI Python Backend
Run this once to set up everything
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f"\n{'='*60}")
    print(f"  {description}")
    print(f"{'='*60}")
    try:
        result = subprocess.run(cmd, shell=True, check=True, text=True, capture_output=True)
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"ERROR: {e}")
        print(e.stderr)
        return False

def main():
    print("""
    ╔════════════════════════════════════════════════════════╗
    ║        Toonly AI Python Backend Setup                  ║
    ║        Automated Installation Script                   ║
    ╚════════════════════════════════════════════════════════╝
    """)
    
    # Check if we're in the backend directory
    if not Path("main.py").exists():
        print("❌ ERROR: Please run this script from the backend directory!")
        print("   cd backend")
        print("   python setup.py")
        sys.exit(1)
    
    # Step 1: Check Python version
    print("\n✓ Checking Python version...")
    python_version = sys.version_info
    if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 8):
        print(f"❌ ERROR: Python 3.8+ required, you have {python_version.major}.{python_version.minor}")
        sys.exit(1)
    print(f"  Python {python_version.major}.{python_version.minor}.{python_version.micro} detected ✓")
    
    # Step 2: Remove old venv if exists
    if Path("venv").exists():
        print("\n✓ Removing old virtual environment...")
        import shutil
        shutil.rmtree("venv", ignore_errors=True)
    
    # Step 3: Create venv
    if not run_command(f"{sys.executable} -m venv venv", "Creating virtual environment"):
        sys.exit(1)
    
    # Step 4: Determine pip path
    if os.name == 'nt':  # Windows
        pip_path = "venv\\Scripts\\pip.exe"
        python_path = "venv\\Scripts\\python.exe"
    else:  # Unix/Linux/Mac
        pip_path = "venv/bin/pip"
        python_path = "venv/bin/python"
    
    # Step 5: Upgrade pip
    if not run_command(f"{python_path} -m pip install --upgrade pip", "Upgrading pip"):
        print("⚠️  Warning: Failed to upgrade pip, continuing anyway...")
    
    # Step 6: Install requirements
    if not run_command(f"{pip_path} install --no-cache-dir -r requirements.txt", "Installing Python packages"):
        print("❌ ERROR: Failed to install requirements")
        sys.exit(1)
    
    # Step 7: Verify installations
    print("\n✓ Verifying installations...")
    packages = ['openai', 'fastapi', 'uvicorn', 'asyncpg']
    for package in packages:
        result = subprocess.run(f"{pip_path} show {package}", shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            version_line = [line for line in result.stdout.split('\n') if line.startswith('Version:')]
            if version_line:
                print(f"  ✓ {package}: {version_line[0].split(':')[1].strip()}")
        else:
            print(f"  ✗ {package}: NOT INSTALLED")
    
    # Step 8: Check for .env.local
    print("\n✓ Checking environment configuration...")
    if not Path(".env.local").exists():
        print("  ⚠️  .env.local not found!")
        print("  Creating .env.local from template...")
        with open(".env.local", "w") as f:
            f.write("OPENAI_API_KEY=your_openai_api_key_here\n")
            f.write("DATABASE_URL=\n")
        print("  📝 IMPORTANT: Edit backend/.env.local and add your OpenAI API key!")
    else:
        print("  ✓ .env.local found")
        # Check if it has the API key
        with open(".env.local", "r") as f:
            content = f.read()
            if "your_openai_api_key_here" in content or "OPENAI_API_KEY=" not in content:
                print("  ⚠️  WARNING: Please update your OPENAI_API_KEY in .env.local")
    
    # Success message
    print(f"""
    ╔════════════════════════════════════════════════════════╗
    ║               ✓ Setup Complete!                        ║
    ╚════════════════════════════════════════════════════════╝
    
    🚀 To start the server:
    
       Windows:
         venv\\Scripts\\activate
         python start.py
       
       Mac/Linux:
         source venv/bin/activate
         python start.py
    
    📝 Don't forget to update your .env.local file with real API keys!
    
    Server will run on: http://localhost:3001
    """)

if __name__ == "__main__":
    main()

