import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CCTV 스트림 목록 조회
export async function GET() {
  try {
    const cctvStreams = await prisma.cctvStream.findMany({
      orderBy: { order: 'asc' }
    });
    
    return NextResponse.json({
      success: true,
      streams: cctvStreams
    });
  } catch (error) {
    console.error("CCTV 스트림 목록 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "CCTV 스트림 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

// CCTV 스트림 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, streamUrl, location, isActive = true } = body;

    // 필수 필드 검증
    if (!name || !streamUrl) {
      return NextResponse.json(
        { success: false, error: "이름과 스트림 URL은 필수입니다." },
        { status: 400 }
      );
    }

    // 순서 계산 (마지막 순서 + 1)
    const lastStream = await prisma.cctvStream.findFirst({
      orderBy: { order: 'desc' }
    });
    const order = lastStream ? lastStream.order + 1 : 1;

    const cctvStream = await prisma.cctvStream.create({
      data: {
        name,
        description: description || '',
        streamUrl,
        location: location || '',
        isActive,
        order
      }
    });

    return NextResponse.json({
      success: true,
      stream: cctvStream
    }, { status: 201 });
  } catch (error) {
    console.error("CCTV 스트림 생성 실패:", error);
    return NextResponse.json(
      { success: false, error: "CCTV 스트림을 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
