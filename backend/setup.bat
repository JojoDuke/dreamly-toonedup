@echo off
echo ====================================================
echo Setting up Toonly AI Python Backend
echo ====================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.12 or higher
    pause
    exit /b 1
)

echo Step 1: Checking for existing virtual environment...
if exist venv (
    echo Found existing venv. Removing it...
    rmdir /s /q venv
)

echo.
echo Step 2: Creating fresh virtual environment...
python -m venv venv
if %errorlevel% neq 0 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo.
echo Step 3: Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Step 4: Upgrading pip...
python -m pip install --upgrade pip

echo.
echo Step 5: Installing requirements...
pip install --no-cache-dir -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install requirements
    pause
    exit /b 1
)

echo.
echo Step 6: Verifying installation...
pip show openai httpx fastapi

echo.
echo Step 7: Checking for .env.local file...
if not exist .env.local (
    echo WARNING: .env.local file not found!
    echo Creating template .env.local file...
    (
        echo OPENAI_API_KEY=your_openai_api_key_here
        echo DATABASE_URL=your_postgresql_url_here
    ) > .env.local
    echo.
    echo IMPORTANT: Please edit backend\.env.local and add your actual API keys!
    echo Then run: python start.py
    pause
    exit /b 0
)

echo.
echo ====================================================
echo Setup Complete!
echo ====================================================
echo.
echo To start the server:
echo   1. Make sure you're in the backend directory
echo   2. Activate venv: venv\Scripts\activate
echo   3. Run: python start.py
echo.
echo Starting server now...
echo.

python start.py

