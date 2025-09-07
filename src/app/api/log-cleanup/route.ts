import { NextRequest, NextResponse } from "next/server";
import { LogCleanupService } from "@/lib/logCleanupService";

export async function POST(request: NextRequest) {
  try {
    console.log("로그 정리 API 호출");
    
    const summary = await LogCleanupService.cleanupLogs();
    
    return NextResponse.json({
      success: true,
      message: "로그 정리가 완료되었습니다.",
      summary
    });
    
  } catch (error: any) {
    console.error("로그 정리 실패:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "로그 정리 중 오류가 발생했습니다.", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'statistics') {
      const statistics = await LogCleanupService.getLogStatistics();
      return NextResponse.json({ statistics });
    } else if (type === 'policies') {
      const policies = await LogCleanupService.getRetentionPolicies();
      return NextResponse.json({ policies });
    } else {
      return NextResponse.json(
        { error: "잘못된 요청입니다. type=statistics 또는 type=policies를 사용하세요." },
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error("로그 정보 조회 실패:", error);
    return NextResponse.json(
      { 
        error: "로그 정보 조회 중 오류가 발생했습니다.", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
