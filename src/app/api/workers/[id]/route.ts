import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workerId = parseInt(params.id);
    
    if (isNaN(workerId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 작업자 ID입니다.' },
        { status: 400 }
      );
    }

    const worker = await prisma.worker.findUnique({
      where: {
        id: workerId,
      },
    });

    if (!worker) {
      return NextResponse.json(
        { success: false, error: '작업자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: worker 
    });
  } catch (error) {
    console.error('Error fetching worker:', error);
    return NextResponse.json(
      { success: false, error: '작업자 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workerId = parseInt(params.id);
    
    if (isNaN(workerId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 작업자 ID입니다.' },
        { status: 400 }
      );
    }

    // 작업자 존재 여부 확인
    const existingWorker = await prisma.worker.findUnique({
      where: {
        id: workerId,
      },
    });

    if (!existingWorker) {
      return NextResponse.json(
        { success: false, error: '작업자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 작업자 삭제
    await prisma.worker.delete({
      where: {
        id: workerId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: '작업자가 성공적으로 삭제되었습니다.' 
    });
  } catch (error) {
    console.error('Error deleting worker:', error);
    return NextResponse.json(
      { success: false, error: '작업자 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
