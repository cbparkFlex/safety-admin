import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 감시 기록 조회 (GET)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');

    const where: any = {};
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const [records, total] = await Promise.all([
      prisma.surveillanceRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.surveillanceRecord.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: records,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('감시 기록 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: '감시 기록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 감시 기록 생성 (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, message, location, severity = 'warning', source = 'cctv', metadata } = body;

    if (!type || !title || !message || !location) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const record = await prisma.surveillanceRecord.create({
      data: {
        type,
        title,
        message,
        location,
        severity,
        source,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: record,
      message: '감시 기록이 생성되었습니다.',
    });
  } catch (error) {
    console.error('감시 기록 생성 실패:', error);
    return NextResponse.json(
      { success: false, error: '감시 기록 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 감시 기록 일괄 삭제 (DELETE)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await prisma.surveillanceRecord.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    // SQLite autoincrement 시퀀스 리셋
    await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name='surveillance_records'`;

    return NextResponse.json({
      success: true,
      message: `${result.count}개의 감시 기록이 삭제되었습니다.`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('감시 기록 삭제 실패:', error);
    return NextResponse.json(
      { success: false, error: '감시 기록 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
