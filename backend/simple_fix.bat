@echo off
echo Fixing OpenAI package compatibility...
echo.

call venv\Scripts\activate.bat

echo Uninstalling problematic packages...
pip uninstall -y openai httpx

echo.
echo Clearing cache...
pip cache purge

echo.
echo Installing correct versions...
pip install --no-cache-dir httpx==0.25.2
pip install --no-cache-dir openai==1.51.0

echo.
echo Verification:
pip show openai | findstr "Version"
pip show httpx | findstr "Version"

echo.
echo Done! Try running: python start.py
pause

