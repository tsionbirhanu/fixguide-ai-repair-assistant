@echo off
cd /d "%~dp0"
echo.
echo ========================================
echo   FixGuide AI Backend Server
echo ========================================
echo.
echo Starting server at http://127.0.0.1:8000
echo API Documentation: http://127.0.0.1:8000/docs
echo.
echo WARNING: DO NOT CLOSE THIS WINDOW!
echo    The server will stop if you close it.
echo.
echo ========================================
echo.

call venv\Scripts\activate.bat
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

pause
