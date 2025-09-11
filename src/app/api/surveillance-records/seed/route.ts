import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 샘플 감시 기록 데이터 생성
export async function POST() {
  try {
    const sampleRecords = [
      {
        type: 'safety_equipment',
        title: '안전모 미착용 감지',
        message: 'A동 4번 센서에서 안전모를 착용하지 않은 작업자가 감지되었습니다.',
        location: 'A동 4번 센서',
        severity: 'warning',
        status: 'active',
        source: 'cctv',
        metadata: JSON.stringify({ confidence: 0.95, workerCount: 1 }),
      },
      {
        type: 'safety_equipment',
        title: '안전모 착용 확인',
        message: 'B동 6번 센서에서 모든 작업자가 안전모를 정상적으로 착용하고 있습니다.',
        location: 'B동 6번 센서',
        severity: 'info',
        status: 'resolved',
        source: 'cctv',
        metadata: JSON.stringify({ confidence: 0.98, workerCount: 3 }),
      },
      {
        type: 'fire_explosion',
        title: 'LPG 저장소 화재 위험 감지',
        message: 'LPG 저장소 주변에서 비정상적인 온도 상승이 감지되었습니다.',
        location: 'LPG 저장소',
        severity: 'critical',
        status: 'active',
        source: 'sensor',
        metadata: JSON.stringify({ temperature: 45.2, threshold: 40.0 }),
      },
      {
        type: 'gas_leak',
        title: '가스 누출 감지',
        message: '작업장 내 LPG 배관 연결부에서 가스 누출이 감지되었습니다.',
        location: '작업장 내 LPG 배관 연결부',
        severity: 'danger',
        status: 'acknowledged',
        source: 'sensor',
        metadata: JSON.stringify({ gasLevel: 150, threshold: 100 }),
      },
      {
        type: 'safety_equipment',
        title: '안전장구 착용 상태 정상',
        message: 'C동 2번 센서에서 모든 작업자의 안전장구 착용 상태가 정상입니다.',
        location: 'C동 2번 센서',
        severity: 'info',
        status: 'resolved',
        source: 'cctv',
        metadata: JSON.stringify({ confidence: 0.92, workerCount: 5 }),
      },
      {
        type: 'fire_explosion',
        title: '화재 감지 시스템 정상',
        message: '화재 감지 시스템이 정상적으로 작동하고 있습니다.',
        location: '전체 작업장',
        severity: 'info',
        status: 'resolved',
        source: 'sensor',
        metadata: JSON.stringify({ systemStatus: 'normal' }),
      },
      {
        type: 'gas_leak',
        title: '가스 누출 위험 해제',
        message: '이전에 감지된 가스 누출이 해결되었습니다.',
        location: '작업장 내 LPG 배관 연결부',
        severity: 'info',
        status: 'resolved',
        source: 'sensor',
        metadata: JSON.stringify({ gasLevel: 20, threshold: 100 }),
      },
      {
        type: 'safety_equipment',
        title: '안전모 미착용 알림',
        message: 'D동 1번 센서에서 안전모를 착용하지 않은 작업자가 감지되었습니다.',
        location: 'D동 1번 센서',
        severity: 'warning',
        status: 'active',
        source: 'cctv',
        metadata: JSON.stringify({ confidence: 0.88, workerCount: 1 }),
      },
    ];

    // 기존 샘플 데이터 삭제 (선택사항)
    await prisma.surveillanceRecord.deleteMany({
      where: {
        source: { in: ['cctv', 'sensor'] },
      },
    });

    // 새 샘플 데이터 생성
    const createdRecords = await prisma.surveillanceRecord.createMany({
      data: sampleRecords,
    });

    return NextResponse.json({
      success: true,
      message: `${createdRecords.count}개의 샘플 감시 기록이 생성되었습니다.`,
      count: createdRecords.count,
    });
  } catch (error) {
    console.error('샘플 데이터 생성 실패:', error);
    return NextResponse.json(
      { success: false, error: '샘플 데이터 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
