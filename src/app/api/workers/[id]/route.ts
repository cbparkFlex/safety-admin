import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workerId = parseInt(id);
    
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workerId = parseInt(id);
    
    if (isNaN(workerId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 작업자 ID입니다.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, birthDate, equipmentId, workField, affiliation, healthPrecautions, mobilePhone, emergencyContact } = body;

    // 필수 필드 검증
    if (!name || !birthDate || !equipmentId || !workField || !affiliation) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
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

    // Beacon 존재 여부 확인
    const beacon = await prisma.beacon.findUnique({
      where: {
        beaconId: equipmentId,
      },
    });

    if (!beacon) {
      return NextResponse.json(
        { success: false, error: '선택한 Beacon을 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    // 작업자 정보 업데이트
    const updatedWorker = await prisma.worker.update({
      where: {
        id: workerId,
      },
      data: {
        name: name.trim(),
        birthDate: new Date(birthDate),
        equipmentId: equipmentId,
        workField: workField.trim(),
        affiliation: affiliation.trim(),
        healthPrecautions: healthPrecautions?.trim() || null,
        mobilePhone: mobilePhone?.trim() || null,
        emergencyContact: emergencyContact?.trim() || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: '작업자 정보가 성공적으로 수정되었습니다.',
      data: updatedWorker 
    });
  } catch (error) {
    console.error('Error updating worker:', error);
    return NextResponse.json(
      { success: false, error: '작업자 정보 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workerId = parseInt(id);
    
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
