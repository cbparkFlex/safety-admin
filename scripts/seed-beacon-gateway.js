const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedBeaconAndGateway() {
  try {
    console.log('🚀 Beacon과 Gateway 초기 데이터 시드 시작...');

    // Beacon 초기 데이터
    const beaconData = {
      beaconId: 'KBPro_444721',
      name: 'KBPro_444721',
      macAddress: 'BC5729055F5A',
      uuid: '7777772E-6B6B-6D63-6E2E-636F6D0000001',
      major: 6,
      minor: 51531,
      txPower: -59, // 기본 TX Power 값
      location: 'A동',
      status: 'active'
    };

    // Gateway 초기 데이터
    const gatewayData = {
      gatewayId: 'GW_282C02227A67',
      name: 'GW_282C02227A67',
      location: 'A',
      ipAddress: '192.168.1.100',
      mqttTopic: 'safety/beacon/gateway_1',
      status: 'active',
      proximityThreshold: 5.0,
      autoVibration: false
    };

    // 기존 데이터 확인 및 생성
    let beacon = await prisma.beacon.findUnique({
      where: { beaconId: beaconData.beaconId }
    });

    if (!beacon) {
      console.log('📡 Beacon 데이터 생성 중...');
      beacon = await prisma.beacon.create({
        data: beaconData
      });
      console.log(`✅ Beacon 생성 완료: ${beacon.name} (${beacon.beaconId})`);
    } else {
      console.log(`ℹ️ Beacon 이미 존재: ${beacon.name} (${beacon.beaconId})`);
    }

    let gateway = await prisma.gateway.findUnique({
      where: { gatewayId: gatewayData.gatewayId }
    });

    if (!gateway) {
      console.log('🌐 Gateway 데이터 생성 중...');
      gateway = await prisma.gateway.create({
        data: gatewayData
      });
      console.log(`✅ Gateway 생성 완료: ${gateway.name} (${gateway.gatewayId})`);
    } else {
      console.log(`ℹ️ Gateway 이미 존재: ${gateway.name} (${gateway.gatewayId})`);
    }

    // Beacon과 Gateway 연결 (Beacon의 gatewayId 업데이트)
    if (beacon.gatewayId !== gateway.gatewayId) {
      console.log('🔗 Beacon과 Gateway 연결 중...');
      beacon = await prisma.beacon.update({
        where: { beaconId: beacon.beaconId },
        data: { gatewayId: gateway.gatewayId }
      });
      console.log(`✅ Beacon과 Gateway 연결 완료: ${beacon.name} ↔ ${gateway.name}`);
    } else {
      console.log(`ℹ️ Beacon과 Gateway 이미 연결됨: ${beacon.name} ↔ ${gateway.name}`);
    }

    console.log('🎉 Beacon과 Gateway 초기 데이터 시드 완료!');
    
    // 생성된 데이터 요약 출력
    console.log('\n📊 생성된 데이터 요약:');
    console.log('Beacon:', {
      id: beacon.id,
      beaconId: beacon.beaconId,
      name: beacon.name,
      macAddress: beacon.macAddress,
      uuid: beacon.uuid,
      major: beacon.major,
      minor: beacon.minor,
      txPower: beacon.txPower,
      location: beacon.location,
      gatewayId: beacon.gatewayId
    });
    
    console.log('Gateway:', {
      id: gateway.id,
      gatewayId: gateway.gatewayId,
      name: gateway.name,
      location: gateway.location,
      ipAddress: gateway.ipAddress,
      mqttTopic: gateway.mqttTopic,
      proximityThreshold: gateway.proximityThreshold,
      autoVibration: gateway.autoVibration
    });

  } catch (error) {
    console.error('❌ Beacon과 Gateway 시드 실패:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트가 직접 실행될 때만 시드 함수 호출
if (require.main === module) {
  seedBeaconAndGateway()
    .then(() => {
      console.log('✅ 시드 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 시드 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { seedBeaconAndGateway };
