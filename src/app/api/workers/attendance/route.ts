import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 출근 상태인 작업자들을 가져옴 (예: 오늘 출근한 작업자들)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendanceWorkers = await prisma.worker.findMany({
      where: {
        // 출근 시간이 오늘인 작업자들 (임시로 모든 작업자를 출근자로 간주)
        // 실제로는 출근 테이블이나 상태 필드가 필요할 수 있습니다
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        id: true,
        name: true,
        workField: true,
        equipmentId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 임시로 모든 작업자를 출근자로 표시 (실제 구현 시 출근 상태 필드 필요)
    const allWorkers = await prisma.worker.findMany({
      select: {
        id: true,
        name: true,
        workField: true,
        equipmentId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 출근 시간을 포맷팅하여 반환
    const formattedWorkers = allWorkers.map(worker => ({
      ...worker,
      checkInTime: worker.createdAt.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    }));

    return NextResponse.json({ 
      success: true, 
      data: formattedWorkers,
      total: formattedWorkers.length 
    });
  } catch (error) {
    console.error('Error fetching attendance workers:', error);
    return NextResponse.json(
      { success: false, error: '출근 작업자 데이터를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
