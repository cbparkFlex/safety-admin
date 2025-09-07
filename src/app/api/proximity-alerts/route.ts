import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const alerts = await prisma.proximityAlert.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        beacon: {
          select: {
            name: true,
            location: true,
          }
        },
        gateway: {
          select: {
            name: true,
            location: true,
          }
        },
        worker: {
          select: {
            name: true,
          }
        }
      }
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("근접 알림 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "근접 알림 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // 모든 근접 알림 데이터 삭제
    const result = await prisma.proximityAlert.deleteMany({});
    
    console.log(`근접 알림 데이터 삭제 완료: ${result.count}개 레코드 삭제됨`);
    
    return NextResponse.json({
      message: "모든 근접 알림 데이터가 삭제되었습니다.",
      deletedCount: result.count
    });
  } catch (error) {
    console.error("근접 알림 데이터 삭제 실패:", error);
    return NextResponse.json(
      { error: "근접 알림 데이터를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
