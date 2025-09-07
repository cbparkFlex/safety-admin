# 정확한 등록 데이터로 테스트 메시지 발송
$mosquittoPub = "C:\Program Files\mosquitto\mosquitto_pub.exe"
$topic = "safety/beacon/gateway_1"

Write-Host "정확한 등록 데이터로 테스트 메시지 발송..."

# 브라우저 Console에서 확인한 정확한 데이터 사용
$beaconMessage = @{
    beaconId = "BEACON_BC5729055F74"      # 등록된 Beacon ID
    gatewayId = "GW_1757201723680"        # 등록된 Gateway ID
    rssi = -59
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    uuid = "12345678-1234-1234-1234-123456789abc"  # 등록된 UUID와 일치해야 함
    major = 1                              # 등록된 Major와 일치해야 함
    minor = 1                              # 등록된 Minor와 일치해야 함
} | ConvertTo-Json

Write-Host "발송할 메시지:"
Write-Host $beaconMessage

& $mosquittoPub -h 192.168.31.83 -t $topic -m $beaconMessage

Write-Host "메시지 발송 완료!"
