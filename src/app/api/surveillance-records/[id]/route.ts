import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 개별 감시 기록 조회 (GET)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 ID입니다.' },
        { status: 400 }
      );
    }

    const record = await prisma.surveillanceRecord.findUnique({
      where: { id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: '감시 기록을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('감시 기록 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: '감시 기록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 감시 기록 업데이트 (PUT)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 ID입니다.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { type, title, message, location, severity, status, metadata } = body;

    const updateData: any = {};
    if (type !== undefined) updateData.type = type;
    if (title !== undefined) updateData.title = title;
    if (message !== undefined) updateData.message = message;
    if (location !== undefined) updateData.location = location;
    if (severity !== undefined) updateData.severity = severity;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
      }
    }
    if (metadata !== undefined) updateData.metadata = metadata ? JSON.stringify(metadata) : null;

    const record = await prisma.surveillanceRecord.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: record,
      message: '감시 기록이 업데이트되었습니다.',
    });
  } catch (error) {
    console.error('감시 기록 업데이트 실패:', error);
    return NextResponse.json(
      { success: false, error: '감시 기록 업데이트에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 감시 기록 삭제 (DELETE)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 ID입니다.' },
        { status: 400 }
      );
    }

    await prisma.surveillanceRecord.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '감시 기록이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('감시 기록 삭제 실패:', error);
    return NextResponse.json(
      { success: false, error: '감시 기록 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
