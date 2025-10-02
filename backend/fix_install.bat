@echo off
echo ====================================================
echo FORCE REINSTALL - Fixing OpenAI Package Issues
echo ====================================================
echo.

echo Step 1: Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Step 2: Uninstalling ALL packages...
pip freeze > temp_packages.txt
pip uninstall -y -r temp_packages.txt
del temp_packages.txt

echo.
echo Step 3: Clearing pip cache...
pip cache purge

echo.
echo Step 4: Upgrading pip...
python -m pip install --upgrade pip

echo.
echo Step 5: Installing packages one by one...
pip install --no-cache-dir fastapi==0.104.1
pip install --no-cache-dir "uvicorn[standard]==0.24.0"
pip install --no-cache-dir python-dotenv==1.0.0
pip install --no-cache-dir httpx==0.25.2
pip install --no-cache-dir openai==1.51.0
pip install --no-cache-dir python-multipart==0.0.6
pip install --no-cache-dir pydantic==2.5.0
pip install --no-cache-dir asyncpg==0.29.0

echo.
echo Step 6: Verifying installation...
pip show openai httpx

echo.
echo ====================================================
echo Fix Complete! 
echo ====================================================
echo.
echo Now starting server...
echo.

python start.py

