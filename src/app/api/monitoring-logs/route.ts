import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    console.log("모니터링 로그 삭제 요청 시작");
    
    // 모든 모니터링 로그 삭제
    const deleteResult = await prisma.monitoringLog.deleteMany({});
    
    console.log(`모니터링 로그 삭제 완료: ${deleteResult.count}개 삭제`);
    
    return NextResponse.json({
      message: "모니터링 로그가 성공적으로 삭제되었습니다.",
      deletedCount: deleteResult.count
    });
    
  } catch (error: any) {
    console.error("모니터링 로그 삭제 실패:", error);
    return NextResponse.json(
      { error: "모니터링 로그 삭제 중 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    console.log(`모니터링 로그 조회: limit=${limit}, offset=${offset}`);
    
    // 모니터링 로그 조회
    const logs = await prisma.monitoringLog.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
    
    // 전체 개수 조회
    const totalCount = await prisma.monitoringLog.count();
    
    console.log(`모니터링 로그 조회 완료: ${logs.length}개 (전체: ${totalCount}개)`);
    
    return NextResponse.json({
      logs,
      totalCount,
      hasMore: offset + logs.length < totalCount
    });
    
  } catch (error: any) {
    console.error("모니터링 로그 조회 실패:", error);
    return NextResponse.json(
      { error: "모니터링 로그 조회 중 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}
