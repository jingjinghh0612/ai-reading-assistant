@echo off
setlocal

cd /d "%~dp0\.."

set "PREVIEW_URL=http://127.0.0.1:5173/reader-prototype"

echo Opening AI Reading reader prototype preview...
echo %PREVIEW_URL%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing '%PREVIEW_URL%' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"

if errorlevel 1 (
  echo Dev server is not responding. Starting Vite on port 5173...
  start "AI Reading Dev Server" cmd /k "cd /d ""%cd%"" && npm run dev -- --host 127.0.0.1 --port 5173"
  echo Waiting for dev server...
  timeout /t 5 /nobreak >nul
)

start "" "%PREVIEW_URL%"

endlocal
