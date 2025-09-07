# 올바른 Beacon 데이터 형식으로 테스트
$mosquittoPub = "C:\Program Files\mosquitto\mosquitto_pub.exe"
$topic = "safety/beacon/gateway_1"

Write-Host "올바른 Beacon 데이터 테스트 시작..."

# 데이터베이스에 등록된 정확한 ID 사용
$beaconMessage = @{
    beaconId = "BEACON_AABBCCDDEE01"  # 등록한 Beacon ID와 일치
    gatewayId = "GW_001"              # 등록한 Gateway ID와 일치
    rssi = -65
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    uuid = "12345678-1234-1234-1234-123456789abc"
    major = 1
    minor = 1
} | ConvertTo-Json

Write-Host "메시지 발송:"
Write-Host $beaconMessage

& $mosquittoPub -h 192.168.31.83 -t $topic -m $beaconMessage

Write-Host "메시지 발송 완료!"
