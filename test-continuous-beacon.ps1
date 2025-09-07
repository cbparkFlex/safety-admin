# 연속적인 BLE Beacon 테스트 메시지 발송
$mosquittoPub = "C:\Program Files\mosquitto\mosquitto_pub.exe"
$topic = "safety/beacon/gateway_1"

Write-Host "연속적인 BLE Beacon 테스트 시작..."
Write-Host "거리 변화 시뮬레이션: 10m → 5m → 2m → 1m"
Write-Host "Ctrl+C로 중지하세요"

$rssiValues = @(-50, -55, -60, -65, -70, -75, -80, -85, -90, -95)
$distanceLabels = @("10m", "8m", "6m", "5m", "4m", "3m", "2m", "1.5m", "1m", "0.5m")

for ($i = 0; $i -lt $rssiValues.Length; $i++) {
    $rssi = $rssiValues[$i]
    $distance = $distanceLabels[$i]
    
    $beaconMessage = @{
        beaconId = "BEACON_AABBCCDDEEFF"
        gatewayId = "GW_001"
        rssi = $rssi
        timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        uuid = "12345678-1234-1234-1234-123456789abc"
        major = 1
        minor = 1
    } | ConvertTo-Json
    
    Write-Host "거리: $distance (RSSI: $rssi dBm) - 메시지 발송"
    
    & $mosquittoPub -h localhost -t $topic -m $beaconMessage
    
    Start-Sleep -Seconds 3
}

Write-Host "테스트 완료!"
