# Safety Admin Development Server Start Script

Write-Host "Starting Safety Admin development server..." -ForegroundColor Green

# Check MQTT Broker status
Write-Host "Checking MQTT Broker status..." -ForegroundColor Cyan
$mqttStatus = netstat -an | findstr :1883

if ($mqttStatus -match "0\.0\.0\.0:1883") {
    Write-Host "MQTT Broker is running normally" -ForegroundColor Green
} else {
    Write-Host "MQTT Broker is not running!" -ForegroundColor Red
    Write-Host "Please run 'start-mqtt.ps1' as Administrator first" -ForegroundColor Yellow
    Write-Host "Or run these commands manually:" -ForegroundColor Yellow
    Write-Host "taskkill /f /im mosquitto.exe" -ForegroundColor Gray
    Write-Host "& 'C:\Program Files\mosquitto\mosquitto.exe' -c mosquitto-custom.conf -v" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Press Enter after starting MQTT Broker"
}

# Start development server
Write-Host "`nStarting development server..." -ForegroundColor Green
npm run dev
