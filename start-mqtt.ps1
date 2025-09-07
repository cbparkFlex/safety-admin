# MQTT Broker Start Script
# Run as Administrator

Write-Host "Starting MQTT Broker..." -ForegroundColor Green

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
    Write-Host "Broker address: 192.168.31.83:1883" -ForegroundColor Cyan
    Write-Host "Now run 'npm run dev'" -ForegroundColor Yellow
} catch {
    Write-Host "MQTT Broker start failed: $_" -ForegroundColor Red
    Write-Host "Please run as Administrator" -ForegroundColor Red
}

# Check port status
Write-Host "`nChecking port status..." -ForegroundColor Cyan
netstat -an | findstr :1883
