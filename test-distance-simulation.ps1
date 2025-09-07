# 거리 변화 시뮬레이션 테스트
$mosquittoPub = "C:\Program Files\mosquitto\mosquitto_pub.exe"
$topic = "safety/beacon/gateway_1"

Write-Host "거리 변화 시뮬레이션 시작..."
Write-Host "등록된 ID 사용: BEACON_BC5729055F74, GW_1757201723680"

# 거리별 RSSI 시뮬레이션 (TX Power: -59 기준)
$testScenarios = @(
    @{rssi = -50; expectedDistance = "0.35m"; description = "매우 가까움 (위험)"},
    @{rssi = -59; expectedDistance = "1.00m"; description = "가까움 (위험)"},
    @{rssi = -65; expectedDistance = "2.00m"; description = "중간 거리 (위험)"},
    @{rssi = -70; expectedDistance = "3.55m"; description = "주의 거리 (경고)"},
    @{rssi = -75; expectedDistance = "5.62m"; description = "안전 거리 (안전)"}
)

foreach ($scenario in $testScenarios) {
    $beaconMessage = @{
        beaconId = "BEACON_BC5729055F74"
        gatewayId = "GW_1757201723680"
        rssi = $scenario.rssi
        timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        uuid = "12345678-1234-1234-1234-123456789abc"
        major = 1
        minor = 1
    } | ConvertTo-Json
    
    Write-Host "RSSI: $($scenario.rssi) dBm - 예상 거리: $($scenario.expectedDistance) - $($scenario.description)"
    
    & $mosquittoPub -h 192.168.31.83 -t $topic -m $beaconMessage
    
    Start-Sleep -Seconds 3
}

Write-Host "시뮬레이션 완료!"
