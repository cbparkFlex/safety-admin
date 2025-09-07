# Safety Admin System Start Script
# Run as Administrator

Write-Host "=== Safety Admin System Start ===" -ForegroundColor Magenta

# 1. Start MQTT Broker
Write-Host "`n1. Starting MQTT Broker..." -ForegroundColor Green

# Kill existing Mosquitto process
try {
    taskkill /f /im mosquitto.exe 2>$null
    Write-Host "Existing Mosquitto process terminated" -ForegroundColor Yellow
} catch {
    Write-Host "No existing process or already terminated" -ForegroundColor Gray
}

# Wait a moment
Start-Sleep -Seconds 2

# Start Mosquitto
try {
    Start-Process -FilePath "C:\Program Files\mosquitto\mosquitto.exe" -ArgumentList "-c", "mosquitto-custom.conf", "-v" -WindowStyle Hidden
    Write-Host "MQTT Broker started successfully!" -ForegroundColor Green
} catch {
    Write-Host "MQTT Broker start failed: $_" -ForegroundColor Red
    Write-Host "Please run as Administrator" -ForegroundColor Red
    exit 1
}

# Check port status
Write-Host "`nChecking port status..." -ForegroundColor Cyan
netstat -an | findstr :1883

# 2. Start development server
Write-Host "`n2. Starting Safety Admin development server..." -ForegroundColor Green
Write-Host "Access http://localhost:3000 in your browser" -ForegroundColor Yellow
Write-Host "Check MQTT connection on proximity alerts page" -ForegroundColor Yellow

# Start development server
npm run dev
