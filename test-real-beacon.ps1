# 실제 Beacon 데이터 시뮬레이션
$mosquittoPub = "C:\Program Files\mosquitto\mosquitto_pub.exe"
$topic = "safety/beacon/gateway_1"

Write-Host "실제 Beacon 데이터 시뮬레이션 시작..."
Write-Host "Topic: $topic"
Write-Host "Ctrl+C로 중지하세요"

# 다양한 거리 시뮬레이션
$testScenarios = @(
    @{rssi = -50; distance = "10m"; description = "안전 거리"},
    @{rssi = -60; distance = "5m"; description = "근접 경계"},
    @{rssi = -70; distance = "2m"; description = "위험 거리"},
    @{rssi = -80; distance = "1m"; description = "매우 위험"}
)

while ($true) {
    foreach ($scenario in $testScenarios) {
        $beaconMessage = @{
            beaconId = "BEACON_AABBCCDDEE01"
            gatewayId = "GW_001"
            rssi = $scenario.rssi
            timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
            uuid = "12345678-1234-1234-1234-123456789abc"
            major = 1
            minor = 1
        } | ConvertTo-Json
        
        Write-Host "거리: $($scenario.distance) (RSSI: $($scenario.rssi) dBm) - $($scenario.description)"
        
        & $mosquittoPub -h 192.168.31.83 -t $topic -m $beaconMessage
        
        Start-Sleep -Seconds 5
    }
    
    Write-Host "--- 시나리오 완료, 다시 시작 ---"
    Start-Sleep -Seconds 2
}
