# 등록된 ID와 일치하는 테스트 메시지 발송
$mosquittoPub = "C:\Program Files\mosquitto\mosquitto_pub.exe"
$topic = "safety/beacon/gateway_1"

Write-Host "등록된 ID와 일치하는 테스트 메시지 발송..."

# 등록된 실제 ID 사용
$beaconMessage = @{
    beaconId = "BEACON_BC5729055F74"      # 등록된 실제 Beacon ID
    gatewayId = "GW_1757201723680"        # 등록된 실제 Gateway ID
    rssi = -59
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    uuid = "12345678-1234-1234-1234-123456789abc"
    major = 1
    minor = 1
} | ConvertTo-Json

Write-Host "메시지 내용:"
Write-Host $beaconMessage

& $mosquittoPub -h 192.168.31.83 -t $topic -m $beaconMessage

Write-Host "메시지 발송 완료!"
