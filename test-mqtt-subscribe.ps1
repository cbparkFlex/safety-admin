# MQTT 메시지 구독하여 실제 내용 확인
$mosquittoSub = "C:\Program Files\mosquitto\mosquitto_sub.exe"
$topic = "safety/beacon/+"

Write-Host "MQTT 메시지 구독 시작..."
Write-Host "Topic: $topic"
Write-Host "실제 메시지 내용을 확인하세요:"

& $mosquittoSub -h 192.168.31.83 -t $topic -v
