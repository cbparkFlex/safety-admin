const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('데이터베이스 시드 데이터를 삽입합니다...');

    // 샘플 작업자 데이터 삽입
    const sampleWorkers = [
      {
        name: '김철수',
        birthDate: new Date('2020-03-18'),
        equipmentId: 'A0001',
        workField: '용접',
        affiliation: 'Axis Building',
        healthPrecautions: '-'
      },
      {
        name: '김철수',
        birthDate: new Date('2020-03-18'),
        equipmentId: 'A0002',
        workField: '용접',
        affiliation: 'Axis Building',
        healthPrecautions: '-'
      },
      {
        name: '김철수',
        birthDate: new Date('2020-03-18'),
        equipmentId: 'A0003',
        workField: '용접',
        affiliation: 'Axis Building',
        healthPrecautions: '-'
      },
      {
        name: '김철수',
        birthDate: new Date('2020-03-18'),
        equipmentId: 'A0004',
        workField: '용접',
        affiliation: 'Axis Building',
        healthPrecautions: '-'
      },
      {
        name: '김철수',
        birthDate: new Date('2020-03-18'),
        equipmentId: 'A0005',
        workField: '용접',
        affiliation: 'Axis Building',
        healthPrecautions: '-'
      },
      {
        name: '김철수',
        birthDate: new Date('2020-03-18'),
        equipmentId: 'A0006',
        workField: '용접',
        affiliation: 'Axis Building',
        healthPrecautions: '-'
      },
      {
        name: '김철수',
        birthDate: new Date('2020-03-18'),
        equipmentId: 'A0007',
        workField: '용접',
        affiliation: 'Axis Building',
        healthPrecautions: '-'
      },
      {
        name: '김철수',
        birthDate: new Date('2020-03-18'),
        equipmentId: 'A0008',
        workField: '용접',
        affiliation: 'Axis Building',
        healthPrecautions: '-'
      }
    ];

    for (const workerData of sampleWorkers) {
      await prisma.worker.upsert({
        where: { equipmentId: workerData.equipmentId },
        update: {},
        create: workerData,
      });
    }

    // 샘플 센서 데이터 삽입
    const sampleSensors = [
      {
        sensorId: 'SENSOR001',
        name: '가스 센서 1',
        type: 'gas',
        location: '1층 작업장',
        status: 'active'
      },
      {
        sensorId: 'SENSOR002',
        name: '가스 센서 2',
        type: 'gas',
        location: '2층 작업장',
        status: 'active'
      },
      {
        sensorId: 'SENSOR003',
        name: '온도 센서 1',
        type: 'temperature',
        location: '1층 작업장',
        status: 'active'
      }
    ];

    for (const sensorData of sampleSensors) {
      await prisma.sensor.upsert({
        where: { sensorId: sensorData.sensorId },
        update: {},
        create: sensorData,
      });
    }

    // 샘플 CCTV 데이터 삽입
    const sampleCCTV = [
      {
        cameraId: 'CAM001',
        name: 'CCTV 카메라 1',
        location: '1층 입구',
        ipAddress: '192.168.1.100',
        status: 'active'
      },
      {
        cameraId: 'CAM002',
        name: 'CCTV 카메라 2',
        location: '2층 작업장',
        ipAddress: '192.168.1.101',
        status: 'active'
      },
      {
        cameraId: 'CAM003',
        name: 'CCTV 카메라 3',
        location: '주차장',
        ipAddress: '192.168.1.102',
        status: 'active'
      }
    ];

    for (const cctvData of sampleCCTV) {
      await prisma.cCTV.upsert({
        where: { cameraId: cctvData.cameraId },
        update: {},
        create: cctvData,
      });
    }

    // 관리자 계정 생성
    await prisma.administrator.upsert({
      where: { username: 'admin001' },
      update: {},
      create: {
        username: 'admin001',
        passwordHash: 'password123', // 실제로는 bcrypt로 해시해야 함
        name: '관리자 001',
        role: 'admin'
      },
    });

    console.log('시드 데이터 삽입이 완료되었습니다!');
    process.exit(0);
  } catch (error) {
    console.error('시드 데이터 삽입 중 오류가 발생했습니다:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
