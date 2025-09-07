# BLE Beacon 테스트 메시지 발송 스크립트
$mosquittoPub = "C:\Program Files\mosquitto\mosquitto_pub.exe"
$topic = "safety/beacon/gateway_1"

# 테스트 Beacon 메시지 데이터
$beaconMessage = @{
    beaconId = "BEACON_AABBCCDDEEFF"
    gatewayId = "GW_001"
    rssi = -65
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    uuid = "12345678-1234-1234-1234-123456789abc"
    major = 1
    minor = 1
} | ConvertTo-Json

Write-Host "BLE Beacon 테스트 메시지 발송 중..."
Write-Host "Topic: $topic"
Write-Host "Message: $beaconMessage"

# 메시지 발송
& $mosquittoPub -h localhost -t $topic -m $beaconMessage

Write-Host "메시지 발송 완료!"
