@echo off
chcp 65001 >nul 2>&1

echo ========================================
echo     Safety Admin 서버 시작
echo ========================================
echo.

REM 현재 디렉토리로 이동
cd /d "%~dp0"

echo [INFO] MQTT Broker를 시작합니다...
start "MQTT Broker" cmd /k "mqtt.bat"

echo [INFO] MQTT Broker 시작을 기다립니다...
timeout /t 5 /nobreak >nul

echo [INFO] Safety Admin 서버를 시작합니다...
npm run start

pause
