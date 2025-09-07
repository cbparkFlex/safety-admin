# 실제 Beacon 데이터로 테스트 메시지 발송
$mosquittoPub = "C:\Program Files\mosquitto\mosquitto_pub.exe"
$topic = "safety/beacon/gateway_1"

Write-Host "실제 Beacon 데이터로 테스트 메시지 발송..."

# Beacon 1 (KBPro_444747) - Current RSSI: -49dBm
$beacon1Message = @{
    beaconId = "BEACON_BC5729055F74"      # 등록된 Beacon ID (MAC 기반)
    gatewayId = "GW_1757201723680"        # 등록된 Gateway ID
    rssi = -49                            # 실제 Current RSSI
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    uuid = "7777772E-6B6B-6D63-6E2E-636F6D000001"  # 실제 UUID
    major = 6                             # 실제 Major
    minor = 51531                         # 실제 Minor
} | ConvertTo-Json

Write-Host "Beacon 1 (KBPro_444747) 메시지:"
Write-Host $beacon1Message

& $mosquittoPub -h 192.168.31.83 -t $topic -m $beacon1Message

Start-Sleep -Seconds 2

# Beacon 2 (KBPro_444721) - Current RSSI: -66dBm
$beacon2Message = @{
    beaconId = "BEACON_BC5729055F5A"      # MAC: BC:57:29:05:5F:5A 기반 ID
    gatewayId = "GW_1757201723680"        # 등록된 Gateway ID
    rssi = -66                            # 실제 Current RSSI
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    uuid = "7777772E-6B6B-6D63-6E2E-636F6D000001"  # 실제 UUID
    major = 6                             # 실제 Major
    minor = 51505                         # 실제 Minor
} | ConvertTo-Json

Write-Host "Beacon 2 (KBPro_444721) 메시지:"
Write-Host $beacon2Message

& $mosquittoPub -h 192.168.31.83 -t $topic -m $beacon2Message

Write-Host "실제 Beacon 데이터 테스트 완료!"
