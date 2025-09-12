@echo off
REM UTF-8 인코딩 설정
chcp 65001 >nul 2>&1

echo ========================================
echo        MQTT Broker 시작 스크립트
echo ========================================
echo.

REM 설정 파일 존재 확인
if not exist "mosquitto-custom.conf" (
    echo [ERROR] mosquitto-custom.conf 파일을 찾을 수 없습니다.
    echo 현재 디렉토리에 설정 파일이 있는지 확인해주세요.
    echo.
    pause
    exit /b 1
)

REM Mosquitto 실행 파일 존재 확인
if not exist "C:\Program Files\mosquitto\mosquitto.exe" (
    echo [ERROR] Mosquitto가 설치되지 않았거나 경로가 잘못되었습니다.
    echo C:\Program Files\mosquitto\mosquitto.exe 파일을 확인해주세요.
    echo.
    pause
    exit /b 1
)

echo [INFO] 설정 파일: mosquitto-custom.conf
echo [INFO] Mosquitto 경로: C:\Program Files\mosquitto\mosquitto.exe
echo.

REM 기존 MQTT 프로세스 종료
echo [INFO] 모든 mosquitto 프로세스를 종료합니다...
taskkill /F /IM mosquitto.exe >NUL 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] 모든 mosquitto 프로세스가 종료되었습니다.
) else (
    echo [INFO] 실행 중인 mosquitto 프로세스가 없습니다.
)

REM 포트 1883 사용 프로세스 확인 및 종료
echo [INFO] 포트 1883을 사용하는 프로세스를 확인합니다...
setlocal enabledelayedexpansion
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :1883') do (
    echo [INFO] 포트 1883을 사용하는 프로세스 발견, PID: %%a
    taskkill /F /PID %%a >NUL 2>&1
    if !errorlevel! equ 0 (
        echo [SUCCESS] PID %%a 프로세스가 성공적으로 종료되었습니다.
    ) else (
        echo [WARNING] PID %%a 프로세스 종료에 실패했습니다.
    )
)
endlocal

REM 충분한 대기 시간
echo [INFO] 프로세스 종료 후 대기 중...
timeout /t 3 /nobreak >NUL

REM 포트 1883 다시 확인
echo [INFO] 포트 1883 상태를 확인합니다...
netstat -ano | findstr :1883 >NUL
if %errorlevel% equ 0 (
    echo [WARNING] 포트 1883이 여전히 사용 중입니다. 강제 해제를 시도합니다...
    timeout /t 2 /nobreak >NUL
) else (
    echo [SUCCESS] 포트 1883이 이제 사용 가능합니다.
)
echo.

echo [INFO] MQTT Broker를 시작합니다...
echo [INFO] 종료하려면 Ctrl+C를 누르세요.
echo.

REM MQTT Broker 실행
"C:\Program Files\mosquitto\mosquitto.exe" -c mosquitto-custom.conf -v

REM 오류 발생 시 일시 정지
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo [ERROR] MQTT Broker가 오류와 함께 종료되었습니다.
    echo [ERROR] 오류 코드: %errorlevel%
    echo.
    echo [TROUBLESHOOTING]
    echo 1. 다른 MQTT 브로커가 실행 중인지 확인하세요
    echo 2. 포트 1883이 다른 애플리케이션에서 사용 중인지 확인하세요
    echo 3. 관리자 권한으로 실행해보세요
    echo 4. mosquitto-custom.conf 설정 파일을 확인하세요
    echo ========================================
    echo.
    pause
) else (
    echo.
    echo [SUCCESS] MQTT Broker가 정상적으로 종료되었습니다.
    echo.
)
